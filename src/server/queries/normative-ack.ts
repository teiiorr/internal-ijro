import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, normativeDocuments, users, type Position } from "@/lib/db/schema";
import { normativeAckRequests, normativeAcknowledgements, normativeDocumentMeta } from "@/lib/db/tables/normative-ack";
import { allowedDepartmentIds, type Audience } from "@/lib/audience";
import {
  ACK_AUDIENCE_POSITIONS,
  canManageAckRequest,
  canSendAck,
  daysBetweenYmd,
  isAckManager,
  tashkentYmd,
  type AckComposerOptions,
  type AckRecipientItem,
  type AckSummaryItem,
  type DocMeta,
  type PendingAckItem,
} from "@/components/staff/normative-ack/logic";

// Every read of the new tables is try/catch-guarded and returns an empty result:
// migration 0031 may not be applied on prod yet, and the page must keep working.

export type { DocMeta, PendingAckItem, AckSummaryItem, AckRecipientItem, AckComposerOptions };

export type AckViewer = {
  id: string;
  position: Position;
  departmentId: string | null;
  email?: string | null;
};

const r = normativeAckRequests;
const a = normativeAcknowledgements;
const m = normativeDocumentMeta;

/** documentId → rekvizitlar. Documents without a meta row are simply absent. */
export async function getDocMetaMap(docIds: string[]): Promise<Map<string, DocMeta>> {
  const map = new Map<string, DocMeta>();
  const ids = Array.from(new Set(docIds));
  if (ids.length === 0) return map;
  try {
    const rows = await db
      .select({
        documentId: m.documentId,
        docType: m.docType,
        docNumber: m.docNumber,
        docDate: m.docDate,
        issuedBy: m.issuedBy,
        status: m.status,
        supersededById: m.supersededById,
        summary: m.summary,
      })
      .from(m)
      .where(inArray(m.documentId, ids));
    for (const row of rows) {
      map.set(row.documentId, {
        docType: row.docType ?? null,
        docNumber: row.docNumber ?? null,
        docDate: row.docDate ?? null,
        issuedBy: row.issuedBy ?? null,
        status: row.status === "repealed" ? "repealed" : "active",
        supersededById: row.supersededById ?? null,
        summary: row.summary ?? null,
      });
    }
  } catch {
    /* 0031 hali qoʻllanmagan — rekvizitlarsiz */
  }
  return map;
}

/** My acknowledgements that are still pending, nearest deadline first. */
export async function listMyPendingAcks(userId: string): Promise<PendingAckItem[]> {
  try {
    const rows = await db
      .select({
        requestId: r.id,
        documentId: r.documentId,
        fileName: normativeDocuments.fileName,
        fileUrl: normativeDocuments.fileUrl,
        isLink: normativeDocuments.isLink,
        deadline: r.deadline,
        message: r.message,
        openedAt: a.openedAt,
        requestedByName: users.fullName,
      })
      .from(a)
      .innerJoin(r, eq(r.id, a.requestId))
      .innerJoin(normativeDocuments, eq(normativeDocuments.id, r.documentId))
      .leftJoin(users, eq(users.id, r.requestedByUserId))
      .where(and(eq(a.userId, userId), isNull(a.acknowledgedAt)))
      .orderBy(asc(r.deadline), asc(r.createdAt));
    const today = tashkentYmd(new Date());
    return rows.map((x) => ({
      ...x,
      message: x.message ?? null,
      openedAt: x.openedAt ?? null,
      requestedByName: x.requestedByName ?? null,
      daysLeft: daysBetweenYmd(today, x.deadline),
    }));
  } catch {
    return [];
  }
}

/**
 * documentId → progress of its acknowledgement requests (newest first).
 * Only requests I sent, or every request for direktor / orinbosar / hr.
 */
export async function listAckSummaries(me: Pick<AckViewer, "id" | "position">): Promise<Record<string, AckSummaryItem[]>> {
  const out: Record<string, AckSummaryItem[]> = {};
  if (me.position === "kontragent") return out;
  try {
    const rows = await db
      .select({
        requestId: r.id,
        documentId: r.documentId,
        deadline: r.deadline,
        createdAt: r.createdAt,
        total: sql<number>`count(${a.userId})::int`,
        acknowledged: sql<number>`count(${a.acknowledgedAt})::int`,
      })
      .from(r)
      .leftJoin(a, eq(a.requestId, r.id))
      .where(isAckManager(me.position) ? undefined : eq(r.requestedByUserId, me.id))
      .groupBy(r.id)
      .orderBy(desc(r.createdAt));
    for (const row of rows) {
      (out[row.documentId] ??= []).push({
        requestId: row.requestId,
        deadline: row.deadline,
        createdAt: row.createdAt,
        total: Number(row.total) || 0,
        acknowledged: Number(row.acknowledged) || 0,
      });
    }
  } catch {
    /* 0031 hali qoʻllanmagan */
  }
  return out;
}

