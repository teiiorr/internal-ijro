"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  tasks,
  taskAssignees,
  taskChecklistItems,
  taskComments,
  taskAttachments,
  taskDependencies,
  users,
  projects,
  externalCompanies,
  projectStages,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { canAssignTaskTo, type ActorContext } from "@/lib/permissions";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { postProjectMessage } from "@/server/actions/projects";
import { TASK_PRIORITIES, TASK_STATUSES, canTransition } from "@/lib/permissions/tasks";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { storeFile, deleteFileByUrl } from "@/lib/upload";
import { nextRegistrationNumber } from "@/lib/tasks/registration-number";

const createSchema = z.object({
  title: z.string().min(2).max(500),
  description: z.string().nullable().optional(),
  /** Asosiy ijroçi (moslik uçun saqlangan; task_assignees'ga ham qöşiladi). */
  assignedToUserId: z.string().uuid(),
  /** Qöşimça ijroçilar (köp ijroçili). Asosiy ijroçi bilan birlaştirilib, takrorlari olib taşlanadi. */
  additionalAssigneeIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES),
  deadline: z.string().datetime().nullable().optional(),
});

export async function createTask(input: z.infer<typeof createSchema>): Promise<{ id: string }> {
  const me = await requireUser();
  const parsed = createSchema.parse(input);

  const allAssigneeIds = Array.from(new Set([parsed.assignedToUserId, ...(parsed.additionalAssigneeIds ?? [])]));
  const a: ActorContext = { id: me.id, position: me.position, departmentId: me.departmentId };

  // Har bir ijroçiga ruxsat borligini tekşiramiz — bitta guruhli sörov bilan (har ijroçi uçun alohida sörovsiz).
  const assigneeRows = await db
    .select({ id: users.id, fullName: users.fullName, position: users.position, departmentId: users.departmentId })
    .from(users)
    .where(inArray(users.id, allAssigneeIds));
  const assigneeById = new Map(assigneeRows.map((u) => [u.id, u]));
  for (const uid of allAssigneeIds) {
    const u = assigneeById.get(uid);
    if (!u) throw new Error("assignee_not_found");
    const b: ActorContext = { id: u.id, position: u.position, departmentId: u.departmentId };
    if (!(await canAssignTaskTo(a, b))) throw new Error(`forbidden_assign:${u.fullName}`);
  }

  const regNum = await nextRegistrationNumber();

  const insertedId = await db.transaction(async (tx) => {
    const ins = await tx
      .insert(tasks)
      .values({
        registrationNumber: regNum,
        title: parsed.title,
        description: parsed.description ?? null,
        assignedToUserId: parsed.assignedToUserId,
        createdByUserId: me.id,
        projectId: parsed.projectId ?? null,
        milestoneId: parsed.milestoneId ?? null,
        parentTaskId: parsed.parentTaskId ?? null,
        priority: parsed.priority,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        // Qölda "Boşlaş" bosqiçini ötkazib yuboramiz — topşiriqlar darrov in_progress holatida oçiladi.
        status: "in_progress",
      })
      .returning({ id: tasks.id });
    const id = ins[0].id;
    await tx.insert(taskAssignees).values(
      allAssigneeIds.map((uid) => ({ taskId: id, userId: uid, status: "in_progress" as const }))
    );
    return id;
  });

  await logActivity({
    userId: me.id,
    action: "task.created",
    entityType: "task",
    entityId: insertedId,
    newValue: { title: parsed.title, registrationNumber: regNum, assignees: allAssigneeIds },
  });
  await notify({
    userIds: allAssigneeIds,
    type: "task.assigned",
    title: `${regNum}: ${parsed.title}`,
    message: `Sizga yangi topshiriq yuklandi`,
    link: `/tasks/${insertedId}`,
    entityType: "task",
    entityId: insertedId,
  });
  const inserted = { id: insertedId };

  revalidatePath("/tasks");
  return { id: inserted.id };
}

const studioTaskSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(500),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  deadline: z.string().datetime().nullable().optional(),
});

/**
 * Studiyaga (kontragentga) vazifa beradi — "Studiyalar" bölimidan. Ichki vazifa
 * oqimidan ATAYLAB ajratilgan: bu yerda ijroçi — studiyaning kontragent
 * foydalanuvçisi, şu bois ichki `canAssignTaskTo` (u kontragentni bloklaydi)
 * chetlab ötiladi va o'rniga loyiha-muharrir huquqi tekşiriladi. Vazifa loyiha
 * bosqichiga bog'lanishi mumkin (ixtiyoriy; standart — joriy bosqich, uni mijoz
 * tanlaydi). Mavjud ichki vazifa mantig'iga tegilmaydi.
 */
export async function createStudioTask(input: z.infer<typeof studioTaskSchema>): Promise<{ id: string }> {
  const me = await requireUser();
  const parsed = studioTaskSchema.parse(input);

  // Faqat loyiha muharrirlari studiyaga vazifa bera oladi (Studiyalar sahifasidagi isEditor bilan bir xil).
  const isEditor = canEditProjects(me.email) || (await hasGrant(me.id, "projects.edit"));
  if (!isEditor) throw new Error("forbidden");

  // Loyiha → studiya (external_companies) → kontragent foydalanuvçini aniqlaymiz.
  const [prj] = await db
    .select({ id: projects.id, externalCompanyId: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, parsed.projectId))
    .limit(1);
  if (!prj || !prj.externalCompanyId) throw new Error("not_a_studio_project");
  const [company] = await db
    .select({ email: externalCompanies.contactEmail })
    .from(externalCompanies)
    .where(eq(externalCompanies.id, prj.externalCompanyId))
    .limit(1);
  if (!company?.email) throw new Error("studio_has_no_login");
  const [studioUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, company.email), eq(users.position, "kontragent")))
    .limit(1);
  if (!studioUser) throw new Error("studio_has_no_login");

  // Bosqiç berilgan bölsa — u ayni şu loyihaga tegişli ekanini tekşiramiz.
  let stageId: string | null = null;
  if (parsed.stageId) {
    const [st] = await db
      .select({ id: projectStages.id })
      .from(projectStages)
      .where(and(eq(projectStages.id, parsed.stageId), eq(projectStages.projectId, parsed.projectId)))
      .limit(1);
    if (!st) throw new Error("stage_not_in_project");
    stageId = st.id;
  }

  const regNum = await nextRegistrationNumber();
  const insertedId = await db.transaction(async (tx) => {
    const ins = await tx
      .insert(tasks)
      .values({
        registrationNumber: regNum,
        title: parsed.title,
        description: parsed.description ?? null,
        assignedToUserId: studioUser.id,
        createdByUserId: me.id,
        projectId: parsed.projectId,
        stageId,
        priority: parsed.priority,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        status: "in_progress",
      })
      .returning({ id: tasks.id });
    const id = ins[0].id;
    await tx.insert(taskAssignees).values({ taskId: id, userId: studioUser.id, status: "in_progress" as const });
    return id;
  });

  await logActivity({
    userId: me.id,
    action: "task.created_for_studio",
    entityType: "task",
    entityId: insertedId,
    newValue: { title: parsed.title, registrationNumber: regNum, projectId: parsed.projectId, stageId },
  });
  await notify({
    userIds: [studioUser.id],
    type: "task.assigned",
    title: `${regNum}: ${parsed.title}`,
    message: "Sizga yangi vazifa berildi",
    // Studiya kontragent → öz Vazifalar sahifasidagi vazifaga bevosita ötadi.
    link: `/contractor/tasks/${insertedId}`,
    entityType: "task",
    entityId: insertedId,
  });

  revalidatePath(`/contractor/tasks`);
  revalidatePath("/contractors");
  return { id: insertedId };
}

