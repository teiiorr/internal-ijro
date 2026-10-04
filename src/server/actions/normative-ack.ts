"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { normativeDocuments, users } from "@/lib/db/schema";
import { normativeAckRequests, normativeAcknowledgements, normativeDocumentMeta } from "@/lib/db/tables/normative-ack";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { audienceSchema, canSendToAudience, resolveAudience, type Audience } from "@/lib/audience";
import { getAckRequestDetail } from "@/server/queries/normative-ack";
import {
  DOC_STATUSES,
  DOC_TYPES,
  REMIND_COOLDOWN_HOURS,
  canEditDocMeta,
  canManageAckRequest,
  canSendAck,
  chunk,
  isYmd,
  remindTooSoon,
  tashkentYmd,
  ymdToDots,
  type ActionResult,
  type AckRecipientItem,
} from "@/components/staff/normative-ack/logic";

// Expected failures (no rights, bad input, 12h throttle, "open first") are returned as
// { ok:false, error } instead of thrown: production builds hide server-action error
// messages, and the client maps the code to a translated toast (logic.ts errorKey).

const fail = (error: string) => ({ ok: false as const, error });

/** Postgres "undefined_table" (42P01) — migration 0031 not applied yet. */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

/** Aborts a transaction with an expected error code. */
class CodeError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const ackLink = (requestId: string) => `/meyoriy-hujjatlar?ack=${requestId}`;

function revalidateAll() {
  revalidatePath("/meyoriy-hujjatlar");
  revalidatePath("/dashboard");
}

/** Any 8-4-4-4-12 hex id, normalised to lower case (Postgres returns uuids lower-cased). */
const guid = z.guid().transform((s) => s.toLowerCase());

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

// ---------------- Rekvizitlar ----------------

const metaSchema = z.object({
  documentId: guid,
  docType: z.enum(DOC_TYPES).nullish().transform((v) => v ?? null),
  docNumber: optText(60),
  docDate: z
    .union([z.string().trim(), z.null()])
    .optional()
    .refine((v) => !v || isYmd(v), { message: "invalid_date" })
    .transform((v) => (v ? v : null)),
  issuedBy: optText(255),
  status: z.enum(DOC_STATUSES),
  summary: optText(5000),
  /** undefined = leave "supersedes" links untouched; null = this document replaces nothing. */
  supersedesId: guid.nullable().optional(),
});

export type SaveDocMetaInput = z.input<typeof metaSchema>;

/**
 * Saves the rekvizitlar of a document (uploader, direktor, orinbosar, hr).
 * With `supersedesId` the old document is marked 'repealed' and linked to this one;
 * documents previously marked as replaced by this one (and no longer selected) are restored.
 */
export async function saveDocMeta(input: SaveDocMetaInput): Promise<ActionResult> {
  const me = await requireUser();
  if (me.position === "kontragent") return fail("forbidden");
  const parsed = metaSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const v = parsed.data;
  if (v.supersedesId && v.supersedesId === v.documentId) return fail("invalid");

  const ids = v.supersedesId ? [v.documentId, v.supersedesId] : [v.documentId];
  const docs = await db
    .select({ id: normativeDocuments.id, uploadedByUserId: normativeDocuments.uploadedByUserId })
    .from(normativeDocuments)
    .where(inArray(normativeDocuments.id, ids));
  const doc = docs.find((d) => d.id === v.documentId);
  if (!doc) return fail("not_found");
  if (!canEditDocMeta(me, doc.uploadedByUserId)) return fail("forbidden");
  const m = normativeDocumentMeta;
  if (v.supersedesId) {
    const old = docs.find((d) => d.id === v.supersedesId);
    if (!old) return fail("not_found");
    // Marking another document as repealed edits ITS registry entry too — unless that link
    // already exists (re-saving my own document must not need rights on the old one).
    if (!canEditDocMeta(me, old.uploadedByUserId)) {
      let linked = false;
      try {
        const [cur] = await db
          .select({ s: m.supersededById })
          .from(m)
          .where(eq(m.documentId, v.supersedesId))
          .limit(1);
        linked = cur?.s === v.documentId;
      } catch {
        /* 0031 hali qoʻllanmagan — bogʻlanish yoʻq */
      }
      if (!linked) return fail("forbidden");
    }
  }

  const now = new Date();
  const values = {
    docType: v.docType,
    docNumber: v.docNumber,
    docDate: v.docDate,
    issuedBy: v.issuedBy,
    status: v.status,
    summary: v.summary,
    updatedByUserId: me.id,
    updatedAt: now,
    // Back "in force" → it is no longer replaced by anything.
    ...(v.status === "active" ? { supersededById: null } : {}),
  };

  try {
    await db.transaction(async (tx) => {
      if (v.supersedesId && v.status === "repealed") {
        // A ← B and B ← A would be a cycle.
        const [mine] = await tx.select({ s: m.supersededById }).from(m).where(eq(m.documentId, v.documentId)).limit(1);
        if (mine?.s === v.supersedesId) throw new CodeError("supersede_cycle");
      }
      await tx
        .insert(m)
        .values({ documentId: v.documentId, ...values })
        .onConflictDoUpdate({ target: m.documentId, set: values });

      if (v.supersedesId !== undefined) {
        // Release documents that this one no longer replaces.
        await tx
          .update(m)
          .set({ supersededById: null, status: "active", updatedByUserId: me.id, updatedAt: now })
          .where(and(eq(m.supersededById, v.documentId), v.supersedesId ? ne(m.documentId, v.supersedesId) : undefined));
        if (v.supersedesId) {
          await tx
            .insert(m)
            .values({ documentId: v.supersedesId, status: "repealed", supersededById: v.documentId, updatedByUserId: me.id, updatedAt: now })
            .onConflictDoUpdate({
              target: m.documentId,
              set: { status: "repealed", supersededById: v.documentId, updatedByUserId: me.id, updatedAt: now },
            });
        }
      }
    });
  } catch (e) {
    if (e instanceof CodeError) return fail(e.code);
    if (isMissingTable(e)) return fail("not_ready");
    throw e;
  }

  await logActivity({
    userId: me.id,
    action: "normative.meta_set",
    entityType: "normative_document",
    entityId: v.documentId,
    newValue: {
      docType: v.docType,
      docNumber: v.docNumber,
      docDate: v.docDate,
      issuedBy: v.issuedBy,
      status: v.status,
      supersedesId: v.supersedesId ?? null,
    },
  });
  revalidatePath("/meyoriy-hujjatlar");
  return { ok: true };
}

