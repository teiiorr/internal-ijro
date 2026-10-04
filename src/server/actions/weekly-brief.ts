"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { weeklySnapshots } from "@/lib/db/tables/weekly-brief";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { isOwner } from "@/lib/permissions/owner";
import { ensureSnapshot } from "@/lib/reports/weekly-snapshot";
import {
  canEditWeeklySummary,
  isIsoDay,
  lastCompletedWeekStart,
  parseWeekParam,
  SUMMARY_MAX_LENGTH,
  weekStartOf,
} from "@/lib/reports/weekly-brief-core";

const summarySchema = z.object({
  weekStart: z
    .string()
    .refine((v) => isIsoDay(v) && weekStartOf(v) === v, "invalid_week"),
  note: z.string().max(SUMMARY_MAX_LENGTH),
});

/**
 * "Hafta xulosasi"ni saqlaydi (direktor, oʻrinbosar yoki platforma egasi).
 * Faqat TUGAGAN haftaga yoziladi: joriy hafta uchun snapshot yaratilsa, dushanba
 * worker'i uni toʻliq koʻrsatkichlar bilan qayta yoza olmas edi (ON CONFLICT DO NOTHING).
 */
export async function saveWeeklySummary(input: { weekStart: string; note: string }): Promise<{ ok: true }> {
  const me = await requireUser();
  if (!canEditWeeklySummary(me.position, isOwner(me.email))) throw new Error("forbidden");
  const { weekStart, note } = summarySchema.parse(input);
  if (weekStart > lastCompletedWeekStart()) throw new Error("week_not_finished");
  // Sahifadagi ?week= bilan bir xil chegaralar (juda eski / maʼnosiz sanalar uchun snapshot yaratilmaydi).
  if (parseWeekParam(weekStart) !== weekStart) throw new Error("invalid_week");

  await ensureSnapshot(db, weekStart);
  const text = note.trim();
  const [row] = await db
    .update(weeklySnapshots)
    .set({ summaryNote: text || null, summaryByUserId: me.id, summaryUpdatedAt: new Date() })
    .where(eq(weeklySnapshots.weekStart, weekStart))
    .returning({ id: weeklySnapshots.id });
  if (!row) throw new Error("not_found");

  await logActivity({
    userId: me.id,
    action: "report.weekly_summary_set",
    entityType: "weekly_snapshot",
    entityId: row.id,
    newValue: { weekStart },
  });
  revalidatePath("/reports/weekly");
  return { ok: true };
}
