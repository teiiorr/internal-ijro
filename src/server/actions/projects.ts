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
} from "@/lib/db/schema";
import { requireUser, requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { storeFile } from "@/lib/upload";

const projectSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().nullable().optional(),
  type: z.enum(["internal", "external"]),
  externalCompanyId: z.string().uuid().nullable().optional(),
  curatorUserId: z.string().uuid().nullable().optional(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  budgetCurrency: z.string().default("UZS"),
});

export async function createProject(input: z.infer<typeof projectSchema>) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator"]);
  const parsed = projectSchema.parse(input);
  if (parsed.type === "external" && !parsed.externalCompanyId) throw new Error("company_required");

  const inserted = await db
    .insert(projects)
    .values({
      name: parsed.name,
      description: parsed.description ?? null,
      type: parsed.type,
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
  await logActivity({
    userId: me.id,
    action: "project.created",
    entityType: "project",
    entityId: inserted[0].id,
    newValue: { name: parsed.name, type: parsed.type },
  });
  revalidatePath("/projects");
  return { id: inserted[0].id };
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
  const me = await requirePosition(["direktor", "orinbosar", "koordinator"]);
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

async function recalcProjectProgress(projectId: string) {
  const mls = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
  if (mls.length === 0) {
    await db.update(projects).set({ progressPercentage: 0 }).where(eq(projects.id, projectId));
    return;
  }
  const totalWeight = mls.reduce((s, m) => s + m.weight, 0);
  const completedWeight = mls.filter((m) => m.status === "completed").reduce((s, m) => s + m.weight, 0);
  const pct = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  await db.update(projects).set({ progressPercentage: pct, updatedAt: new Date() }).where(eq(projects.id, projectId));
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
