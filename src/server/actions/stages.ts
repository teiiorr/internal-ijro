"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, projectStages, stageDocuments, stagePayments, users } from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { storeFile, deleteFileByUrl } from "@/lib/upload";
import { recalcProjectProgress } from "@/lib/projects/recalc";

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;

function stageLinks(projectId: string, stageId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
}

async function directorIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.status}='active' AND ${users.position} in ('direktor','orinbosar')`);
  return rows.map((r) => r.id);
}

/**
 * Complete the current active stage and unlock the next.
 * Strict sequential state machine: only an 'active' stage can be completed.
 */
export async function completeStage(stageId: string) {
  const me = await requirePosition([...MANAGERS]);

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
    if (rows.length === 0) throw new Error("not_found");
    const stage = rows[0];
    if (stage.status !== "active") throw new Error("stage_not_active");
    const now = new Date();

    await tx
      .update(projectStages)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
        // clear reminder guards so a future active stage can alert afresh
        reminderApproachingSentAt: null,
        reminderOverdueSentAt: null,
        reminderStaleSentAt: null,
      })
      .where(eq(projectStages.id, stageId));

    const nextRows = await tx
      .select()
      .from(projectStages)
      .where(and(eq(projectStages.projectId, stage.projectId), eq(projectStages.orderIndex, stage.orderIndex + 1)))
      .limit(1);

    let next: typeof stage | null = null;
    let projectCompleted = false;
    if (nextRows.length > 0) {
      next = nextRows[0];
      await tx
        .update(projectStages)
        .set({
          status: "active",
          startedAt: now,
          updatedAt: now,
          reminderApproachingSentAt: null,
          reminderOverdueSentAt: null,
          reminderStaleSentAt: null,
        })
        .where(eq(projectStages.id, next.id));
    } else {
      projectCompleted = true;
      await tx
        .update(projects)
        .set({ status: "completed", completedAt: now, updatedAt: now })
        .where(eq(projects.id, stage.projectId));
    }

    return { stage, next, projectCompleted };
  });

  await recalcProjectProgress(result.stage.projectId);

  const [prj] = await db.select().from(projects).where(eq(projects.id, result.stage.projectId)).limit(1);

  await logActivity({
    userId: me.id,
    action: "stage.completed",
    entityType: "project_stage",
    entityId: stageId,
    newValue: { name: result.stage.name },
  });

  // Notify: stage completed → curator + creator.
  const completedRecipients = [prj?.curatorUserId, prj?.createdByUserId].filter(Boolean) as string[];
  if (completedRecipients.length > 0) {
    await notify({
      userIds: completedRecipients,
      type: "stage.completed",
      title: `${prj!.name}: ${result.stage.name}`,
      message: "Bosqich yakunlandi / Этап завершён",
      link: `/projects/${result.stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }

  // Notify: next stage started → its responsible (+ curator).
  if (result.next) {
    const startRecipients = [result.next.responsibleUserId, prj?.curatorUserId].filter(Boolean) as string[];
    if (startRecipients.length > 0) {
      await notify({
        userIds: startRecipients,
        type: "stage.started",
        title: `${prj!.name}: ${result.next.name}`,
        message: "Yangi bosqich boshlandi / Начат новый этап",
        link: `/projects/${result.stage.projectId}/stages/${result.next.id}`,
        entityType: "project_stage",
        entityId: result.next.id,
      });
    }
  }

  // Notify: project auto-completed → curator + creator + directors.
  if (result.projectCompleted) {
    const recipients = new Set<string>([...completedRecipients, ...(await directorIds())]);
    await notify({
      userIds: Array.from(recipients),
      type: "project.completed",
      title: `${prj!.name}`,
      message: "Loyiha yakunlandi / Проект завершён",
      link: `/projects/${result.stage.projectId}`,
      entityType: "project",
      entityId: result.stage.projectId,
    });
  }

  stageLinks(result.stage.projectId, stageId);
  return { projectCompleted: result.projectCompleted, nextStageId: result.next?.id ?? null };
}

