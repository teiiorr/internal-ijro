"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  projects,
  milestones,
  deliverables,
  projectMessages,
  ratings,
  externalCompanies,
  users,
  projectTypes,
  projectStages,
  stageTemplateItems,
} from "@/lib/db/schema";
import { requireUser, requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { storeFile, deleteFileByUrl } from "@/lib/upload";
import { recalcProjectProgress } from "@/lib/projects/recalc";

const projectSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().nullable().optional(),
  type: z.enum(["internal", "external"]),
  /** One of the 9 seeded project_types. Non-null → auto-build the stage pipeline. */
  projectTypeId: z.string().uuid().nullable().optional(),
  externalCompanyId: z.string().uuid().nullable().optional(),
  curatorUserId: z.string().uuid().nullable().optional(),
  /** mas'ul — applied to every generated stage (editable per stage later). */
  responsibleUserId: z.string().uuid().nullable().optional(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  budgetCurrency: z.string().default("UZS"),
});

export async function createProject(input: z.infer<typeof projectSchema>) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  const parsed = projectSchema.parse(input);
  if (parsed.type === "external" && !parsed.externalCompanyId) throw new Error("company_required");

  const { projectId, firstStage } = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(projects)
      .values({
        name: parsed.name,
        description: parsed.description ?? null,
        type: parsed.type,
        projectTypeId: parsed.projectTypeId ?? null,
        externalCompanyId: parsed.externalCompanyId ?? null,
        curatorUserId: parsed.curatorUserId ?? me.id,
        startDate: parsed.startDate ?? null,
        deadline: parsed.deadline ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        budget: parsed.budget != null ? (parsed.budget as any) : null,
        budgetCurrency: parsed.budgetCurrency,
        createdByUserId: me.id,
      })
      .returning({ id: projects.id });
    const pid = inserted[0].id;

    let first: { id: string; name: string; responsibleUserId: string | null } | null = null;

    // Auto-build the ordered stage pipeline from the type's template.
    if (parsed.projectTypeId) {
      const type = await tx
        .select({ stageTemplateId: projectTypes.stageTemplateId })
        .from(projectTypes)
        .where(eq(projectTypes.id, parsed.projectTypeId))
        .limit(1);
      if (type.length === 0) throw new Error("invalid_project_type");

      const items = await tx
        .select()
        .from(stageTemplateItems)
        .where(eq(stageTemplateItems.templateId, type[0].stageTemplateId))
        .orderBy(stageTemplateItems.orderIndex);

      const responsible = parsed.responsibleUserId ?? parsed.curatorUserId ?? me.id;
      const now = new Date();
      // Cumulative planned deadlines from startDate + each item's default duration (when defined).
      let cursor = parsed.startDate ? new Date(parsed.startDate) : null;
      const rows = items.map((it, i) => {
        let plannedDeadline: string | null = null;
        if (cursor && it.defaultDurationDays) {
          cursor = new Date(cursor);
          cursor.setDate(cursor.getDate() + it.defaultDurationDays);
          plannedDeadline = cursor.toISOString().slice(0, 10);
        }
        return {
          projectId: pid,
          templateItemId: it.id,
          orderIndex: i,
          name: it.nameUzLatn,
          status: i === 0 ? "active" : "locked",
          startedAt: i === 0 ? now : null,
          responsibleUserId: responsible,
          plannedDeadline,
        };
      });
      if (rows.length > 0) {
        const insertedStages = await tx
          .insert(projectStages)
          .values(rows)
          .returning({
            id: projectStages.id,
            name: projectStages.name,
            orderIndex: projectStages.orderIndex,
            responsibleUserId: projectStages.responsibleUserId,
          });
        first = insertedStages.find((s) => s.orderIndex === 0) ?? null;
      }
    }

    return { projectId: pid, firstStage: first };
  });

  await logActivity({
    userId: me.id,
    action: "project.created",
    entityType: "project",
    entityId: projectId,
    newValue: { name: parsed.name, type: parsed.type, projectTypeId: parsed.projectTypeId ?? null },
  });

  // Notify the responsible of the first (already active) stage.
  if (firstStage?.responsibleUserId) {
    await notify({
      userIds: [firstStage.responsibleUserId],
      type: "stage.started",
      title: `${parsed.name}: ${firstStage.name}`,
      message: "Yangi bosqich boshlandi / Начат новый этап",
      link: `/projects/${projectId}/stages/${firstStage.id}`,
      entityType: "project_stage",
      entityId: firstStage.id,
    });
  }

  revalidatePath("/projects");
  return { id: projectId };
}

const milestoneSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(255),
  description: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
  deadline: z.string().nullable().optional(),
  weight: z.number().int().positive().default(1),
  paymentAmount: z.number().nullable().optional(),
});

