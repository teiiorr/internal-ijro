import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, notificationSettings, taskWatchers, users } from "@/lib/db/schema";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { canTransition, type TaskStatus } from "@/lib/permissions/tasks";
import type { Position } from "@/lib/db/schema";

/**
 * Service-side task status transition initiated from a non-HTTP context (Telegram bot).
 * Authorizes by the Telegram chat_id → linked user mapping, then runs the same
 * permission and side-effect logic as the web action.
 */
export async function svcChangeTaskStatusByChatId(opts: {
  chatId: string;
  taskId: string;
  nextStatus: TaskStatus;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const linked = await db
    .select({ userId: notificationSettings.userId })
    .from(notificationSettings)
    .where(eq(notificationSettings.telegramChatId, opts.chatId))
    .limit(1);
  if (linked.length === 0) return { ok: false, reason: "not_linked" };
  const userId = linked[0].userId;

  const t = await db.select().from(tasks).where(eq(tasks.id, opts.taskId)).limit(1);
  if (t.length === 0) return { ok: false, reason: "not_found" };
  const task = t[0];

  const userRow = await db.select({ position: users.position }).from(users).where(eq(users.id, userId)).limit(1);
  if (userRow.length === 0) return { ok: false, reason: "user_missing" };
  const actorPosition: Position = userRow[0].position;

  const isCreator = task.createdByUserId === userId;
  const isAssignee = task.assignedToUserId === userId;
  if (
    !canTransition(task.status as TaskStatus, opts.nextStatus, {
      id: userId,
      position: actorPosition,
      isCreator,
      isAssignee,
    })
  ) {
    return { ok: false, reason: "forbidden" };
  }

  await db
    .update(tasks)
    .set({
      status: opts.nextStatus,
      completedAt: opts.nextStatus === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, opts.taskId));

  await logActivity({
    userId,
    action: "task.status_changed",
    entityType: "task",
    entityId: opts.taskId,
    oldValue: { status: task.status },
    newValue: { status: opts.nextStatus, source: "telegram" },
  });

  const recipients = new Set<string>([task.createdByUserId, task.assignedToUserId]);
  recipients.delete(userId);
  const watchers = await db.select({ userId: taskWatchers.userId }).from(taskWatchers).where(eq(taskWatchers.taskId, opts.taskId));
  for (const x of watchers) if (x.userId !== userId) recipients.add(x.userId);
  await notify({
    userIds: Array.from(recipients),
    type: "task.status_changed",
    title: `Task: ${task.title}`,
    message: `Status changed to ${opts.nextStatus}`,
    link: `/tasks/${opts.taskId}`,
    entityType: "task",
    entityId: opts.taskId,
  });

  return { ok: true };
}
