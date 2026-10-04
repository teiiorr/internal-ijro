import { pgTable, uuid, varchar, text, integer, date, timestamp, index } from "drizzle-orm/pg-core";
// Relative import on purpose: this file is loaded by the standalone worker
// (scripts/jobs/council-resolutions.ts), which must not depend on the "@/" alias.
import { councilMeetings, councilAgendaItems, tasks, users } from "../schema";

/**
 * Kengash qarorlari ijrosi (staff: council-resolutions).
 *
 * Har bir Ekspert / Smeta majlisida qabul qilingan qaror bandi — raqamlangan matn,
 * masʼul xodim va ijro muddati. `status` faqat QOʻLDA belgilanadigan holat
 * (open | done | cancelled); topshiriqqa aylantirilgan bandning haqiqiy holati
 * bogʻlangan topshiriqdan hisoblanadi (src/lib/councils/resolution-status.ts).
 *
 * Jadval schema.ts ga qoʻshilmaydi va 0031 migratsiyasi bilan yaratiladi —
 * undan har bir oʻqish try/catch bilan himoyalangan.
 */
export const RESOLUTION_STATUSES = ["open", "done", "cancelled"] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

export const councilResolutions = pgTable(
  "council_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => councilMeetings.id, { onDelete: "cascade" }),
    agendaItemId: uuid("agenda_item_id").references(() => councilAgendaItems.id, { onDelete: "set null" }),
    number: integer("number").notNull(),
    text: text("text").notNull(),
    responsibleUserId: uuid("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Toshkent sanasi (YYYY-MM-DD). */
    dueDate: date("due_date"),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).default("open").notNull().$type<ResolutionStatus>(),
    closedNote: text("closed_note"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedByUserId: uuid("closed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reminderDueSentAt: timestamp("reminder_due_sent_at", { withTimezone: true }),
    reminderOverdueSentAt: timestamp("reminder_overdue_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("council_resolutions_meeting_idx").on(t.meetingId),
    index("council_resolutions_status_due_idx").on(t.status, t.dueDate),
    index("council_resolutions_task_idx").on(t.taskId),
    index("council_resolutions_resp_idx").on(t.responsibleUserId),
  ]
);

export type CouncilResolutionRow = typeof councilResolutions.$inferSelect;
