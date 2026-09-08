"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { externalCompanies, projects, projectCurators, projectMessages, projectStages, stageDocuments, stagePayments, users } from "@/lib/db/schema";
import { requireProjectEditor, requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { deleteFileByUrl } from "@/lib/upload";
import { recalcProjectProgress } from "@/lib/projects/recalc";

function stageLinks(projectId: string, stageId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  // Studio-side surfaces mirror the same stage.
  revalidatePath(`/contractor/projects/${projectId}`);
  revalidatePath(`/contractor/projects/${projectId}/stages/${stageId}`);
  revalidatePath(`/contractor/projects`);
  // Staff Студии workspace (review queue panel, grid pills, studio detail).
  revalidatePath(`/contractors`);
}

/** Resolve the studio (kontragent) user who owns a project, via company email. */
async function resolveStudioContactId(projectId: string): Promise<string | null> {
  const [prj] = await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!prj?.ec) return null;
  const [company] = await db.select({ email: externalCompanies.contactEmail }).from(externalCompanies).where(eq(externalCompanies.id, prj.ec)).limit(1);
  if (!company?.email) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, company.email)).limit(1);
  return u?.id ?? null;
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
  const me = await requireProjectEditor();

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

    // Merged block: a stage flagged mergeWithNext is completed together with the
    // stage(s) that follow it — one click finishes the whole "common phase".
    let last = stage;
    while (last.mergeWithNext) {
      const followRows = await tx
        .select()
        .from(projectStages)
        .where(and(eq(projectStages.projectId, stage.projectId), eq(projectStages.orderIndex, last.orderIndex + 1)))
        .limit(1);
      if (followRows.length === 0) break;
      const follow = followRows[0];
      await tx
        .update(projectStages)
        .set({
          status: "completed",
          startedAt: follow.startedAt ?? now,
          completedAt: now,
          updatedAt: now,
          reminderApproachingSentAt: null,
          reminderOverdueSentAt: null,
          reminderStaleSentAt: null,
        })
        .where(eq(projectStages.id, follow.id));
      last = follow;
    }

    // Activate the stage after the (possibly merged) block, else complete the project.
    const nextRows = await tx
      .select()
      .from(projectStages)
      .where(and(eq(projectStages.projectId, stage.projectId), eq(projectStages.orderIndex, last.orderIndex + 1)))
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
          // Fresh active stage → studio's turn again; clear prior review metadata.
          reviewStatus: "in_progress",
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          submittedAt: null,
          submittedByUserId: null,
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

  // Notify: the STUDIO that their stage work was accepted (acceptance is no
  // longer invisible to them).
  const studioContactId = await resolveStudioContactId(result.stage.projectId);
  if (studioContactId) {
    await notify({
      userIds: [studioContactId],
      type: "stage.accepted",
      title: `${prj!.name}: ${result.stage.name}`,
      message: "Bosqich qabul qilindi / Этап принят",
      link: `/contractor/projects/${result.stage.projectId}/stages/${stageId}`,
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
  const me = await requireProjectEditor();

  const projectId = await db.transaction(async (tx) => {
    const rows = await tx.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
    if (rows.length === 0) throw new Error("not_found");
    const stage = rows[0];
    if (stage.status !== "completed") throw new Error("stage_not_completed");

    const all = await tx
      .select({ id: projectStages.id, orderIndex: projectStages.orderIndex, status: projectStages.status, mergeWithNext: projectStages.mergeWithNext })
      .from(projectStages)
      .where(eq(projectStages.projectId, stage.projectId))
      .orderBy(projectStages.orderIndex);

    // Only the last completed stage may be reopened (the one just before the current active,
    // or the final stage of a completed project).
    const lastCompleted = [...all].reverse().find((s) => s.status === "completed");
    if (!lastCompleted || lastCompleted.id !== stageId) throw new Error("not_last_completed");

    const now = new Date();

    // If this stage was auto-completed as part of a merged block (a preceding stage
    // flagged mergeWithNext), undo the WHOLE block: walk back to the block start.
    let start = all.find((s) => s.orderIndex === stage.orderIndex)!;
    for (;;) {
      const prev = all.find((s) => s.orderIndex === start.orderIndex - 1);
      if (prev && prev.mergeWithNext) start = prev;
      else break;
    }

    // Block start → active again; reopening means staff want more from the
    // studio, so the ball goes back to them (review_status → 'in_progress').
    await tx
      .update(projectStages)
      .set({ status: "active", completedAt: null, updatedAt: now, reviewStatus: "in_progress", submittedAt: null, submittedByUserId: null })
      .where(eq(projectStages.id, start.id));
    for (const s of all) {
      if (s.orderIndex > start.orderIndex && s.orderIndex <= stage.orderIndex) {
        await tx
          .update(projectStages)
          .set({ status: "locked", startedAt: null, completedAt: null, updatedAt: now })
          .where(eq(projectStages.id, s.id));
      }
    }

    // Demote the stage after the block (if it had been unlocked) back to locked.
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

// ---------- review sub-machine (studio ↔ staff loop) ----------

/**
 * STUDIO hands the active stage's work to BKRM for review. Separate, deliberate
 * act from uploading files (which stays a plain attach).
 */
export async function submitStageWork(stageId: string) {
  const me = await requireUser();
  const [stage] = await db.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!stage) throw new Error("not_found");
  if (stage.status !== "active") throw new Error("stage_not_active");
  if (stage.reviewStatus !== "in_progress" && stage.reviewStatus !== "changes_requested") throw new Error("already_submitted");

  // A kontragent may only submit their own project's stage.
  if (me.position === "kontragent") {
    const [prj] = await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, stage.projectId)).limit(1);
    const owned = prj?.ec
      ? await db.select({ id: externalCompanies.id }).from(externalCompanies).where(and(eq(externalCompanies.id, prj.ec), eq(externalCompanies.contactEmail, me.email))).limit(1)
      : [];
    if (owned.length === 0) throw new Error("forbidden");
  }

  // Must have something to hand off.
  const [cnt] = await db.select({ c: sql<number>`count(*)::int` }).from(stageDocuments).where(eq(stageDocuments.stageId, stageId));
  if (!cnt || cnt.c === 0) throw new Error("nothing_to_submit");

  const now = new Date();
  await db.update(projectStages).set({ reviewStatus: "submitted", submittedAt: now, submittedByUserId: me.id, updatedAt: now }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.submitted", entityType: "project_stage", entityId: stageId, newValue: { name: stage.name } });

  // Notify the curators (our side) — their turn now.
  const [prj] = await db.select({ name: projects.name, curatorUserId: projects.curatorUserId }).from(projects).where(eq(projects.id, stage.projectId)).limit(1);
  const recipients = new Set<string>();
  if (prj?.curatorUserId) recipients.add(prj.curatorUserId);
  try {
    const rows = await db.select({ userId: projectCurators.userId }).from(projectCurators).where(eq(projectCurators.projectId, stage.projectId));
    for (const r of rows) recipients.add(r.userId);
  } catch { /* projectCurators not migrated */ }
  recipients.delete(me.id);
  if (recipients.size > 0) {
    await notify({
      userIds: [...recipients],
      type: "stage.submitted",
      title: `${prj?.name}: ${stage.name}`,
      message: "Studiya ishni koʻrib chiqishga yubordi / Студия отправила работу на проверку",
      link: `/projects/${stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }
  stageLinks(stage.projectId, stageId);
}

/**
 * STAFF bounces the submitted work back with a note. Stays 'active'; only the
 * review sub-machine changes. The note is echoed into the stage chat for history.
 */
export async function requestStageChanges(stageId: string, note: string) {
  const me = await requireProjectEditor();
  const text = (note ?? "").trim();
  if (text.length < 2) throw new Error("note_required");
  const [stage] = await db.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!stage) throw new Error("not_found");
  if (stage.status !== "active") throw new Error("stage_not_active");

  const now = new Date();
  await db.update(projectStages).set({ reviewStatus: "changes_requested", reviewNote: text, reviewedByUserId: me.id, reviewedAt: now, updatedAt: now }).where(eq(projectStages.id, stageId));
  // Preserve the ask in the conversation.
  await db.insert(projectMessages).values({ projectId: stage.projectId, stageId, userId: me.id, content: text });
  await logActivity({ userId: me.id, action: "stage.changes_requested", entityType: "project_stage", entityId: stageId, newValue: { note: text } });

  const studioContactId = await resolveStudioContactId(stage.projectId);
  const [prj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, stage.projectId)).limit(1);
  if (studioContactId) {
    await notify({
      userIds: [studioContactId],
      type: "stage.changes_requested",
      title: `${prj?.name}: ${stage.name}`,
      message: text.length > 120 ? `${text.slice(0, 117)}…` : text,
      link: `/contractor/projects/${stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }
  stageLinks(stage.projectId, stageId);
}

/**
 * STAFF accepts the submitted work → advances the pipeline. Thin wrapper over
 * completeStage (which now also notifies the studio of acceptance).
 */
export async function acceptStage(stageId: string) {
  return completeStage(stageId);
}

/** STAFF sets what the studio must deliver this stage (read-only to studio). */
export async function setStageRequirements(stageId: string, requirements: string | null) {
  const me = await requireProjectEditor();
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db.update(projectStages).set({ requirements: requirements?.trim() || null, updatedAt: new Date() }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.requirements_set", entityType: "project_stage", entityId: stageId });
  stageLinks(row.projectId, stageId);
}

// ---------- field updaters ----------

export async function setStageResponsible(stageId: string, userId: string | null) {
  const me = await requireProjectEditor();
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db.update(projectStages).set({ responsibleUserId: userId, updatedAt: new Date() }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.responsible_changed", entityType: "project_stage", entityId: stageId, newValue: { responsibleUserId: userId } });
  stageLinks(row.projectId, stageId);
}

export async function setStageDeadline(stageId: string, date: string | null) {
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
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

// One-shot edit of a stage's core fields (name + start/end dates + budget) from
// the single "pencil" dialog. Open to all staff. Clears the deadline reminders
// so a changed deadline re-arms the cron notifications.
const updateStageSchema = z.object({
  name: z.string().min(1).max(255),
  plannedStartDate: z.string().nullable().optional(),
  plannedDeadline: z.string().nullable().optional(),
  plannedAmount: z.number().nullable().optional(),
  contractNumber: z.string().max(50).optional(),
  responsibleUserId: z.string().uuid().nullable().optional(),
});
export async function updateStage(stageId: string, input: z.infer<typeof updateStageSchema>) {
  const me = await requireProjectEditor();
  const parsed = updateStageSchema.parse(input);
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db
    .update(projectStages)
    .set({
      name: parsed.name.trim(),
      plannedStartDate: parsed.plannedStartDate || null,
      plannedDeadline: parsed.plannedDeadline || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plannedAmount: parsed.plannedAmount != null ? (String(parsed.plannedAmount) as any) : null,
      ...(parsed.contractNumber !== undefined && { contractNumber: parsed.contractNumber.trim() || "1" }),
      ...(parsed.responsibleUserId !== undefined && { responsibleUserId: parsed.responsibleUserId }),
      updatedAt: new Date(),
      reminderApproachingSentAt: null,
      reminderOverdueSentAt: null,
    })
    .where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.updated", entityType: "project_stage", entityId: stageId, newValue: { name: parsed.name } });
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

// Adding a document is handled by the streaming route at
// src/app/api/files/stage-docs/route.ts (uploads stream to disk instead of being
// buffered in memory by a Server Action — safe for the 2GB production box). The
// server actions below only touch existing rows, so they carry no file body.

/** Move a document to another folder (or clear it). Powers drag-free re-filing from the stage page. */
export async function setStageDocumentCategory(documentId: string, category: string | null) {
  const me = await requireProjectEditor();
  const [doc] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, documentId)).limit(1);
  if (!doc) return;
  const projectId = await stageProjectId(doc.stageId);
  await db.update(stageDocuments).set({ category: normalizeCategory(category) }).where(eq(stageDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "stage.document_recategorized", entityType: "project_stage", entityId: doc.stageId, newValue: { category: normalizeCategory(category) } });
  stageLinks(projectId, doc.stageId);
}

export async function removeStageDocument(documentId: string) {
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
  const [row] = await db.select().from(stagePayments).where(eq(stagePayments.id, paymentId)).limit(1);
  if (!row) return;
  const projectId = await stageProjectId(row.stageId);
  await db.delete(stagePayments).where(eq(stagePayments.id, paymentId));
  await logActivity({ userId: me.id, action: "stage.payment_deleted", entityType: "project_stage", entityId: row.stageId });
  stageLinks(projectId, row.stageId);
}