// ---------------- Tanishtirishga yuborish ----------------

const ackSchema = z.object({
  documentId: guid,
  audience: audienceSchema,
  deadline: z.string().trim().refine(isYmd, { message: "invalid_date" }),
  message: optText(1000),
});

/** Sends a document for mandatory acknowledgement to an audience with a deadline. */
export async function createAckRequest(input: {
  documentId: string;
  audience: Audience;
  deadline: string;
  message?: string | null;
}): Promise<ActionResult<{ id: string; recipients: number }>> {
  const me = await requireUser();
  if (!canSendAck(me.position)) return fail("forbidden");
  const parsed = ackSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const { documentId, deadline, message } = parsed.data;
  const audience = parsed.data.audience as Audience;
  if (deadline < tashkentYmd(new Date())) return fail("date_in_past");

  const [doc] = await db
    .select({ id: normativeDocuments.id, fileName: normativeDocuments.fileName })
    .from(normativeDocuments)
    .where(eq(normativeDocuments.id, documentId))
    .limit(1);
  if (!doc) return fail("not_found");

  // RBAC: bolim_boshligi / koordinator — only their own department(s).
  if (!(await canSendToAudience(me, audience))) return fail("forbidden_audience");

  const ids = await resolveAudience(audience);
  if (ids.length === 0) return fail("empty_audience");

  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(normativeAckRequests)
        .values({ documentId, audience, deadline, message, requestedByUserId: me.id })
        .returning({ id: normativeAckRequests.id });
      for (const part of chunk(ids, 1000)) {
        await tx
          .insert(normativeAcknowledgements)
          .values(part.map((userId) => ({ requestId: row.id, userId })))
          .onConflictDoNothing();
      }
      return row.id;
    });
  } catch (e) {
    if (isMissingTable(e)) return fail("not_ready");
    throw e;
  }

  const notifyIds = ids.filter((u) => u !== me.id);
  if (notifyIds.length > 0) {
    try {
      await notify({
        userIds: notifyIds,
        type: "normative.ack_requested",
        title: `Tanishib chiqing: ${doc.fileName}`,
        message: message ?? `Muddat: ${ymdToDots(deadline)}`,
        link: ackLink(id),
        entityType: "normative_ack_request",
        entityId: id,
      });
    } catch (e) {
      // The request and its rows exist; a delivery hiccup must not fail the send.
      console.error("normative-ack: notify failed", e);
    }
  }

  await logActivity({
    userId: me.id,
    action: "normative.ack_requested",
    entityType: "normative_document",
    entityId: documentId,
    newValue: { documentId, requestId: id, recipients: ids.length, deadline },
  });
  revalidateAll();
  return { ok: true, id, recipients: ids.length };
}

// ---------------- Recipient side ----------------

const idSchema = guid;

/** Records that I opened the document (first time only). No-op when I am not a recipient. */
export async function markAckOpened(requestId: string): Promise<ActionResult<{ opened: boolean }>> {
  const me = await requireUser();
  const id = idSchema.safeParse(requestId);
  if (!id.success) return fail("invalid");
  try {
    const a = normativeAcknowledgements;
    const rows = await db
      .update(a)
      .set({ openedAt: sql`coalesce(${a.openedAt}, now())` })
      .where(and(eq(a.requestId, id.data), eq(a.userId, me.id)))
      .returning({ requestId: a.requestId });
    return { ok: true, opened: rows.length > 0 };
  } catch (e) {
    if (isMissingTable(e)) return fail("not_ready");
    throw e;
  }
}

