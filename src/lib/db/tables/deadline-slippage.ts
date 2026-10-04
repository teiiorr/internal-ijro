import { pgTable, uuid, varchar, text, timestamp, date, integer, index } from "drizzle-orm/pg-core";
import { projectStages, projects, stageRequests, users } from "@/lib/db/schema";

export const DEADLINE_CHANGE_SOURCES = ["manual", "edit", "studio_request", "backfill"] as const;
export type DeadlineChangeSource = (typeof DEADLINE_CHANGE_SOURCES)[number];

/**
 * Bosqich rejadagi muddatining (project_stages.planned_deadline) har bir oʻzgarishi:
 * eski → yangi sana, farq (kun), manba, ixtiyoriy sabab va muallif.
 * Yoziladi: setStageDeadline ('manual'), updateStage ('edit'), decideStageRequest ('studio_request').
 * Go-live'dan oldingi tarix activity_log'dan 'backfill' sifatida tiklanadi.
 * Migratsiya: drizzle/_staff/deadline-slippage.sql (0031 tarkibida).
 */
export const stageDeadlineChanges = pgTable(
  "stage_deadline_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => projectStages.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    oldDeadline: date("old_deadline"),
    newDeadline: date("new_deadline"),
    deltaDays: integer("delta_days"),
    source: varchar("source", { length: 20 }).notNull().$type<DeadlineChangeSource>(),
    stageRequestId: uuid("stage_request_id").references(() => stageRequests.id, { onDelete: "set null" }),
    reason: text("reason"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("stage_deadline_changes_project_idx").on(t.projectId, t.createdAt),
    index("stage_deadline_changes_stage_idx").on(t.stageId),
  ]
);

export type StageDeadlineChange = typeof stageDeadlineChanges.$inferSelect;
export type NewStageDeadlineChange = typeof stageDeadlineChanges.$inferInsert;