export type AckRequestDetail = {
  request: {
    id: string;
    documentId: string;
    audience: Audience;
    deadline: string;
    message: string | null;
    requestedByUserId: string | null;
    requestedByName: string | null;
    lastManualReminderAt: Date | null;
    createdAt: Date;
  };
  document: { id: string; fileName: string; fileUrl: string; isLink: boolean };
  meta: DocMeta | null;
  recipients: AckRecipientItem[];
};

/** Full progress of one request — null unless I am the requester or direktor / orinbosar / hr. */
export async function getAckRequestDetail(
  me: Pick<AckViewer, "id" | "position">,
  requestId: string
): Promise<AckRequestDetail | null> {
  if (me.position === "kontragent") return null;
  try {
    const [req] = await db
      .select({
        id: r.id,
        documentId: r.documentId,
        audience: r.audience,
        deadline: r.deadline,
        message: r.message,
        requestedByUserId: r.requestedByUserId,
        requestedByName: users.fullName,
        lastManualReminderAt: r.lastManualReminderAt,
        createdAt: r.createdAt,
        fileName: normativeDocuments.fileName,
        fileUrl: normativeDocuments.fileUrl,
        isLink: normativeDocuments.isLink,
      })
      .from(r)
      .innerJoin(normativeDocuments, eq(normativeDocuments.id, r.documentId))
      .leftJoin(users, eq(users.id, r.requestedByUserId))
      .where(eq(r.id, requestId))
      .limit(1);
    if (!req) return null;
    if (!canManageAckRequest(me, req.requestedByUserId)) return null;

    const [recipients, metaMap] = await Promise.all([
      db
        .select({
          userId: a.userId,
          fullName: users.fullName,
          position: users.position,
          positionTitle: users.positionTitle,
          departmentName: departments.name,
          avatarUrl: users.avatarUrl,
          openedAt: a.openedAt,
          acknowledgedAt: a.acknowledgedAt,
        })
        .from(a)
        .innerJoin(users, eq(users.id, a.userId))
        .leftJoin(departments, eq(departments.id, users.departmentId))
        .where(eq(a.requestId, requestId))
        .orderBy(asc(departments.name), asc(users.fullName)),
      getDocMetaMap([req.documentId]),
    ]);

    return {
      request: {
        id: req.id,
        documentId: req.documentId,
        audience: req.audience,
        deadline: req.deadline,
        message: req.message ?? null,
        requestedByUserId: req.requestedByUserId ?? null,
        requestedByName: req.requestedByName ?? null,
        lastManualReminderAt: req.lastManualReminderAt ?? null,
        createdAt: req.createdAt,
      },
      document: { id: req.documentId, fileName: req.fileName, fileUrl: req.fileUrl, isLink: req.isLink },
      meta: metaMap.get(req.documentId) ?? null,
      recipients: recipients.map((x) => ({
        userId: x.userId,
        fullName: x.fullName,
        position: x.position,
        positionTitle: x.positionTitle ?? null,
        positionLabel: x.positionTitle?.trim() || x.position,
        departmentName: x.departmentName ?? null,
        avatarUrl: x.avatarUrl ?? null,
        openedAt: x.openedAt ?? null,
        acknowledgedAt: x.acknowledgedAt ?? null,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Options for the "Tanishtirishga yuborish" dialog: the departments I may target,
 * positions (only for 'any' senders) and active internal staff within my scope.
 */
export async function getAckComposerOptions(me: AckViewer): Promise<AckComposerOptions> {
  const empty: AckComposerOptions = { allowed: [], departments: [], positions: [], people: [] };
  if (!canSendAck(me.position)) return empty;
  try {
    const allowed = await allowedDepartmentIds(me);
    if (allowed !== "any" && allowed.length === 0) return { ...empty, allowed };

    const [deptRows, people] = await Promise.all([
      db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(allowed === "any" ? undefined : inArray(departments.id, allowed))
        .orderBy(asc(departments.name)),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          position: users.position,
          departmentName: departments.name,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .leftJoin(departments, eq(departments.id, users.departmentId))
        .where(
          and(
            eq(users.status, "active"),
            eq(users.hidden, false),
            ne(users.position, "kontragent"),
            ne(users.id, me.id),
            allowed === "any" ? undefined : inArray(users.departmentId, allowed)
          )
        )
        .orderBy(asc(users.fullName)),
    ]);

    return {
      allowed,
      departments: deptRows,
      positions: allowed === "any" ? [...ACK_AUDIENCE_POSITIONS] : [],
      people: people.map((p) => ({ ...p, departmentName: p.departmentName ?? null, avatarUrl: p.avatarUrl ?? null })),
    };
  } catch {
    return empty;
  }
}