/**
 * Reopen the most recently completed stage (admin only).
 * The only backward transition. Preserves the "exactly one active, strictly
 * sequential" invariant: reverts this stage to active and demotes the stage
 * that was unlocked by its completion back to locked.
 */
export async function reopenStage(stageId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"]);

  const projectId = await db.transaction(async (tx) => {
    const rows = await tx.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
    if (rows.length === 0) throw new Error("not_found");
    const stage = rows[0];
    if (stage.status !== "completed") throw new Error("stage_not_completed");

    const all = await tx
      .select({ id: projectStages.id, orderIndex: projectStages.orderIndex, status: projectStages.status })
      .from(projectStages)
      .where(eq(projectStages.projectId, stage.projectId))
      .orderBy(projectStages.orderIndex);

    // Only the last completed stage may be reopened (the one just before the current active,
    // or the final stage of a completed project).
    const lastCompleted = [...all].reverse().find((s) => s.status === "completed");
    if (!lastCompleted || lastCompleted.id !== stageId) throw new Error("not_last_completed");

    const now = new Date();
    await tx
      .update(projectStages)
      .set({ status: "active", completedAt: null, updatedAt: now })
      .where(eq(projectStages.id, stageId));

    // Demote the immediate next stage (if it had been unlocked) back to locked.
    const next = all.find((s) => s.orderIndex === stage.orderIndex + 1);
    if (next && next.status === "active") {
      await tx
        .update(projectStages)
        .set({ status: "locked", startedAt: null, updatedAt: now })
        .where(eq(projectStages.id, next.id));
    }

    // If the project had been auto-completed, revert it to active.
    await tx
      .update(projects)
      .set({ status: "planning", completedAt: null, updatedAt: now })
      .where(and(eq(projects.id, stage.projectId), eq(projects.status, "completed")));

    return stage.projectId;
  });

  await recalcProjectProgress(projectId);
  await logActivity({ userId: me.id, action: "stage.reopened", entityType: "project_stage", entityId: stageId });
  stageLinks(projectId, stageId);
}

// ---------- field updaters ----------

export async function setStageResponsible(stageId: string, userId: string | null) {
  const me = await requirePosition([...MANAGERS]);
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db.update(projectStages).set({ responsibleUserId: userId, updatedAt: new Date() }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.responsible_changed", entityType: "project_stage", entityId: stageId, newValue: { responsibleUserId: userId } });
  stageLinks(row.projectId, stageId);
}

export async function setStageDeadline(stageId: string, date: string | null) {
  const me = await requirePosition([...MANAGERS]);
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db
    .update(projectStages)
    .set({ plannedDeadline: date, updatedAt: new Date(), reminderApproachingSentAt: null, reminderOverdueSentAt: null })
    .where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.deadline_changed", entityType: "project_stage", entityId: stageId, newValue: { plannedDeadline: date } });
  stageLinks(row.projectId, stageId);
}

export async function setStagePlannedAmount(stageId: string, amount: number | null) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"]);
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db
    .update(projectStages)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ plannedAmount: amount != null ? (amount as any) : null, updatedAt: new Date() })
    .where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.planned_amount_changed", entityType: "project_stage", entityId: stageId, newValue: { plannedAmount: amount } });
  stageLinks(row.projectId, stageId);
}

// ---------- documents ----------

async function stageProjectId(stageId: string): Promise<string> {
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  return row.projectId;
}

/** Normalize a user-typed folder name: trim, collapse spaces, cap length; empty → null. */
function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.replace(/\s+/g, " ").trim().slice(0, 120);
  return v.length > 0 ? v : null;
}

