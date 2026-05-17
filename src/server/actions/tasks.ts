"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  tasks,
  taskChecklistItems,
  taskComments,
  taskAttachments,
  taskWatchers,
  taskDependencies,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { canAssignTaskTo, type ActorContext } from "@/lib/permissions";
import { TASK_PRIORITIES, TASK_STATUSES, canTransition } from "@/lib/permissions/tasks";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { storeFile, deleteFileByUrl } from "@/lib/upload";

const createSchema = z.object({
  title: z.string().min(2).max(500),
  description: z.string().nullable().optional(),
  assignedToUserId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES),
  deadline: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  dependsOnIds: z.array(z.string().uuid()).optional(),
});

export async function createTask(input: z.infer<typeof createSchema>): Promise<{ id: string }> {
  const me = await requireUser();
  const parsed = createSchema.parse(input);

  const assignee = await db.select().from(users).where(eq(users.id, parsed.assignedToUserId)).limit(1);
  if (assignee.length === 0) throw new Error("assignee_not_found");

  const a: ActorContext = { id: me.id, position: me.position, departmentId: me.departmentId };
  const b: ActorContext = { id: assignee[0].id, position: assignee[0].position, departmentId: assignee[0].departmentId };
  if (!(await canAssignTaskTo(a, b))) throw new Error("forbidden_assign");

  const inserted = await db.transaction(async (tx) => {
    const ins = await tx
      .insert(tasks)
      .values({
        title: parsed.title,
        description: parsed.description ?? null,
        assignedToUserId: parsed.assignedToUserId,
        createdByUserId: me.id,
        projectId: parsed.projectId ?? null,
        milestoneId: parsed.milestoneId ?? null,
        parentTaskId: parsed.parentTaskId ?? null,
        priority: parsed.priority,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estimatedHours: parsed.estimatedHours != null ? (parsed.estimatedHours as any) : null,
      })
      .returning({ id: tasks.id });
    if (parsed.dependsOnIds && parsed.dependsOnIds.length > 0) {
      await tx.insert(taskDependencies).values(parsed.dependsOnIds.map((d) => ({ taskId: ins[0].id, dependsOnTaskId: d })));
    }
    return ins[0];
  });

  await logActivity({
    userId: me.id,
    action: "task.created",
    entityType: "task",
    entityId: inserted.id,
    newValue: { title: parsed.title, assignedToUserId: parsed.assignedToUserId },
  });
  await notify({
    userIds: [parsed.assignedToUserId],
    type: "task.assigned",
    title: `New task: ${parsed.title}`,
    message: `Assigned to you by ${me.fullName}`,
    link: `/tasks/${inserted.id}`,
    entityType: "task",
    entityId: inserted.id,
  });

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
  const watchers = await db
    .select({ userId: taskWatchers.userId })
    .from(taskWatchers)
    .where(eq(taskWatchers.taskId, taskId));
  for (const w of watchers) if (w.userId !== me.id) recipients.add(w.userId);

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
      mentions: parsed.mentions && parsed.mentions.length > 0 ? parsed.mentions : null,
    })
    .returning({ id: taskComments.id });
  await logActivity({
    userId: me.id,
    action: "task.comment_added",
    entityType: "task",
    entityId: parsed.taskId,
    newValue: { commentId: inserted[0].id },
  });
  // Notify task assignee + creator + watchers + mentions
  const t = await db.select().from(tasks).where(eq(tasks.id, parsed.taskId)).limit(1);
  if (t.length > 0) {
    const recipients = new Set<string>();
    recipients.add(t[0].assignedToUserId);
    recipients.add(t[0].createdByUserId);
    const watchers = await db.select({ userId: taskWatchers.userId }).from(taskWatchers).where(eq(taskWatchers.taskId, parsed.taskId));
    for (const w of watchers) recipients.add(w.userId);
    if (parsed.mentions) for (const m of parsed.mentions) recipients.add(m);
    recipients.delete(me.id);
    if (recipients.size > 0) {
      await notify({
        userIds: Array.from(recipients),
        type: parsed.mentions && parsed.mentions.length > 0 ? "task.mention" : "task.comment",
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

export async function setWatcher(taskId: string, watching: boolean) {
  const me = await requireUser();
  if (watching) {
    await db.insert(taskWatchers).values({ taskId, userId: me.id }).onConflictDoNothing();
  } else {
    await db.delete(taskWatchers).where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, me.id)));
  }
  revalidatePath(`/tasks/${taskId}`);
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

// Kanban drag-and-drop endpoint (uses canTransition)
export async function moveTaskOnKanban(taskId: string, nextStatus: (typeof TASK_STATUSES)[number]) {
  return changeTaskStatus(taskId, nextStatus);
}

void inArray;