/** "Tanishib chiqdim" — rejected with open_first until markAckOpened ran for me. */
export async function acknowledgeDocument(requestId: string): Promise<ActionResult> {
  const me = await requireUser();
  const id = idSchema.safeParse(requestId);
  if (!id.success) return fail("invalid");
  const a = normativeAcknowledgements;
  try {
    const [row] = await db
      .select({ openedAt: a.openedAt, acknowledgedAt: a.acknowledgedAt })
      .from(a)
      .where(and(eq(a.requestId, id.data), eq(a.userId, me.id)))
      .limit(1);
    if (!row) return fail("not_found");
    if (!row.openedAt) return fail("open_first");
    if (!row.acknowledgedAt) {
      const updated = await db
        .update(a)
        .set({ acknowledgedAt: new Date() })
        .where(and(eq(a.requestId, id.data), eq(a.userId, me.id), isNull(a.acknowledgedAt), isNotNull(a.openedAt)))
        .returning({ requestId: a.requestId });
      if (updated.length > 0) {
        await logActivity({
          userId: me.id,
          action: "normative.acknowledged",
          entityType: "normative_ack_request",
          entityId: id.data,
        });
      }
    }
  } catch (e) {
    if (isMissingTable(e)) return fail("not_ready");
    throw e;
  }
  revalidateAll();
  return { ok: true };
}

// ---------------- Sender side ----------------

export type AckProgressView = {
  requestId: string;
  deadline: string;
  message: string | null;
  lastManualReminderAt: Date | null;
  recipients: AckRecipientItem[];
};

/** Recipient list for the progress dialog (requester, direktor, orinbosar, hr). */
export async function loadAckProgress(requestId: string): Promise<ActionResult<{ view: AckProgressView }>> {
  const me = await requireUser();
  const id = idSchema.safeParse(requestId);
  if (!id.success) return fail("invalid");
  const detail = await getAckRequestDetail(me, id.data);
  if (!detail) return fail("not_found");
  return {
    ok: true,
    view: {
      requestId: detail.request.id,
      deadline: detail.request.deadline,
      message: detail.request.message,
      lastManualReminderAt: detail.request.lastManualReminderAt,
      recipients: detail.recipients,
    },
  };
}

/** "Eslatish": reminds everyone who has not acknowledged yet — at most once per 12h per request. */
export async function remindAck(requestId: string): Promise<ActionResult<{ sent: number }>> {
  const me = await requireUser();
  const id = idSchema.safeParse(requestId);
  if (!id.success) return fail("invalid");
  const r = normativeAckRequests;
  const a = normativeAcknowledgements;

  try {
    const [req] = await db
      .select({
        id: r.id,
        requestedByUserId: r.requestedByUserId,
        deadline: r.deadline,
        lastManualReminderAt: r.lastManualReminderAt,
        fileName: normativeDocuments.fileName,
      })
      .from(r)
      .innerJoin(normativeDocuments, eq(normativeDocuments.id, r.documentId))
      .where(eq(r.id, id.data))
      .limit(1);
    if (!req) return fail("not_found");
    if (!canManageAckRequest(me, req.requestedByUserId)) return fail("forbidden");
    if (remindTooSoon(req.lastManualReminderAt)) return fail("too_soon");

    const pending = await db
      .select({ userId: a.userId })
      .from(a)
      .innerJoin(users, eq(users.id, a.userId))
      .where(and(eq(a.requestId, id.data), isNull(a.acknowledgedAt), eq(users.status, "active")));
    const targets = pending.map((p) => p.userId).filter((u) => u !== me.id);
    if (targets.length === 0) return { ok: true, sent: 0 };

    // Atomic claim: two concurrent clicks cannot both pass the 12h window.
    const cutoff = new Date(Date.now() - REMIND_COOLDOWN_HOURS * 3_600_000);
    const claimed = await db
      .update(r)
      .set({ lastManualReminderAt: new Date() })
      .where(and(eq(r.id, id.data), or(isNull(r.lastManualReminderAt), lt(r.lastManualReminderAt, cutoff))))
      .returning({ id: r.id });
    if (claimed.length === 0) return fail("too_soon");

    try {
      await notify({
        userIds: targets,
        type: "normative.ack_reminder",
        title: `Eslatma — tanishib chiqing: ${req.fileName}`,
        message: `Muddat: ${ymdToDots(req.deadline)}`,
        link: ackLink(id.data),
        entityType: "normative_ack_request",
        entityId: id.data,
      });
    } catch (e) {
      // Nothing went out — release the claim so the sender can retry.
      await db
        .update(r)
        .set({ lastManualReminderAt: req.lastManualReminderAt })
        .where(eq(r.id, id.data))
        .catch(() => undefined);
      throw e;
    }

    await logActivity({
      userId: me.id,
      action: "normative.ack_reminded",
      entityType: "normative_ack_request",
      entityId: id.data,
      newValue: { recipients: targets.length },
    });
    return { ok: true, sent: targets.length };
  } catch (e) {
    if (isMissingTable(e)) return fail("not_ready");
    throw e;
  }
}
