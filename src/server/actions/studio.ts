"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  externalCompanies,
  projects,
  projectCurators,
  projectStages,
  projectStatusUpdates,
  stageProgressReports,
  stageRequests,
  users,
} from "@/lib/db/schema";
import { requireUser, type SessionUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { isOwner } from "@/lib/permissions/owner";

// ---------------- yordamchilar ----------------

/** Kontragent faqat o'z studiyasiga biriktirilgan loyiha bilan ishlay oladi. */
async function assertStudioOwnsProject(me: SessionUser, projectId: string) {
  const [prj] = await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!prj?.ec) throw new Error("forbidden");
  const [own] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(and(eq(externalCompanies.id, prj.ec), sql`lower(${externalCompanies.contactEmail}) = ${me.email.toLowerCase()}`))
    .limit(1);
  if (!own) throw new Error("forbidden");
}

/** Loyiha kuratorlari (asosiy + qo'shimcha). */
async function curatorIds(projectId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const [prj] = await db.select({ c: projects.curatorUserId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (prj?.c) ids.add(prj.c);
  try {
    const rows = await db.select({ userId: projectCurators.userId }).from(projectCurators).where(eq(projectCurators.projectId, projectId));
    for (const r of rows) ids.add(r.userId);
  } catch { /* projectCurators migratsiya qilinmagan */ }
  return ids;
}

/** Loyihaga biriktirilgan studiyaning kirish akkaunti (kompaniya emaili orqali). */
async function studioContactId(projectId: string): Promise<string | null> {
  const [prj] = await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!prj?.ec) return null;
  const [c] = await db.select({ email: externalCompanies.contactEmail }).from(externalCompanies).where(eq(externalCompanies.id, prj.ec)).limit(1);
  if (!c?.email) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${c.email.toLowerCase()}`).limit(1);
  return u?.id ?? null;
}

/** Xodim so'rovni hal qila oladimi: egasi, loyiha muharriri yoki shu loyiha kuratori. */
async function canDecide(me: SessionUser, projectId: string): Promise<boolean> {
  if (me.position === "kontragent") return false;
  if (isOwner(me.email) || canEditProjects(me.email)) return true;
  if (await hasGrant(me.id, "projects.edit")) return true;
  return (await curatorIds(projectId)).has(me.id);
}

function revalidateProject(projectId: string, stageId?: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/contractor/projects/${projectId}`);
  if (stageId) {
    revalidatePath(`/projects/${projectId}/stages/${stageId}`);
    revalidatePath(`/contractor/projects/${projectId}/stages/${stageId}`);
  }
  revalidatePath(`/contractor/dashboard`);
  revalidatePath(`/contractor/deadlines`);
  revalidatePath(`/contractors`);
  revalidatePath(`/contractors/requests`);
  revalidatePath(`/dashboard`);
}

