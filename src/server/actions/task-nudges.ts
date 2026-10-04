"use server";
import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks, taskAssignees, users } from "@/lib/db/schema";
import { taskNudges } from "@/lib/db/tables/task-control";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const OPEN_STATUSES = ["todo", "in_progress", "rejected"];
const DEFAULT_MESSAGE = "Topshiriq boʻyicha javobingiz kutilmoqda / Ожидается ваш ответ по поручению";

/** Postgres "undefined_table" (42P01), possibly wrapped by drizzle's query error. */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

// z.guid(): any 8-4-4-4-12 hex id (seeded rows are not always RFC-versioned UUIDs).
const nudgeSchema = z.object({
  taskId: z.guid(),
  userIds: z.array(z.guid()).min(1).max(50),
  message: z.string().max(500).nullish(),
});

/**
 * "Eslatish": reminds the selected assignees of a task that their answer is due.
 *
 * - Only the task creator or direktor/orinbosar may nudge.
 * - Only current assignees with an open status (todo / in_progress / rejected) who are
 *   not kontragent are considered; any other id is silently ignored.
 * - One nudge per (task, assignee) per 24h — throttled ids are returned, not notified.
 */
export async function nudgeAssignees(input: {
  taskId: string;
  userIds: string[];
  message?: string | null;
}): Promise<{ sent: string[]; throttled: string[] }> {
  const me = await requireUser();
  if (me.position === "kontragent") throw new Error("forbidden");
  const { taskId, userIds, message } = nudgeSchema.parse(input);
  const text = message?.trim() ? message.trim() : null;

  const [task] = await db
    .select({ id: tasks.id, title: tasks.title, reg: tasks.registrationNumber, createdBy: tasks.createdByUserId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("not_found");
  const canManage = task.createdBy === me.id || me.position === "direktor" || me.position === "orinbosar";
  if (!canManage) throw new Error("forbidden");

  const requested = Array.from(new Set(userIds));
  const eligible = await db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(
      and(
        eq(taskAssignees.taskId, taskId),
        inArray(taskAssignees.userId, requested),
        inArray(taskAssignees.status, OPEN_STATUSES),
        ne(users.position, "kontragent")
      )
    );
  const eligibleIds = eligible.map((r) => r.userId);
  if (eligibleIds.length === 0) return { sent: [], throttled: [] };

  let sent: string[] = [];
  let throttled: string[] = [];
  try {
    // Throttle check + insert are serialised per task with an advisory lock, so two
    // concurrent clicks cannot both slip past the 24h window.
    ({ sent, throttled } = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`task_nudges:${taskId}`}::text))`);
      const recent = await tx
        .selectDistinct({ toUserId: taskNudges.toUserId })
        .from(taskNudges)
        .where(
          and(
            eq(taskNudges.taskId, taskId),
            inArray(taskNudges.toUserId, eligibleIds),
            gt(taskNudges.createdAt, sql`now() - interval '24 hours'`)
          )
        );
      const recentSet = new Set(recent.map((r) => r.toUserId));
      const toSend = eligibleIds.filter((id) => !recentSet.has(id));
      if (toSend.length > 0) {
        await tx.insert(taskNudges).values(toSend.map((uid) => ({ taskId, fromUserId: me.id, toUserId: uid, message: text })));
      }
      return { sent: toSend, throttled: eligibleIds.filter((id) => recentSet.has(id)) };
    }));
  } catch (e) {
    // task_nudges jadvali hali yaratilmagan (0031 migratsiyasi qo'llanmagan) — cheklovsiz yuborib bo'lmaydi.
    if (isMissingTable(e)) throw new Error("nudge_unavailable");
    throw e;
  }

  if (sent.length > 0) {
    await notify({
      userIds: sent,
      type: "task.nudge",
      title: task.reg ? `${task.reg}: ${task.title}` : task.title,
      message: text ?? DEFAULT_MESSAGE,
      link: `/tasks/${taskId}`,
      entityType: "task",
      entityId: taskId,
    });
    await logActivity({
      userId: me.id,
      action: "task.nudged",
      entityType: "task",
      entityId: taskId,
      newValue: { to: sent, message: text },
    });
  }

  revalidatePath("/tasks/control");
  revalidatePath(`/tasks/${taskId}`);
  return { sent, throttled };
}
