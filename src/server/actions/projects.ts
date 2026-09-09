"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  projects,
  projectCurators,
  milestones,
  deliverables,
  projectMessages,
  ratings,
  externalCompanies,
  users,
  projectTypes,
  projectStages,
  stageDocuments,
  projectDocuments,
  stageTemplateItems,
  notificationSettings,
} from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { requireUser, requireProjectEditor } from "@/lib/session";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { isOwner } from "@/lib/permissions/owner";
import { isContractorManager } from "@/lib/permissions/contractors";
import { logActivity } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { notify } from "@/lib/notifications";
import { storeFile, deleteFileByUrl } from "@/lib/upload";
import { recalcProjectProgress } from "@/lib/projects/recalc";

const projectSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().nullable().optional(),
  type: z.enum(["internal", "external"]),
  /** Boşlanğiç 9 ta project_types'dan biri. Boş bölmasa → bosqiçlar zanjiri avtomatik quriladi. */
  projectTypeId: z.string().uuid().nullable().optional(),
  genre: z.string().max(40).nullable().optional(),
  externalCompanyId: z.string().uuid().nullable().optional(),
  curatorUserId: z.string().uuid().nullable().optional(),
  /** mas'ul — yaratilgan har bir bosqiçga qöllanadi (keyinroq har bir bosqiç uçun tahrirlanadi). */
  responsibleUserId: z.string().uuid().nullable().optional(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  budgetCurrency: z.string().default("UZS"),
});