async function projectName(projectId: string): Promise<string> {
  const [p] = await db.select({ n: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return p?.n ?? "";
}

// ---------------- 1. Joriy holat ----------------

const statusSchema = z.object({
  projectId: z.string().uuid(),
  text: z.string().trim().max(2000),
});

export async function updateProjectCurrentStatus(input: { projectId: string; text: string }) {
  const me = await requireUser();
  const { projectId, text } = statusSchema.parse(input);

  if (me.position === "kontragent") await assertStudioOwnsProject(me, projectId);
  else if (!(await canDecide(me, projectId))) throw new Error("forbidden");

  await db.update(projects).set({ currentStatus: text || null, updatedAt: new Date() }).where(eq(projects.id, projectId));
  if (text) {
    try {
      await db.insert(projectStatusUpdates).values({ projectId, text, updatedByUserId: me.id });
    } catch { /* tarix jadvali hali yo'q — asosiy matn baribir saqlandi */ }
  }
  await logActivity({ userId: me.id, action: "project.status_updated", entityType: "project", entityId: projectId, newValue: { currentStatus: text } });

  if (me.position === "kontragent" && text) {
    const to = await curatorIds(projectId);
    to.delete(me.id);
    if (to.size > 0) {
      await notify({
        userIds: [...to],
        type: "project.status_updated",
        title: `${await projectName(projectId)}: Joriy holat / Текущий статус`,
        message: text.slice(0, 200),
        link: `/projects/${projectId}`,
        entityType: "project",
        entityId: projectId,
      });
    }
  }
  revalidateProject(projectId);
}

// ---------------- 3. Bosqich progressi ----------------

const progressSchema = z.object({
  stageId: z.string().uuid(),
  progress: z.number().int().min(0).max(100),
  note: z.string().trim().max(1000).optional(),
});

export async function reportStageProgress(input: { stageId: string; progress: number; note?: string }) {
  const me = await requireUser();
  if (me.position !== "kontragent") throw new Error("forbidden");
  const { stageId, progress, note } = progressSchema.parse(input);

  const [stage] = await db.select({ projectId: projectStages.projectId, name: projectStages.name, status: projectStages.status }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!stage) throw new Error("not_found");
  if (stage.status !== "active") throw new Error("stage_not_active");
  await assertStudioOwnsProject(me, stage.projectId);

  await db.insert(stageProgressReports).values({ stageId, projectId: stage.projectId, progress, note: note || null, reportedByUserId: me.id });
  await logActivity({ userId: me.id, action: "stage.progress_reported", entityType: "project_stage", entityId: stageId, newValue: { progress, note } });

  const to = await curatorIds(stage.projectId);
  to.delete(me.id);
  if (to.size > 0) {
    await notify({
      userIds: [...to],
      type: "stage.progress_reported",
      title: `${await projectName(stage.projectId)}: ${stage.name} — ${progress}%`,
      message: note ? note.slice(0, 200) : "Studiya bajarilish holatini yangiladi / Студия обновила прогресс",
      link: `/projects/${stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }
  revalidateProject(stage.projectId, stageId);
}

// ---------------- 4–5. Studiya so'rovlari ----------------

const requestSchema = z
  .object({
    stageId: z.string().uuid(),
    type: z.enum(["deadline", "blocker"]),
    message: z.string().trim().min(3).max(2000),
    requestedDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((v) => v.type !== "deadline" || !!v.requestedDeadline, { message: "deadline_required", path: ["requestedDeadline"] });

export async function createStageRequest(input: { stageId: string; type: "deadline" | "blocker"; message: string; requestedDeadline?: string }) {
  const me = await requireUser();
  if (me.position !== "kontragent") throw new Error("forbidden");
  const v = requestSchema.parse(input);

  const [stage] = await db
    .select({ projectId: projectStages.projectId, name: projectStages.name, status: projectStages.status, deadline: projectStages.plannedDeadline })
    .from(projectStages)
    .where(eq(projectStages.id, v.stageId))
    .limit(1);
  if (!stage) throw new Error("not_found");
  if (stage.status === "completed") throw new Error("stage_completed");
  await assertStudioOwnsProject(me, stage.projectId);

  if (v.type === "deadline") {
    const today = new Date().toISOString().slice(0, 10);
    if (v.requestedDeadline! < today) throw new Error("deadline_in_past");
    if (stage.deadline && v.requestedDeadline! <= stage.deadline) throw new Error("deadline_not_later");
  }

  // Bir bosqichda bir turdagi faqat bitta ochiq so'rov.
  const [dup] = await db
    .select({ id: stageRequests.id })
    .from(stageRequests)
    .where(and(eq(stageRequests.stageId, v.stageId), eq(stageRequests.type, v.type), eq(stageRequests.status, "pending")))
    .limit(1);
  if (dup) throw new Error("already_pending");

  const [row] = await db
    .insert(stageRequests)
    .values({
      projectId: stage.projectId,
      stageId: v.stageId,
      type: v.type,
      message: v.message,
      requestedDeadline: v.type === "deadline" ? v.requestedDeadline! : null,
      requestedByUserId: me.id,
    })
    .returning({ id: stageRequests.id });
  await logActivity({ userId: me.id, action: `stage.request_${v.type}`, entityType: "stage_request", entityId: row.id, newValue: { stage: stage.name, ...v } });

  const to = await curatorIds(stage.projectId);
  to.delete(me.id);
  if (to.size > 0) {
    const pname = await projectName(stage.projectId);
    await notify({
      userIds: [...to],
      type: `stage.request_${v.type}`,
      title:
        v.type === "deadline"
          ? `${pname}: muddatni uzaytirish so'rovi / запрос продления срока`
          : `${pname}: studiya muammo bildirdi / студия сообщила о проблеме`,
      message: `${stage.name}: ${v.message.slice(0, 180)}`,
      link: `/projects/${stage.projectId}/stages/${v.stageId}`,
      entityType: "stage_request",
      entityId: row.id,
    });
  }
  revalidateProject(stage.projectId, v.stageId);
}

const decideSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "resolved"]),
  note: z.string().trim().max(1000).optional(),
});

export async function decideStageRequest(input: { requestId: string; decision: "approved" | "rejected" | "resolved"; note?: string }) {
  const me = await requireUser();
  const v = decideSchema.parse(input);

  const [req] = await db.select().from(stageRequests).where(eq(stageRequests.id, v.requestId)).limit(1);
  if (!req) throw new Error("not_found");
  if (req.status !== "pending") throw new Error("already_decided");
  if (!(await canDecide(me, req.projectId))) throw new Error("forbidden");
  // Muddat so'rovi: tasdiqlash/rad etish. Muammo: hal qilindi/rad etish.
  if (req.type === "deadline" && v.decision === "resolved") throw new Error("bad_decision");
  if (req.type === "blocker" && v.decision === "approved") throw new Error("bad_decision");

  const now = new Date();
  await db.transaction(async (tx) => {
    if (req.type === "deadline" && v.decision === "approved" && req.requestedDeadline) {
      // Yangi muddat — eslatmalar yangi sanaga qaytadan ishlashi uchun belgilarni tozalaymiz.
      await tx
        .update(projectStages)
        .set({ plannedDeadline: req.requestedDeadline, reminderApproachingSentAt: null, reminderOverdueSentAt: null, updatedAt: now })
        .where(eq(projectStages.id, req.stageId));
    }
    await tx
      .update(stageRequests)
      .set({ status: v.decision, decidedByUserId: me.id, decidedAt: now, decisionNote: v.note || null })
      .where(eq(stageRequests.id, req.id));
  });
  await logActivity({ userId: me.id, action: `stage.request_${v.decision}`, entityType: "stage_request", entityId: req.id, oldValue: { status: "pending" }, newValue: { status: v.decision, note: v.note } });

  const studio = await studioContactId(req.projectId);
  if (studio && studio !== me.id) {
    const [stage] = await db.select({ name: projectStages.name }).from(projectStages).where(eq(projectStages.id, req.stageId)).limit(1);
    const verdict =
      v.decision === "approved" ? "tasdiqlandi / одобрено" : v.decision === "resolved" ? "hal qilindi / решено" : "rad etildi / отклонено";
    await notify({
      userIds: [studio],
      type: `stage.request_${v.decision}`,
      title: `${await projectName(req.projectId)}: ${stage?.name ?? ""} — ${verdict}`,
      message: v.note ? v.note.slice(0, 200) : undefined,
      link: `/contractor/projects/${req.projectId}/stages/${req.stageId}`,
      entityType: "stage_request",
      entityId: req.id,
    });
  }
  revalidateProject(req.projectId, req.stageId);
}