export async function createMilestone(input: z.infer<typeof milestoneSchema>) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  const parsed = milestoneSchema.parse(input);
  await db.insert(milestones).values({
    projectId: parsed.projectId,
    title: parsed.title,
    description: parsed.description ?? null,
    orderIndex: parsed.orderIndex,
    deadline: parsed.deadline ?? null,
    weight: parsed.weight,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paymentAmount: parsed.paymentAmount != null ? (parsed.paymentAmount as any) : null,
  });
  await recalcProjectProgress(parsed.projectId);
  await logActivity({ userId: me.id, action: "milestone.created", entityType: "milestone", newValue: parsed });
  revalidatePath(`/projects/${parsed.projectId}`);
}

export async function setMilestoneStatus(milestoneId: string, status: string) {
  const me = await requireUser();
  const row = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (row.length === 0) throw new Error("not_found");
  await db
    .update(milestones)
    .set({
      status,
      completedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(milestones.id, milestoneId));
  await recalcProjectProgress(row[0].projectId);
  await logActivity({
    userId: me.id,
    action: "milestone.status_changed",
    entityType: "milestone",
    entityId: milestoneId,
    newValue: { status },
  });
  revalidatePath(`/projects/${row[0].projectId}`);
}

export async function setMilestonePaymentStatus(milestoneId: string, paymentStatus: string) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  const row = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (row.length === 0) return;
  await db.update(milestones).set({ paymentStatus }).where(eq(milestones.id, milestoneId));
  await logActivity({
    userId: me.id,
    action: "milestone.payment_changed",
    entityType: "milestone",
    entityId: milestoneId,
    newValue: { paymentStatus },
  });
  revalidatePath(`/projects/${row[0].projectId}`);
}


/** Set a stage's progress (0..100). Server clamps; never trust client. */
export async function setMilestoneProgress(milestoneId: string, progress: number) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  const value = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const row = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (row.length === 0) throw new Error("not_found");
  // Keep legacy `status` in sync so other parts of the app that still read it stay coherent.
  const status = value >= 100 ? "completed" : value > 0 ? "in_progress" : "pending";
  await db
    .update(milestones)
    .set({
      progress: value,
      status,
      completedAt: value >= 100 ? new Date() : null,
    })
    .where(eq(milestones.id, milestoneId));
  await recalcProjectProgress(row[0].projectId);
  await logActivity({
    userId: me.id,
    action: "milestone.progress_changed",
    entityType: "milestone",
    entityId: milestoneId,
    newValue: { progress: value },
  });
  revalidatePath(`/projects/${row[0].projectId}`);
}

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  weight: z.number().int().positive().optional(),
  deadline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export async function updateMilestone(
  milestoneId: string,
  input: z.infer<typeof updateMilestoneSchema>
) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  const parsed = updateMilestoneSchema.parse(input);
  const row = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (row.length === 0) throw new Error("not_found");
  await db
    .update(milestones)
    .set({
      ...(parsed.title !== undefined && { title: parsed.title }),
      ...(parsed.weight !== undefined && { weight: parsed.weight }),
      ...(parsed.deadline !== undefined && { deadline: parsed.deadline }),
      ...(parsed.description !== undefined && { description: parsed.description }),
    })
    .where(eq(milestones.id, milestoneId));
  if (parsed.weight !== undefined) await recalcProjectProgress(row[0].projectId);
  await logActivity({
    userId: me.id,
    action: "milestone.updated",
    entityType: "milestone",
    entityId: milestoneId,
    newValue: parsed,
  });
  revalidatePath(`/projects/${row[0].projectId}`);
}

export async function deleteMilestone(milestoneId: string) {
  // Bo'lim boshlig'i can create + edit + reorder stages but NOT delete.
  const me = await requirePosition(["direktor", "orinbosar", "koordinator"]);
  const row = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (row.length === 0) return;
  await db.delete(milestones).where(eq(milestones.id, milestoneId));
  await recalcProjectProgress(row[0].projectId);
  await logActivity({
    userId: me.id,
    action: "milestone.deleted",
    entityType: "milestone",
    entityId: milestoneId,
  });
  revalidatePath(`/projects/${row[0].projectId}`);
}

/** Apply a new ordering to the project's stages. orderedIds must be a full list. */
export async function reorderMilestones(projectId: string, orderedIds: string[]) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(milestones)
        .set({ orderIndex: i })
        .where(and(eq(milestones.id, orderedIds[i]), eq(milestones.projectId, projectId)));
    }
  });
  await logActivity({
    userId: me.id,
    action: "milestone.reordered",
    entityType: "project",
    entityId: projectId,
    newValue: { count: orderedIds.length },
  });
  revalidatePath(`/projects/${projectId}`);
}