/**
 * Vazifani loyiha suhbatiga (chatiga) yuboradi — muhokama qiliş uçun. Vazifaning
 * bosqiç kanaliga (yoki umumiy kanalga) matnli xabar sifatida joylaştiriladi.
 * Ham studiya, ham nazoratchi mas'ul çaqira oladi: kirişni postProjectMessage
 * boşqaradi (studiya faqat öz loyihasiga; xodimlar erkin) va ikkinçi tomonni
 * xabardor qiladi ("eslatma").
 */
export async function shareTaskToChat(taskId: string) {
  await requireUser();
  const [task] = await db
    .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId, stageId: tasks.stageId, deadline: tasks.deadline, description: tasks.description })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task || !task.projectId) throw new Error("not_found");

  const lines = [`📋 Vazifa: «${task.title}»`];
  if (task.deadline) lines.push(`🗓 ${new Date(task.deadline).toISOString().slice(0, 10)}`);
  if (task.description?.trim()) lines.push("", task.description.trim());

  await postProjectMessage({
    projectId: task.projectId,
    ...(task.stageId ? { stageId: task.stageId } : {}),
    content: lines.join("\n"),
  });
  return { ok: true };
}

export async function changeTaskStatus(taskId: string, nextStatus: (typeof TASK_STATUSES)[number], rejectionReason?: string) {
  const me = await requireUser();
  const row = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (row.length === 0) throw new Error("not_found");
  const t = row[0];
  const isCreator = t.createdByUserId === me.id;
  const isAssignee = t.assignedToUserId === me.id;

  if (!canTransition(t.status as (typeof TASK_STATUSES)[number], nextStatus, { id: me.id, position: me.position, isCreator, isAssignee })) {
    throw new Error("forbidden_transition");
  }

  // Oçiq boğliqliklar bölsa, boşlaşni bloklaymiz
  if (nextStatus === "in_progress" && t.status === "todo") {
    const deps = await db
      .select({ status: tasks.status })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
      .where(eq(taskDependencies.taskId, taskId));
    const blockers = deps.filter((d) => d.status !== "completed");
    if (blockers.length > 0) throw new Error("blocked_by_dependencies");
  }

  await db
    .update(tasks)
    .set({
      status: nextStatus,
      rejectionReason: nextStatus === "rejected" ? rejectionReason ?? null : null,
      completedAt: nextStatus === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  await logActivity({
    userId: me.id,
    action: "task.status_changed",
    entityType: "task",
    entityId: taskId,
    oldValue: { status: t.status },
    newValue: { status: nextStatus },
  });

  const recipients = new Set<string>();
  recipients.add(t.createdByUserId);
  recipients.add(t.assignedToUserId);
  recipients.delete(me.id);

  await notify({
    userIds: Array.from(recipients),
    type: "task.status_changed",
    title: `Task: ${t.title}`,
    message: `Status changed to ${nextStatus}`,
    link: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
}

const commentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().nullable().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

export async function addComment(input: z.infer<typeof commentSchema>) {
  const me = await requireUser();
  const parsed = commentSchema.parse(input);
  const inserted = await db
    .insert(taskComments)
    .values({
      taskId: parsed.taskId,
      userId: me.id,
      content: parsed.content,
      parentCommentId: parsed.parentCommentId ?? null,
      mentions: parsed.mentions?.length ? parsed.mentions : null,
    })
    .returning({ id: taskComments.id });
  await logActivity({
    userId: me.id,
    action: "task.comment_added",
    entityType: "task",
    entityId: parsed.taskId,
    newValue: { commentId: inserted[0].id },
  });
  const t = await db.select().from(tasks).where(eq(tasks.id, parsed.taskId)).limit(1);
  if (t.length > 0) {
    const recipients = new Set<string>();
    recipients.add(t[0].assignedToUserId);
    recipients.add(t[0].createdByUserId);
    if (parsed.mentions?.length) {
      for (const uid of parsed.mentions) recipients.add(uid);
    }
    recipients.delete(me.id);
    if (recipients.size > 0) {
      // Izohlar — ichki (xodimlar) hamkorligi; studiya vazifa sahifasida izoh körinmaydi,
      // shu bois kontragent qabul qiluvchilarni bildirishnomadan çiqaramiz (ölik havola bölmasin).
      const recs = await db.select({ id: users.id, position: users.position }).from(users).where(inArray(users.id, Array.from(recipients)));
      const staffRecipients = recs.filter((u) => u.position !== "kontragent").map((u) => u.id);
      if (staffRecipients.length > 0) {
        await notify({
          userIds: staffRecipients,
          type: "task.comment",
          title: `Comment on: ${t[0].title}`,
          message: parsed.content.slice(0, 280),
          link: `/tasks/${parsed.taskId}`,
          entityType: "task",
          entityId: parsed.taskId,
        });
      }
    }
  }
  revalidatePath(`/tasks/${parsed.taskId}`);
}

const checklistSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(500),
});

export async function addChecklistItem(input: z.infer<typeof checklistSchema>) {
  await requireUser();
  const parsed = checklistSchema.parse(input);
  await db.insert(taskChecklistItems).values({ taskId: parsed.taskId, content: parsed.content });
  revalidatePath(`/tasks/${parsed.taskId}`);
}

export async function toggleChecklistItem(itemId: string, taskId: string, done: boolean) {
  await requireUser();
  await db
    .update(taskChecklistItems)
    .set({ isCompleted: done, completedAt: done ? new Date() : null })
    .where(eq(taskChecklistItems.id, itemId));
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteChecklistItem(itemId: string, taskId: string) {
  await requireUser();
  await db.delete(taskChecklistItems).where(eq(taskChecklistItems.id, itemId));
  revalidatePath(`/tasks/${taskId}`);
}

export async function attachFileToTask(taskId: string, file: File) {
  const me = await requireUser();
  const stored = await storeFile(file, `task-attachments/${taskId}`);
  await db.insert(taskAttachments).values({
    taskId,
    fileUrl: stored.url,
    fileName: stored.originalName,
    fileSize: stored.size,
    fileMimeType: stored.mimeType,
    uploadedByUserId: me.id,
  });
  await logActivity({ userId: me.id, action: "task.attachment_added", entityType: "task", entityId: taskId });
  revalidatePath(`/tasks/${taskId}`);
}

export async function removeAttachment(attachmentId: string, taskId: string) {
  await requireUser();
  const row = await db.select().from(taskAttachments).where(eq(taskAttachments.id, attachmentId)).limit(1);
  if (row.length === 0) return;
  await deleteFileByUrl(row[0].fileUrl);
  await db.delete(taskAttachments).where(eq(taskAttachments.id, attachmentId));
  revalidatePath(`/tasks/${taskId}`);
}

// ---------- Köp ijroçili: javob topşiriş ----------
const responseSchema = z.object({
  taskId: z.string().uuid(),
  responseText: z.string().min(1).max(5000),
});

export async function submitTaskResponse(input: z.infer<typeof responseSchema>, file?: File | null) {
  const me = await requireUser();
  const parsed = responseSchema.parse(input);

  // Çaqiruvçi ijroçi ekanligiga işonç hosil qilamiz
  const a = await db
    .select()
    .from(taskAssignees)
    .where(and(eq(taskAssignees.taskId, parsed.taskId), eq(taskAssignees.userId, me.id)))
    .limit(1);
  if (a.length === 0) throw new Error("not_an_assignee");

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  if (file && file.size > 0) {
    const stored = await storeFile(file, `task-responses/${parsed.taskId}`);
    fileUrl = stored.url;
    fileName = stored.originalName;
  }

  await db
    .update(taskAssignees)
    .set({
      responseText: parsed.responseText,
      responseFileUrl: fileUrl,
      responseFileName: fileName,
      responseSubmittedAt: new Date(),
      status: "under_review",
      updatedAt: new Date(),
    })
    .where(and(eq(taskAssignees.taskId, parsed.taskId), eq(taskAssignees.userId, me.id)));

  // Alohida "Tekşiruvga yuboriş" bosqiçini ötkazib yuboramiz: ota topşiriq
  // birinçi javob kelişi bilanoq under_review holatiga ötadi, şunda yaratuvçi uni
  // heç kim Holat paneliga tegmasdan öz kiruv qutisida köradi.
  await db
    .update(tasks)
    .set({ status: "under_review", updatedAt: new Date() })
    .where(eq(tasks.id, parsed.taskId));

  await logActivity({
    userId: me.id,
    action: "task.response_submitted",
    entityType: "task",
    entityId: parsed.taskId,
  });

  // Yaratuvçiga xabar beramiz
  const t = await db.select().from(tasks).where(eq(tasks.id, parsed.taskId)).limit(1);
  if (t.length > 0) {
    await notify({
      userIds: [t[0].createdByUserId],
      type: "task.response_submitted",
      title: `Javob kiritildi: ${t[0].title}`,
      message: parsed.responseText.slice(0, 280),
      link: `/tasks/${parsed.taskId}`,
      entityType: "task",
      entityId: parsed.taskId,
    });
  }
  revalidatePath(`/tasks/${parsed.taskId}`);
}

// Yaratuvçi ayrim ijroçining javobini tasdiqlaydi / rad etadi
export async function reviewAssigneeResponse(
  taskId: string,
  assigneeUserId: string,
  decision: "completed" | "rejected",
  feedback?: string
) {
  const me = await requireUser();
  const t = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (t.length === 0) throw new Error("not_found");
  const isCreator = t[0].createdByUserId === me.id || ["direktor", "orinbosar"].includes(me.position);
  if (!isCreator) throw new Error("forbidden");

  await db
    .update(taskAssignees)
    .set({
      status: decision,
      completedAt: decision === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, assigneeUserId)));

  // Ota topşiriqni avtomatik sinxronlaymiz: agar barça ijroçilar yakunlagan bölsa,
  // butun topşiriqni yakunlangan deb belgilaymiz; agar kimdir rad etilgan bölsa,
  // topşiriqni yana in_progress holatiga qaytaramiz — şunda rad etilgan ijroçi
  // yaratuvçidan qölda holat özgartirişini kutmasdan qayta javob topşira oladi.
  const all = await db
    .select({ status: taskAssignees.status })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, taskId));
  if (all.length > 0 && all.every((a) => a.status === "completed")) {
    await db
      .update(tasks)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  } else if (decision === "rejected") {
    await db
      .update(tasks)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
    // Rad etilgan ijroçi qayta faollaştiriladi — u yangi javob yoza olsin.
    await db
      .update(taskAssignees)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, assigneeUserId)));
  }

  await logActivity({
    userId: me.id,
    action: decision === "completed" ? "task.assignee_approved" : "task.assignee_rejected",
    entityType: "task",
    entityId: taskId,
    newValue: { assigneeUserId, feedback: feedback ?? null },
  });

  // Bildirishnoma havolasi qabul qiluvchi tomoniga mos bölishi kerak: studiya (kontragent)
  // ijrochi dashboard /tasks sahifasiga kira olmaydi (u yerdan qaytariladi).
  const [asg] = await db.select({ position: users.position }).from(users).where(eq(users.id, assigneeUserId)).limit(1);
  const reviewLink = asg?.position === "kontragent" ? `/contractor/tasks/${taskId}` : `/tasks/${taskId}`;
  await notify({
    userIds: [assigneeUserId],
    type: decision === "completed" ? "task.approved" : "task.rejected",
    title: `${t[0].title}`,
    message: decision === "completed" ? "Sizning javobingiz qabul qilindi." : feedback ?? "Sizning javobingiz rad etildi.",
    link: reviewLink,
    entityType: "task",
    entityId: taskId,
  });
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/contractor/tasks/${taskId}`);
}

// Ijroçi özini "in_progress" (boşladi) deb belgilaydi

