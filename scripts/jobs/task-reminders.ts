import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { taskReminderLog } from "../../src/lib/db/tables/task-reminders";
import { deliverNotification, type DeliverArgs } from "../../src/lib/notifications/deliver";
import {
  addDays,
  assigneeReminderMessage,
  classifyAssigneeReminder,
  creatorEscalationKind,
  daysBetween,
  digestText,
  escalationMessage,
  parseLookbackDays,
  tashkentDateString,
  taskLinkFor,
  taskNotificationTitle,
  type ReminderKind,
} from "../../src/lib/tasks/reminder-core";

/**
 * Daily task pass (run once from scripts/worker.ts at 08:00 Tashkent).
 *
 *   A) Assignee reminders : due tomorrow / due today / overdue (once per deadline)
 *   B) Creator escalation : overdue day 1 and day 3 (how many assignees are late)
 *   C) Morning digest     : due today · overdue · awaiting my approval (once per day)
 *
 * Every send is guarded by an INSERT … ON CONFLICT DO NOTHING into task_reminder_log,
 * so running the worker twice on the same day sends nothing new. Each section is
 * wrapped in try/catch: before migration 0031 the log table is missing and the pass
 * just logs and reports zeros. Imports stay free of `server-only` / `@/` aliases.
 */

type Db = PostgresJsDatabase<typeof schema>;

export type TaskReminderResult = {
  dueTomorrow: number;
  dueToday: number;
  overdue: number;
  escalations: number;
  digests: number;
};

const OPEN_STATUSES = sql.raw(`('todo','in_progress','rejected')`);

/** Postgres "undefined_table" (42P01), possibly wrapped by drizzle's DrizzleQueryError. */
function isMissingRelation(e: unknown): boolean {
  const code = (x: unknown) => (x && typeof x === "object" && "code" in x ? (x as { code?: unknown }).code : undefined);
  return code(e) === "42P01" || code((e as { cause?: unknown } | null)?.cause) === "42P01";
}

/**
 * Inserts the dedupe row; returns its id when this is the first time, null when already
 * logged. A per-row failure (e.g. FK violation because the task/user was deleted after the
 * SELECT) skips just that row; a missing table (before 0031) aborts the whole section.
 */
async function claim(
  db: Db,
  row: { taskId: string | null; userId: string; kind: ReminderKind; deadlineDate: string | null; sentOn: string }
): Promise<string | null> {
  try {
    const inserted = await db
      .insert(taskReminderLog)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: taskReminderLog.id });
    return inserted[0]?.id ?? null;
  } catch (e) {
    if (isMissingRelation(e)) throw e;
    console.error(`task-reminders: could not log ${row.kind} for ${row.userId}`, e);
    return null;
  }
}

/** Delivers; on failure releases the claim so a later run can retry. Returns true when delivered. */
async function deliverClaimed(db: Db, claimId: string, args: DeliverArgs): Promise<boolean> {
  try {
    await deliverNotification(db, args);
    return true;
  } catch (e) {
    console.error(`task-reminders: delivery failed (${args.type} → ${args.userIds.join(",")})`, e);
    try {
      await db.delete(taskReminderLog).where(eq(taskReminderLog.id, claimId));
    } catch {
      // ignore — the reminder is simply skipped
    }
    return false;
  }
}

// postgres-js returns a RowList (array); normalise to a plain array.
function rowsOf<T>(res: unknown): T[] {
  return Array.isArray(res) ? (res as T[]) : [];
}

