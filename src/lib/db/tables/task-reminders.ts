import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, date, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
// Relative import on purpose: this file is loaded by the standalone worker (scripts/jobs/task-reminders.ts).
import { tasks, users } from "../schema";
import type { ReminderKind } from "../../tasks/reminder-core";

/**
 * Dedupe log for the daily task-reminder pass.
 *
 * - Per-task reminders: one row per (task, user, kind, deadline_date). Because the
 *   deadline date is part of the key, moving a task's deadline re-arms reminders.
 * - Morning digest: task_id NULL, kind 'digest', one row per (user, sent_on).
 */
export const taskReminderLog = pgTable(
  "task_reminder_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull().$type<ReminderKind>(),
    /** Tashkent deadline date the reminder was about (NULL for the digest). */
    deadlineDate: date("deadline_date"),
    /** Tashkent date of the worker run. */
    sentOn: date("sent_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("task_reminder_log_task_uniq")
      .on(t.taskId, t.userId, t.kind, t.deadlineDate)
      .where(sql`task_id IS NOT NULL`),
    uniqueIndex("task_reminder_log_digest_uniq").on(t.userId, t.sentOn).where(sql`kind = 'digest'`),
    index("task_reminder_log_sent_idx").on(t.sentOn),
  ]
);

export type TaskReminderLogRow = typeof taskReminderLog.$inferSelect;
