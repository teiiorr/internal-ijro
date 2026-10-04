import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { tasks, users } from "@/lib/db/schema";

/**
 * "Eslatish" (nudge) log for the task-control board.
 *
 * One row per nudge sent by a task giver to an assignee. Used both to show
 * "N marta eslatildi" counters and to throttle nudges to one per
 * (task, assignee) per 24 hours (enforced server-side in nudgeAssignees).
 */
export const taskNudges = pgTable(
  "task_nudges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "set null" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: varchar("message", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("task_nudges_task_to_idx").on(t.taskId, t.toUserId, t.createdAt)]
);

export type TaskNudgeRow = typeof taskNudges.$inferSelect;