/** Toggle the manual on-hold override for a project. */
export async function setProjectOnHold(projectId: string, onHold: boolean) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  await db
    .update(projects)
    .set({ statusOverride: onHold ? "on_hold" : null, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await logActivity({
    userId: me.id,
    action: onHold ? "project.on_hold" : "project.resumed",
    entityType: "project",
    entityId: projectId,
  });
  revalidatePath(`/projects/${projectId}`);
}

// Project poster (square cover image)
export async function setProjectPoster(projectId: string, file: File) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  if (!file.type.startsWith("image/")) throw new Error("image_required");
  const [prev] = await db.select({ posterUrl: projects.posterUrl }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const stored = await storeFile(file, `project-posters/${projectId}`);
  await db.update(projects).set({ posterUrl: stored.url, updatedAt: new Date() }).where(eq(projects.id, projectId));
  if (prev?.posterUrl) await deleteFileByUrl(prev.posterUrl);
  await logActivity({ userId: me.id, action: "project.poster_set", entityType: "project", entityId: projectId });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectPoster(projectId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi"]);
  const [prev] = await db.select({ posterUrl: projects.posterUrl }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (prev?.posterUrl) await deleteFileByUrl(prev.posterUrl);
  await db.update(projects).set({ posterUrl: null, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({ userId: me.id, action: "project.poster_removed", entityType: "project", entityId: projectId });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

// Project messages (chat)
const msgSchema = z.object({ projectId: z.string().uuid(), content: z.string().min(1).max(5000) });
export async function postProjectMessage(input: z.infer<typeof msgSchema>) {
  const me = await requireUser();
  const parsed = msgSchema.parse(input);
  await db.insert(projectMessages).values({ projectId: parsed.projectId, userId: me.id, content: parsed.content });
  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath(`/contractor/projects/${parsed.projectId}`);
}

// Deliverables (contractor uploads)
export async function submitDeliverable(opts: {
  projectId: string;
  milestoneId?: string | null;
  taskId?: string | null;
  type: string;
  message?: string | null;
  file: File;
}) {
  const me = await requireUser();
  const stored = await storeFile(opts.file, `deliverables/${opts.projectId}`);
  const ins = await db
    .insert(deliverables)
    .values({
      milestoneId: opts.milestoneId ?? null,
      taskId: opts.taskId ?? null,
      submittedByUserId: me.id,
      type: opts.type,
      fileUrl: stored.url,
      fileName: stored.originalName,
      fileSize: stored.size,
      message: opts.message ?? null,
    })
    .returning({ id: deliverables.id });
  await logActivity({
    userId: me.id,
    action: "deliverable.submitted",
    entityType: "deliverable",
    entityId: ins[0].id,
    newValue: { milestoneId: opts.milestoneId, fileName: stored.originalName },
  });
  // Notify curator
  const prj = await db.select().from(projects).where(eq(projects.id, opts.projectId)).limit(1);
  if (prj.length > 0 && prj[0].curatorUserId) {
    await notify({
      userIds: [prj[0].curatorUserId],
      type: "deliverable.submitted",
      title: `New deliverable for ${prj[0].name}`,
      message: opts.message ?? stored.originalName,
      link: `/projects/${opts.projectId}`,
      entityType: "deliverable",
      entityId: ins[0].id,
    });
  }
  revalidatePath(`/projects/${opts.projectId}`);
  revalidatePath(`/contractor/projects/${opts.projectId}`);
}

export async function reviewDeliverable(deliverableId: string, status: "approved" | "revision_requested" | "rejected", adminFeedback?: string) {
  const me = await requireUser();
  if (!["direktor", "orinbosar", "koordinator"].includes(me.position)) throw new Error("forbidden");
  await db
    .update(deliverables)
    .set({
      status,
      reviewedByUserId: me.id,
      reviewedAt: new Date(),
      adminFeedback: adminFeedback ?? null,
    })
    .where(eq(deliverables.id, deliverableId));
  await logActivity({
    userId: me.id,
    action: "deliverable.reviewed",
    entityType: "deliverable",
    entityId: deliverableId,
    newValue: { status, adminFeedback },
  });
  const d = await db.select().from(deliverables).where(eq(deliverables.id, deliverableId)).limit(1);
  if (d.length > 0) {
    await notify({
      userIds: [d[0].submittedByUserId],
      type: "deliverable.reviewed",
      title: `Deliverable ${status}`,
      message: adminFeedback ?? "",
      link: `/contractor/projects`,
      entityType: "deliverable",
      entityId: deliverableId,
    });
  }
  revalidatePath(`/projects`);
  revalidatePath(`/contractor/projects`);
}

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"] as const;

// Create a contractor directly (no self-registration / account) and auto-approve it.
const contractorSchema = z.object({
  name: z.string().min(2).max(255),
  contactPerson: z.string().max(255).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactEmail: z.string().max(255).nullable().optional(),
  specialization: z.string().max(500).nullable().optional(),
});
export async function createContractor(input: z.infer<typeof contractorSchema>) {
  const me = await requirePosition([...MANAGERS]);
  const parsed = contractorSchema.parse(input);
  const ins = await db
    .insert(externalCompanies)
    .values({
      name: parsed.name.trim(),
      contactPerson: parsed.contactPerson?.trim() || null,
      contactPhone: parsed.contactPhone?.trim() || null,
      contactEmail: parsed.contactEmail?.trim() || null,
      specialization: parsed.specialization?.trim() || null,
      status: "approved",
      approvedByUserId: me.id,
      approvedAt: new Date(),
    })
    .returning({ id: externalCompanies.id, name: externalCompanies.name });
  await logActivity({ userId: me.id, action: "contractor.created", entityType: "external_company", entityId: ins[0].id, newValue: { name: parsed.name } });
  revalidatePath("/contractors");
  return ins[0];
}

// Assign, change or clear the contractor on a project (managers or the curator).
export async function setProjectContractor(projectId: string, companyId: string | null) {
  const me = await requireUser();
  const [prj] = await db.select({ id: projects.id, curatorUserId: projects.curatorUserId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!prj) throw new Error("not_found");
  const isManager = (MANAGERS as readonly string[]).includes(me.position);
  if (!isManager && prj.curatorUserId !== me.id) throw new Error("forbidden");
  await db.update(projects).set({ externalCompanyId: companyId, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({ userId: me.id, action: "project.contractor_changed", entityType: "project", entityId: projectId, newValue: { externalCompanyId: companyId } });
  revalidatePath(`/projects/${projectId}`);
}

// Approve/reject contractor (external_companies + user activation)
export async function approveContractor(companyId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator"]);
  const company = await db.select().from(externalCompanies).where(eq(externalCompanies.id, companyId)).limit(1);
  if (company.length === 0) return;
  await db.transaction(async (tx) => {
    await tx
      .update(externalCompanies)
      .set({ status: "approved", approvedByUserId: me.id, approvedAt: new Date(), rejectionReason: null })
      .where(eq(externalCompanies.id, companyId));
    if (company[0].contactEmail) {
      await tx
        .update(users)
        .set({ status: "active" })
        .where(and(eq(users.email, company[0].contactEmail), eq(users.position, "kontragent")));
    }
  });
  await logActivity({ userId: me.id, action: "contractor.approved", entityType: "external_company", entityId: companyId });
  revalidatePath("/contractors");
}

export async function rejectContractor(companyId: string, reason: string) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator"]);
  await db
    .update(externalCompanies)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(externalCompanies.id, companyId));
  await logActivity({
    userId: me.id,
    action: "contractor.rejected",
    entityType: "external_company",
    entityId: companyId,
    newValue: { reason },
  });
  revalidatePath("/contractors");
}

// Finish project + rate contractor
const ratingSchema = z.object({
  projectId: z.string().uuid(),
  externalCompanyId: z.string().uuid().nullable().optional(),
  score: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
});
export async function completeProjectWithRating(input: z.infer<typeof ratingSchema>) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator"]);
  const parsed = ratingSchema.parse(input);
  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date(), progressPercentage: 100 })
      .where(eq(projects.id, parsed.projectId));
    await tx.insert(ratings).values({
      projectId: parsed.projectId,
      externalCompanyId: parsed.externalCompanyId ?? null,
      ratedByUserId: me.id,
      score: parsed.score,
      notes: parsed.notes ?? null,
    });
    if (parsed.externalCompanyId) {
      // recalc average
      const rows = await tx
        .select({ avg: sql<number>`avg(score)` })
        .from(ratings)
        .where(eq(ratings.externalCompanyId, parsed.externalCompanyId));
      const avg = Number(rows[0]?.avg ?? 0);
      await tx
        .update(externalCompanies)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ rating: (avg.toFixed(2) as any) })
        .where(eq(externalCompanies.id, parsed.externalCompanyId));
    }
  });
  await logActivity({
    userId: me.id,
    action: "project.completed",
    entityType: "project",
    entityId: parsed.projectId,
    newValue: { score: parsed.score },
  });
  revalidatePath(`/projects/${parsed.projectId}`);
}

// Accept NDA
export async function acceptNda() {
  const me = await requireUser();
  if (me.position !== "kontragent") throw new Error("forbidden");
  await db
    .update(externalCompanies)
    .set({ ndaAcceptedAt: new Date() })
    .where(eq(externalCompanies.contactEmail, me.email));
  await logActivity({ userId: me.id, action: "contractor.nda_accepted" });
  revalidatePath("/contractor/dashboard");
}
