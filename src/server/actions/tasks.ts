"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
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
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { canAssignTaskTo, type ActorContext } from "@/lib/permissions";
import { TASK_PRIORITIES, TASK_STATUSES, canTransition } from "@/lib/permissions/tasks";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { storeFile, deleteFileByUrl } from "@/lib/upload";
import { nextRegistrationNumber } from "@/lib/tasks/registration-number";

const createSchema = z.object({
  title: z.string().min(2).max(500),
  description: z.string().nullable().optional(),
  /** Primary assignee (kept for compat; also added to task_assignees). */
  assignedToUserId: z.string().uuid(),
  /** Additional assignees (multi-ijrochi). Combined with primary, deduped. */
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

  // Verify each assignee is allowed
  for (const uid of allAssigneeIds) {
    const u = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (u.length === 0) throw new Error("assignee_not_found");
    const b: ActorContext = { id: u[0].id, position: u[0].position, departmentId: u[0].departmentId };
    if (!(await canAssignTaskTo(a, b))) throw new Error(`forbidden_assign:${u[0].fullName}`);
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
      })
      .returning({ id: tasks.id });
    const id = ins[0].id;
    await tx.insert(taskAssignees).values(allAssigneeIds.map((uid) => ({ taskId: id, userId: uid })));
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

  // Block starting if there are open dependencies
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
    })
    .returning({ id: taskComments.id });
  await logActivity({
    userId: me.id,
    action: "task.comment_added",
    entityType: "task",
    entityId: parsed.taskId,
    newValue: { commentId: inserted[0].id },
  });
  // Notify task assignee + creator
  const t = await db.select().from(tasks).where(eq(tasks.id, parsed.taskId)).limit(1);
  if (t.length > 0) {
    const recipients = new Set<string>();
    recipients.add(t[0].assignedToUserId);
    recipients.add(t[0].createdByUserId);
    recipients.delete(me.id);
    if (recipients.size > 0) {
      await notify({
        userIds: Array.from(recipients),
        type: "task.comment",
        title: `Comment on: ${t[0].title}`,
        message: parsed.content.slice(0, 280),
        link: `/tasks/${parsed.taskId}`,
        entityType: "task",
        entityId: parsed.taskId,
      });
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

// ---------- Multi-assignee: submit javob (response) ----------
const responseSchema = z.object({
  taskId: z.string().uuid(),
  responseText: z.string().min(1).max(5000),
});

export async function submitTaskResponse(input: z.infer<typeof responseSchema>, file?: File | null) {
  const me = await requireUser();
  const parsed = responseSchema.parse(input);

  // Ensure caller is an assignee
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

  await logActivity({
    userId: me.id,
    action: "task.response_submitted",
    entityType: "task",
    entityId: parsed.taskId,
  });

  // Notify the creator
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

// Creator approves / rejects an individual assignee's response
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

  await logActivity({
    userId: me.id,
    action: decision === "completed" ? "task.assignee_approved" : "task.assignee_rejected",
    entityType: "task",
    entityId: taskId,
    newValue: { assigneeUserId, feedback: feedback ?? null },
  });

  await notify({
    userIds: [assigneeUserId],
    type: decision === "completed" ? "task.approved" : "task.rejected",
    title: `${t[0].title}`,
    message: decision === "completed" ? "Sizning javobingiz qabul qilindi." : feedback ?? "Sizning javobingiz rad etildi.",
    link: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
  });
  revalidatePath(`/tasks/${taskId}`);
}

// Assignee marks themselves "in_progress" (started)
export async function setMyAssigneeStatus(taskId: string, next: "in_progress" | "todo") {
  const me = await requireUser();
  await db
    .update(taskAssignees)
    .set({ status: next, updatedAt: new Date() })
    .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, me.id)));
  revalidatePath(`/tasks/${taskId}`);
}

