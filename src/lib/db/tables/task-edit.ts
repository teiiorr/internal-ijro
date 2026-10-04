import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tasks, users } from "@/lib/db/schema";

export const DEADLINE_REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type DeadlineRequestStatus = (typeof DEADLINE_REQUEST_STATUSES)[number];

/**
 * Deadline extension requests: an assignee asks the task creator to move the
 * deadline. At most one pending request per (task, requester), enforced by a
 * partial unique index. Migration: drizzle/_staff/task-edit.sql (part of 0031).
 */
export const taskDeadlineRequests = pgTable(
  "task_deadline_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    previousDeadline: timestamp("previous_deadline", { withTimezone: true }),
    requestedDeadline: timestamp("requested_deadline", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull().$type<DeadlineRequestStatus>(),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, { onDelete: "set null" }),
    decisionNote: text("decision_note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("task_deadline_requests_task_idx").on(t.taskId),
    index("task_deadline_requests_status_idx").on(t.status),
    uniqueIndex("task_deadline_requests_pending_uniq")
      .on(t.taskId, t.requestedByUserId)
      .where(sql`status = 'pending'`),
  ]
);

export type TaskDeadlineRequest = typeof taskDeadlineRequests.$inferSelect;