export async function runTaskReminders(db: Db, now = new Date()): Promise<TaskReminderResult> {
  const LOOKBACK = parseLookbackDays(process.env.WORKER_TASK_LOOKBACK_DAYS, 14);
  const today = tashkentDateString(now);
  const result: TaskReminderResult = { dueTomorrow: 0, dueToday: 0, overdue: 0, escalations: 0, digests: 0 };

  // ---------- A) Per-assignee reminders ----------
  try {
    const res = await db.execute(sql`
      SELECT
        t.id AS task_id,
        t.title AS title,
        t.registration_number AS reg,
        to_char((t.deadline AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS dl,
        ta.user_id AS user_id,
        u.position AS position
      FROM task_assignees ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN users u ON u.id = ta.user_id
      LEFT JOIN notification_settings ns ON ns.user_id = ta.user_id
      WHERE ta.status IN ${OPEN_STATUSES}
        AND t.status <> 'completed'
        AND t.deadline IS NOT NULL
        AND u.status = 'active'
        AND coalesce(ns.notify_task_deadline, true)
        AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date
            BETWEEN ${today}::date - ${LOOKBACK}::int AND ${today}::date + 1
      ORDER BY t.deadline ASC
    `);
    const rows = rowsOf<{
      task_id: string;
      title: string;
      reg: string | null;
      dl: string;
      user_id: string;
      position: string | null;
    }>(res);

    for (const r of rows) {
      const kind = classifyAssigneeReminder(r.dl, today, LOOKBACK);
      if (!kind) continue;
      const claimId = await claim(db, { taskId: r.task_id, userId: r.user_id, kind, deadlineDate: r.dl, sentOn: today });
      if (!claimId) continue;
      const ok = await deliverClaimed(db, claimId, {
        userIds: [r.user_id],
        type: kind === "overdue_assignee" ? "task.overdue" : "task.due_soon",
        title: taskNotificationTitle(r.reg, r.title),
        message: assigneeReminderMessage(kind),
        link: taskLinkFor(r.position, r.task_id),
        entityType: "task",
        entityId: r.task_id,
      });
      if (!ok) continue;
      if (kind === "due_tomorrow") result.dueTomorrow++;
      else if (kind === "due_today") result.dueToday++;
      else result.overdue++;
    }
  } catch (e) {
    console.error("task-reminders: assignee pass skipped", e);
  }

  // ---------- B) Creator escalation (overdue day 1 / day 3) ----------
  try {
    const earliest = addDays(today, -LOOKBACK);
    const res = await db.execute(sql`
      SELECT
        t.id AS task_id,
        t.title AS title,
        t.registration_number AS reg,
        to_char((t.deadline AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS dl,
        t.created_by_user_id AS creator_id,
        count(*)::int AS total,
        count(*) FILTER (WHERE ta.status IN ${OPEN_STATUSES})::int AS late,
        count(*) FILTER (WHERE ta.status IN ${OPEN_STATUSES} AND ta.user_id <> t.created_by_user_id)::int AS late_others
      FROM tasks t
      JOIN task_assignees ta ON ta.task_id = t.id
      JOIN users c ON c.id = t.created_by_user_id
      LEFT JOIN notification_settings ns ON ns.user_id = t.created_by_user_id
      WHERE t.status <> 'completed'
        AND t.deadline IS NOT NULL
        AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date < ${today}::date
        AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date >= ${earliest}::date
        AND c.status = 'active'
        AND c.position <> 'kontragent'
        AND coalesce(ns.notify_task_deadline, true)
      GROUP BY t.id, t.title, t.registration_number, t.deadline, t.created_by_user_id
      HAVING count(*) FILTER (WHERE ta.status IN ${OPEN_STATUSES}) > 0
      ORDER BY t.deadline ASC
    `);
    const rows = rowsOf<{
      task_id: string;
      title: string;
      reg: string | null;
      dl: string;
      creator_id: string;
      total: number;
      late: number;
      late_others: number;
    }>(res);

    for (const r of rows) {
      // The creator is the only one late on their own task — nobody to chase.
      if (Number(r.late_others) === 0) continue;
      const kind = creatorEscalationKind(daysBetween(r.dl, today));
      if (!kind) continue;
      const claimId = await claim(db, { taskId: r.task_id, userId: r.creator_id, kind, deadlineDate: r.dl, sentOn: today });
      if (!claimId) continue;
      const ok = await deliverClaimed(db, claimId, {
        userIds: [r.creator_id],
        type: "task.overdue_escalation",
        title: taskNotificationTitle(r.reg, r.title),
        message: escalationMessage(Number(r.total), Number(r.late)),
        link: `/tasks/${r.task_id}`,
        entityType: "task",
        entityId: r.task_id,
      });
      if (ok) result.escalations++;
    }
  } catch (e) {
    console.error("task-reminders: escalation pass skipped", e);
  }

  // ---------- C) Morning digest (internal users only) ----------
  try {
    const res = await db.execute(sql`
      WITH mine AS (
        SELECT
          ta.user_id,
          count(*) FILTER (WHERE (t.deadline AT TIME ZONE 'Asia/Tashkent')::date = ${today}::date)::int AS due_today,
          count(*) FILTER (WHERE (t.deadline AT TIME ZONE 'Asia/Tashkent')::date < ${today}::date)::int AS overdue
        FROM task_assignees ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE ta.status IN ${OPEN_STATUSES}
          AND t.status <> 'completed'
          AND t.deadline IS NOT NULL
        GROUP BY ta.user_id
      ),
      review AS (
        SELECT t.created_by_user_id AS user_id, count(*)::int AS awaiting
        FROM task_assignees ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE ta.status = 'under_review'
        GROUP BY t.created_by_user_id
      )
      SELECT
        u.id AS user_id,
        coalesce(m.due_today, 0)::int AS due_today,
        coalesce(m.overdue, 0)::int AS overdue,
        coalesce(r.awaiting, 0)::int AS awaiting
      FROM users u
      LEFT JOIN notification_settings ns ON ns.user_id = u.id
      LEFT JOIN mine m ON m.user_id = u.id
      LEFT JOIN review r ON r.user_id = u.id
      WHERE u.status = 'active'
        AND u.position <> 'kontragent'
        AND coalesce(ns.notify_task_deadline, true)
        AND coalesce(m.due_today, 0) + coalesce(m.overdue, 0) + coalesce(r.awaiting, 0) > 0
    `);
    const rows = rowsOf<{ user_id: string; due_today: number; overdue: number; awaiting: number }>(res);

    for (const r of rows) {
      const text = digestText({
        dueToday: Number(r.due_today),
        overdue: Number(r.overdue),
        awaitingApproval: Number(r.awaiting),
      });
      if (!text) continue;
      const claimId = await claim(db, { taskId: null, userId: r.user_id, kind: "digest", deadlineDate: null, sentOn: today });
      if (!claimId) continue;
      const ok = await deliverClaimed(db, claimId, {
        userIds: [r.user_id],
        type: "task.digest",
        title: text.title,
        message: text.message,
        link: "/my-work",
      });
      if (ok) result.digests++;
    }
  } catch (e) {
    console.error("task-reminders: digest pass skipped", e);
  }

  return result;
}
