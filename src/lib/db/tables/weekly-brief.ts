import { pgTable, uuid, date, jsonb, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
// Relative imports on purpose: this file is loaded by the standalone worker
// (scripts/jobs/weekly-snapshot.ts), which must not depend on the "@/" alias.
import { users } from "../schema";
import type { WeeklyMetrics } from "../../reports/weekly-brief-core";

/**
 * Haftalik rahbar brifingi (staff: weekly-brief).
 *
 * Har bir tugagan hafta uchun bitta qator: dushanba 08:00 dagi worker oʻtgan haftaning
 * koʻrsatkichlarini (`metrics`) muzlatib qoʻyadi, direktor / oʻrinbosar esa shu haftaga
 * "Hafta xulosasi" yozadi. `notified_at` — rahbarlarga "brifing tayyor" xabari bir marta
 * yuborilishining kafolati.
 *
 * Jadval schema.ts ga qoʻshilmaydi va 0031 migratsiyasi bilan yaratiladi
 * (drizzle/_staff/weekly-brief.sql) — undan har bir oʻqish try/catch bilan himoyalangan.
 */
export const weeklySnapshots = pgTable(
  "weekly_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Hafta dushanbasi (Toshkent sanasi, YYYY-MM-DD). */
    weekStart: date("week_start").notNull(),
    /** `estimated: true` — keyingi dushanbadan boshqa kunda yaratilgan (taxminiy) snapshot. */
    metrics: jsonb("metrics").notNull().$type<WeeklyMetrics & { estimated?: true }>(),
    summaryNote: text("summary_note"),
    summaryByUserId: uuid("summary_by_user_id").references(() => users.id, { onDelete: "set null" }),
    summaryUpdatedAt: timestamp("summary_updated_at", { withTimezone: true }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("weekly_snapshots_week_uniq").on(t.weekStart)]
);

export type WeeklySnapshotRow = typeof weeklySnapshots.$inferSelect;