/** Attach a document (any format) to a stage, filed under an optional folder. Next 16: takes a Web File directly. */
export async function attachStageDocument(stageId: string, file: File, category?: string | null) {
  const me = await requirePosition([...MANAGERS]);
  const projectId = await stageProjectId(stageId);
  const stored = await storeFile(file, `stage-docs/${stageId}`);
  await db.insert(stageDocuments).values({
    stageId,
    fileUrl: stored.url,
    fileName: stored.originalName,
    fileSize: stored.size,
    fileMimeType: stored.mimeType,
    category: normalizeCategory(category),
    uploadedByUserId: me.id,
  });
  await db.update(projectStages).set({ updatedAt: new Date() }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.document_added", entityType: "project_stage", entityId: stageId, newValue: { fileName: stored.originalName } });
  stageLinks(projectId, stageId);
}

/** Move a document to another folder (or clear it). Powers drag-free re-filing from the stage page. */
export async function setStageDocumentCategory(documentId: string, category: string | null) {
  const me = await requirePosition([...MANAGERS]);
  const [doc] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, documentId)).limit(1);
  if (!doc) return;
  const projectId = await stageProjectId(doc.stageId);
  await db.update(stageDocuments).set({ category: normalizeCategory(category) }).where(eq(stageDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "stage.document_recategorized", entityType: "project_stage", entityId: doc.stageId, newValue: { category: normalizeCategory(category) } });
  stageLinks(projectId, doc.stageId);
}

export async function removeStageDocument(documentId: string) {
  const me = await requirePosition([...MANAGERS]);
  const [doc] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, documentId)).limit(1);
  if (!doc) return;
  const projectId = await stageProjectId(doc.stageId);
  await deleteFileByUrl(doc.fileUrl);
  await db.delete(stageDocuments).where(eq(stageDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "stage.document_removed", entityType: "project_stage", entityId: doc.stageId });
  stageLinks(projectId, doc.stageId);
}

// ---------- payments ----------

const paymentSchema = z.object({
  stageId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default("UZS"),
  note: z.string().max(500).nullable().optional(),
  status: z.enum(["pending", "paid"]).default("pending"),
});

export async function addStagePayment(input: z.infer<typeof paymentSchema>) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"]);
  const parsed = paymentSchema.parse(input);
  const projectId = await stageProjectId(parsed.stageId);
  await db.insert(stagePayments).values({
    stageId: parsed.stageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amount: parsed.amount as any,
    currency: parsed.currency,
    status: parsed.status,
    paidAt: parsed.status === "paid" ? new Date() : null,
    note: parsed.note ?? null,
    createdByUserId: me.id,
  });
  await logActivity({ userId: me.id, action: "stage.payment_added", entityType: "project_stage", entityId: parsed.stageId, newValue: { amount: parsed.amount, status: parsed.status } });
  stageLinks(projectId, parsed.stageId);
}

export async function setStagePaymentStatus(paymentId: string, status: "pending" | "paid") {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"]);
  const [row] = await db.select().from(stagePayments).where(eq(stagePayments.id, paymentId)).limit(1);
  if (!row) return;
  const projectId = await stageProjectId(row.stageId);
  await db
    .update(stagePayments)
    .set({ status, paidAt: status === "paid" ? new Date() : null })
    .where(eq(stagePayments.id, paymentId));
  await logActivity({ userId: me.id, action: "stage.payment_status_changed", entityType: "project_stage", entityId: row.stageId, newValue: { status } });
  stageLinks(projectId, row.stageId);
}

export async function deleteStagePayment(paymentId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"]);
  const [row] = await db.select().from(stagePayments).where(eq(stagePayments.id, paymentId)).limit(1);
  if (!row) return;
  const projectId = await stageProjectId(row.stageId);
  await db.delete(stagePayments).where(eq(stagePayments.id, paymentId));
  await logActivity({ userId: me.id, action: "stage.payment_deleted", entityType: "project_stage", entityId: row.stageId });
  stageLinks(projectId, row.stageId);
}