export async function createProject(input: z.infer<typeof projectSchema>) {
  const me = await requireProjectEditor();
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
        genre: parsed.genre?.trim() || null,
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

    // Tur şablonidan tartiblangan bosqiçlar zanjirini avtomatik quramiz.
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
      // startDate'dan boşlab har bir elementning standart davomiyligi qöşilib, rejadagi muddatlar töplanib boradi (agar belgilangan bölsa).
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

  // Birinçi (allaqaçon faol) bosqiçning mas'uliga xabar beramiz.
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
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
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


/** Bosqiç jarayonini belgilaydi (0..100). Server qiymatni çeklaydi; mijozga heç qaçon işonilmaydi. */
export async function setMilestoneProgress(milestoneId: string, progress: number) {
  const me = await requireProjectEditor();
  const value = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const row = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (row.length === 0) throw new Error("not_found");
  // Eski `status` maydonini mos holda saqlaymiz — uni hali öqiydigan boşqa qismlar izçil işlaşi uçun.
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
  const me = await requireProjectEditor();
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
  // Bölim boşliği bosqiçlarni yarata, tahrirlay va qayta tartiblay oladi, ammo öçira OLMAYDI.
  const me = await requireProjectEditor();
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

/** Loyiha bosqiçlariga yangi tartibni qöllaydi. orderedIds töliq röyxat bölişi şart. */
export async function reorderMilestones(projectId: string, orderedIds: string[]) {
  const me = await requireProjectEditor();
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

/** Loyiha uçun qölda "töxtatib turiş" holatini yoqadi yoki öçiradi. */
export async function setProjectOnHold(projectId: string, onHold: boolean) {
  const me = await requireProjectEditor();
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

/**
 * Loyihani qölda "jarayonda" deb belgilaydi (yoki tozalaydi). Bu bitta bosqiçli
 * loyihalar uçun möljallangan — ularning hosilaviy holati faqat not_started/completed
 * böla oladi. Xuddi şu statusOverride maydoniga yozadi, şu bois bu holat va
 * "töxtatib turiş" biri-birini istisno qiladi.
 */
export async function setProjectInProgress(projectId: string, on: boolean) {
  const me = await requireProjectEditor();
  await db
    .update(projects)
    .set({ statusOverride: on ? "in_progress" : null, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await logActivity({
    userId: me.id,
    action: on ? "project.marked_in_progress" : "project.status_cleared",
    entityType: "project",
    entityId: projectId,
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

// Loyiha posteri (kvadrat muqova rasmi)
export async function setProjectPoster(projectId: string, file: File) {
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
  const [prev] = await db.select({ posterUrl: projects.posterUrl }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (prev?.posterUrl) await deleteFileByUrl(prev.posterUrl);
  await db.update(projects).set({ posterUrl: null, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({ userId: me.id, action: "project.poster_removed", entityType: "project", entityId: projectId });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

// Loyiha xabarlari (çat)
const attachmentSchema = z.object({
  url: z.string(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
});
const msgSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
  attachments: z.array(attachmentSchema).optional(),
  replyToId: z.string().uuid().optional().nullable(),
});
/** Kontragent faqat öz studiyasiga tegişli loyiha üstida amal bajara oladi
 *  (email → kompaniya → loyiha orqali aniqlanadi). Xodimlar heç qanday çeklovsiz ötadi. */
async function assertProjectAccess(me: { position: string; email: string }, projectId: string) {
  if (me.position !== "kontragent") return;
  const [c] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, me.email))
    .limit(1);
  const [p] = c
    ? await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, projectId)).limit(1)
    : [undefined];
  if (!c || !p || p.ec !== c.id) throw new Error("forbidden");
}

export async function postProjectMessage(input: z.infer<typeof msgSchema>) {
  const me = await requireUser();
  const parsed = msgSchema.parse(input);
  await assertProjectAccess(me, parsed.projectId);
  await db.insert(projectMessages).values({
    projectId: parsed.projectId,
    stageId: parsed.stageId ?? null,
    userId: me.id,
    content: parsed.content,
    attachments: parsed.attachments?.length ? parsed.attachments : undefined,
    replyToId: parsed.replyToId ?? null,
  });

  // Ikkinçi tomonga xabar beramiz — çatda haqiqiy iştirokçilar bölişi uçun.
  // Kuratorlar (bizning tomon) majburiy iştirokçilar — studiya yozganda ular
  // doim ogohlantiriladi; biz yozganimizda esa studiyaning aloqa foydalanuvçisi ogohlantiriladi.
  const [prj] = await db
    .select({ name: projects.name, curatorUserId: projects.curatorUserId, ec: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, parsed.projectId))
    .limit(1);
  if (prj) {
    const curatorIds = new Set<string>();
    if (prj.curatorUserId) curatorIds.add(prj.curatorUserId);
    try {
      const rows = await db
        .select({ userId: projectCurators.userId })
        .from(projectCurators)
        .where(eq(projectCurators.projectId, parsed.projectId));
      for (const r of rows) curatorIds.add(r.userId);
    } catch {
      /* projectCurators hali migratsiya qilinmagan — bitta kurator ustuni allaqaçon qöşilgan */
    }

    let recipients: string[];
    if (me.position === "kontragent") {
      // studiya yozdi → bizning tomon kuratorlariga xabar beramiz
      recipients = [...curatorIds].filter((id) => id !== me.id);
    } else {
      // bizning tomon yozdi → studiyaning aloqa foydalanuvçisiga xabar beramiz
      recipients = [];
      if (prj.ec) {
        const [company] = await db
          .select({ email: externalCompanies.contactEmail })
          .from(externalCompanies)
          .where(eq(externalCompanies.id, prj.ec))
          .limit(1);
        if (company?.email) {
          const [contact] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, company.email))
            .limit(1);
          if (contact && contact.id !== me.id) recipients = [contact.id];
        }
      }
    }

    if (recipients.length) {
      const preview = parsed.content.length > 120 ? `${parsed.content.slice(0, 117)}…` : parsed.content;
      await notify({
        userIds: recipients,
        type: "project.message",
        title: `${me.fullName} · ${prj.name}`,
        message: preview,
        // Studiya yozdi → xodim haqiqiy chat sahifasiga ötadi (/projects/[id] da chat yöq).
        // Xodim yozdi → studiya öz chatiga ötadi.
        link: me.position === "kontragent"
          ? (prj.ec ? `/contractors/${prj.ec}/chat/${parsed.projectId}` : `/projects/${parsed.projectId}`)
          : `/contractor/chats/${parsed.projectId}`,
        entityType: "project",
        entityId: parsed.projectId,
      });
    }
  }

  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath(`/contractor/projects/${parsed.projectId}`);
  revalidatePath(`/contractor/chats/${parsed.projectId}`);
}

/** Loyihaga kelgan xabarlarni çaqiruvçi tomon uçun öqilgan deb belgilaydi (studiya →
 *  read_by_contractor, xodim → read_by_curator). Guruh oçilganda çaqiriladi. */
export async function markProjectRead(projectId: string) {
  const me = await requireUser();
  await assertProjectAccess(me, projectId);
  const isKontragent = me.position === "kontragent";
  const readCol = isKontragent ? projectMessages.readByContractorAt : projectMessages.readByCuratorAt;
  await db
    .update(projectMessages)
    .set(isKontragent ? { readByContractorAt: new Date() } : { readByCuratorAt: new Date() })
    .where(and(eq(projectMessages.projectId, projectId), sql`${projectMessages.userId} <> ${me.id}`, sql`${readCol} is null`));
  revalidatePath("/contractor/chats");
  revalidatePath("/contractor", "layout"); // pastki navigatsiyadagi öqilmagan xabar belgisini yangilaymiz
  revalidatePath("/contractors");
}

function revalidateMessageSurfaces(projectId: string, stageId: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/contractor/projects/${projectId}`);
  revalidatePath(`/contractor/chats/${projectId}`);
  if (stageId) {
    revalidatePath(`/projects/${projectId}/stages/${stageId}`);
    revalidatePath(`/contractor/projects/${projectId}/stages/${stageId}`);
  }
  revalidatePath(`/contractors`);
}

/** Öz xabarini tahrirlaydi (Telegram uslubida). Faqat muallif uçun. */
export async function editProjectMessage(messageId: string, content: string) {
  const me = await requireUser();
  const text = content.trim();
  if (text.length < 1 || text.length > 5000) throw new Error("invalid");
  const [msg] = await db.select().from(projectMessages).where(eq(projectMessages.id, messageId)).limit(1);
  if (!msg) throw new Error("not_found");
  if (msg.userId !== me.id) throw new Error("forbidden");
  await db.update(projectMessages).set({ content: text, editedAt: new Date() }).where(eq(projectMessages.id, messageId));
  revalidateMessageSurfaces(msg.projectId, msg.stageId);
}

/** Xabarni öçiradi. Muallif, loyiha muharriri yoki egasi (moderatsiya) böla oladi. */
export async function deleteProjectMessage(messageId: string) {
  const me = await requireUser();
  const [msg] = await db.select().from(projectMessages).where(eq(projectMessages.id, messageId)).limit(1);
  if (!msg) throw new Error("not_found");
  const isEditor = isOwner(me.email) || canEditProjects(me.email) || (await hasGrant(me.id, "projects.edit"));
  if (msg.userId !== me.id && !isEditor) throw new Error("forbidden");
  await db.delete(projectMessages).where(eq(projectMessages.id, messageId));
  revalidateMessageSurfaces(msg.projectId, msg.stageId);
}

// Topşiriladigan işlar (kontragent yuklamalari)
export async function submitDeliverable(opts: {
  projectId: string;
  milestoneId?: string | null;
  taskId?: string | null;
  type: string;
  message?: string | null;
  file: File;
}) {
  const me = await requireUser();
  await assertProjectAccess(me, opts.projectId);
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
  // Kuratorga xabar beramiz
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
  if (!["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"].includes(me.position)) throw new Error("forbidden");
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
    // Havola topshiruvchi tomoniga mos: kontragent → /contractor/projects, xodim → /projects.
    const [sub] = await db.select({ position: users.position }).from(users).where(eq(users.id, d[0].submittedByUserId)).limit(1);
    await notify({
      userIds: [d[0].submittedByUserId],
      type: "deliverable.reviewed",
      title: `Deliverable ${status}`,
      message: adminFeedback ?? "",
      link: sub?.position === "kontragent" ? `/contractor/projects` : `/projects`,
      entityType: "deliverable",
      entityId: deliverableId,
    });
  }
  revalidatePath(`/projects`);
  revalidatePath(`/contractor/projects`);
}

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;

// Loyihani butunlay öçiradi. Qaytarib bölmaydi → faqat yuqori rahbariyat uçun.
// FK cascade bosqiçlar/hujjatlar/tölovlar/bosqiçlar/xabarlar/baholarni öçiradi;
// tasks va kengaş kun tartibi havolalari null qilinadi (ular saqlanib qoladi). Yuklangan fayllar
// (bosqiç hujjatlari + poster) qator öçirilişidan oldin imkon qadar diskdan tozalanadi.
export async function deleteProject(projectId: string) {
  // Öçiriş uçun HAM loyiha-muharrir röyxatida böliş, HAM direktor darajasidagi lavozim kerak.
  const me = await requireProjectEditor();
  if (!["direktor", "orinbosar", "koordinator"].includes(me.position)) redirect("/projects");
  const [prj] = await db
    .select({ id: projects.id, name: projects.name, posterUrl: projects.posterUrl })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!prj) return;

  // Imkon qadar fayllarni tozalaymiz (bu heç qaçon öçirişni töxtatmaydi).
  const docs = await db
    .select({ fileUrl: stageDocuments.fileUrl })
    .from(stageDocuments)
    .innerJoin(projectStages, eq(projectStages.id, stageDocuments.stageId))
    .where(eq(projectStages.projectId, projectId));
  for (const d of docs) {
    try { await deleteFileByUrl(d.fileUrl); } catch { /* egasiz fayl — e'tiborsiz qoldiramiz */ }
  }
  if (prj.posterUrl) {
    try { await deleteFileByUrl(prj.posterUrl); } catch { /* e'tiborsiz qoldiramiz */ }
  }

  await db.delete(projects).where(eq(projects.id, projectId));
  await logActivity({ userId: me.id, action: "project.deleted", entityType: "project", entityId: projectId, oldValue: { name: prj.name } });
  revalidatePath("/projects");
}

// Mavjud loyihaning asosiy maydonlarini tahrirlaydi (barça xodimlar — kiriş siyosatiga qarang).
// Işlab çiqariş turi (projectTypeId) bu yerda ataylab tahrirlanMAYDI: uni özgartiriş
// bosqiçlar zanjirini egasiz qoldiradi/qayta quradi. Fayllar (poster/hujjatlar) bunga kirmaydi.
const updateProjectSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().nullable().optional(),
  type: z.enum(["internal", "external"]),
  curatorUserId: z.string().uuid().nullable().optional(),
  /** Töliq kurator töplami (köpga-köp). Mavjud bölsa, curatorUserId'dan üstun turadi. */
  curatorUserIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  budgetCurrency: z.string().min(1).max(10).optional(),
  genre: z.string().max(40).nullable().optional(),
  currentStatus: z.string().max(5000).nullable().optional(),
});
export async function updateProject(id: string, input: z.infer<typeof updateProjectSchema>) {
  const me = await requireProjectEditor();
  const parsed = updateProjectSchema.parse(input);
  const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) throw new Error("not_found");

  // Kurator töplamini aniqlaymiz. Birinçisi eski moslik uçun projects.curator_user_id'da
  // "asosiy" sifatida qoladi; butun töplam esa boğlovçi jadvalga yoziladi.
  const curatorIds = parsed.curatorUserIds
    ? Array.from(new Set(parsed.curatorUserIds))
    : parsed.curatorUserId
      ? [parsed.curatorUserId]
      : [];
  const primaryCurator = curatorIds[0] ?? null;

  await db
    .update(projects)
    .set({
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null,
      type: parsed.type,
      curatorUserId: primaryCurator,
      startDate: parsed.startDate || null,
      deadline: parsed.deadline || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      budget: parsed.budget != null ? (String(parsed.budget) as any) : null,
      budgetCurrency: parsed.budgetCurrency || "UZS",
      ...(parsed.genre !== undefined && { genre: parsed.genre?.trim() || null }),
      ...(parsed.currentStatus !== undefined && { currentStatus: parsed.currentStatus?.trim() || null }),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  // Köpga-köp kuratorlarni sinxronlaymiz (himoyalangan — jadval hali migratsiya qilinmagan bölişi mumkin).
  if (parsed.curatorUserIds !== undefined) {
    try {
      await db.delete(projectCurators).where(eq(projectCurators.projectId, id));
      if (curatorIds.length > 0) {
        await db.insert(projectCurators).values(
          curatorIds.map((uid, i) => ({ projectId: id, userId: uid, orderIndex: i })),
        );
      }
    } catch {
      /* project_curators hali migratsiya qilinmagan — asosiy kurator ustuni baribir yangilandi */
    }
  }

  await logActivity({ userId: me.id, action: "project.updated", entityType: "project", entityId: id, newValue: { name: parsed.name } });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}

// Kontragentni bevosita yaratadi (özi röyxatdan ötmasdan / akkauntsiz) va avtomatik tasdiqlaydi.
const contractorSchema = z.object({
  name: z.string().min(2).max(255),
  contactPerson: z.string().max(255).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactEmail: z.string().max(255).nullable().optional(),
  specialization: z.string().max(500).nullable().optional(),
});
export async function createContractor(input: z.infer<typeof contractorSchema>) {
  const me = await requireProjectEditor();
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

// Loyihadagi kontragentni tayinlaydi, özgartiradi yoki oçiradi (rahbarlar yoki kurator).
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

// Kontragentni tasdiqlaydi/rad etadi (external_companies + foydalanuvçini faollaştiriş)
export async function approveContractor(companyId: string) {
  const me = await requireProjectEditor();
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
  const me = await requireProjectEditor();
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

// Loyihani yakunlaydi + kontragentni baholaydi
const ratingSchema = z.object({
  projectId: z.string().uuid(),
  externalCompanyId: z.string().uuid().nullable().optional(),
  score: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
});
export async function completeProjectWithRating(input: z.infer<typeof ratingSchema>) {
  const me = await requireProjectEditor();
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
      // öртaça bahoni qayta hisoblaymiz
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

// NDA'ni qabul qiliş
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

// ---------- loyiha hujjatlari (tahlil / xalqaro tajriba) ----------
// Yuklaşlar /api/files/project-docs oqim yöli orqali ötadi; bu funksiya faqat
// mavjud faylni öçiradi. Barça içki xodimlar uçun oçiq (yuklaş huquqiga mos keladi).
export async function removeProjectDocument(documentId: string) {
  const me = await requireProjectEditor();
  const [doc] = await db.select().from(projectDocuments).where(eq(projectDocuments.id, documentId)).limit(1);
  if (!doc) return;
  await deleteFileByUrl(doc.fileUrl);
  await db.delete(projectDocuments).where(eq(projectDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "project.document_removed", entityType: "project", entityId: doc.projectId, newValue: { kind: doc.kind } });
  revalidatePath(`/projects/${doc.projectId}`);
}

// Tölov hujjatini boşqa jildga (yoki jildsiz holatga) köçiradi.
export async function setProjectDocumentFolder(documentId: string, folder: string | null) {
  const me = await requireProjectEditor();
  const [doc] = await db.select().from(projectDocuments).where(eq(projectDocuments.id, documentId)).limit(1);
  if (!doc) return;
  const v = folder ? (folder.replace(/\s+/g, " ").trim().slice(0, 120) || null) : null;
  await db.update(projectDocuments).set({ folder: v }).where(eq(projectDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "project.document_moved", entityType: "project", entityId: doc.projectId, newValue: { folder: v } });
  revalidatePath(`/projects/${doc.projectId}`);
}

export async function updateContractorNotes(companyId: string, notes: string) {
  const me = await requireUser();
  // Izohlarni faqat Studiyalar bölimini boşqaruvçilar tahrirlaydi (faqat-öqiş xodimlar emas).
  if (!isContractorManager(me)) throw new Error("forbidden");
  await db.update(externalCompanies).set({ notes: notes.trim() || null }).where(eq(externalCompanies.id, companyId));
  revalidatePath(`/contractors/${companyId}`);
}

export async function loadStageMessagesForProject(projectId: string) {
  await requireUser();
  const stageRows = await db
    .select({ id: projectStages.id })
    .from(projectStages)
    .where(eq(projectStages.projectId, projectId));
  const stageIds = stageRows.map((s) => s.id);

  const allMsgs = await db
    .select({
      id: projectMessages.id,
      content: projectMessages.content,
      createdAt: projectMessages.createdAt,
      userId: projectMessages.userId,
      userName: users.fullName,
      attachments: projectMessages.attachments,
      stageId: projectMessages.stageId,
    })
    .from(projectMessages)
    .innerJoin(users, eq(users.id, projectMessages.userId))
    .where(eq(projectMessages.projectId, projectId))
    .orderBy(projectMessages.createdAt);

  const byStage: Record<string, typeof allMsgs> = {};
  const general: typeof allMsgs = [];

  for (const m of allMsgs) {
    if (m.stageId) {
      (byStage[m.stageId] ??= []).push(m);
    } else {
      general.push(m);
    }
  }

  return { byStage, general };
}

// --- Studiya CRUD ---

export async function renameContractor(companyId: string, name: string) {
  const me = await requireProjectEditor();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("name_too_short");
  await db.update(externalCompanies).set({ name: trimmed }).where(eq(externalCompanies.id, companyId));
  await logActivity({ userId: me.id, action: "contractor.renamed", entityType: "external_company", entityId: companyId, newValue: { name: trimmed } });
  revalidatePath("/contractors");
  revalidatePath(`/contractors/${companyId}`);
}

export async function deleteContractor(companyId: string) {
  const me = await requireProjectEditor();
  const linked = await db.select({ id: projects.id }).from(projects).where(eq(projects.externalCompanyId, companyId)).limit(1);
  if (linked.length > 0) throw new Error("has_projects");
  const company = await db.select().from(externalCompanies).where(eq(externalCompanies.id, companyId)).limit(1);
  if (company.length === 0) return;
  if (company[0].contactEmail) {
    await db.delete(users).where(and(eq(users.email, company[0].contactEmail), eq(users.position, "kontragent")));
  }
  await db.delete(externalCompanies).where(eq(externalCompanies.id, companyId));
  await logActivity({ userId: me.id, action: "contractor.deleted", entityType: "external_company", entityId: companyId, newValue: { name: company[0].name } });
  revalidatePath("/contractors");
}

const createStudioSchema = z.object({
  name: z.string().min(2).max(255),
  contactPerson: z.string().min(2).max(255),
  contactEmail: z.string().email().max(255),
  password: z.string().min(6).max(128),
  contactPhone: z.string().max(50).optional().or(z.literal("")),
});

export async function createStudioWithLogin(input: z.infer<typeof createStudioSchema>) {
  const me = await requireProjectEditor();
  const parsed = createStudioSchema.parse(input);
  const email = parsed.contactEmail.toLowerCase().trim();

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) throw new Error("email_taken");

  const result = await db.transaction(async (tx) => {
    const company = await tx
      .insert(externalCompanies)
      .values({
        name: parsed.name.trim(),
        contactPerson: parsed.contactPerson.trim(),
        contactEmail: email,
        contactPhone: parsed.contactPhone?.trim() || null,
        status: "approved",
        approvedByUserId: me.id,
        approvedAt: new Date(),
      })
      .returning({ id: externalCompanies.id });

    const u = await tx
      .insert(users)
      .values({
        email,
        fullName: parsed.contactPerson.trim(),
        passwordHash: await hashPassword(parsed.password),
        position: "kontragent",
        status: "active",
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });

    await tx.insert(notificationSettings).values({ userId: u[0].id });
    return company[0];
  });

  await logActivity({ userId: me.id, action: "contractor.created_with_login", entityType: "external_company", entityId: result.id, newValue: { name: parsed.name, email } });
  revalidatePath("/contractors");
  return result;
}
