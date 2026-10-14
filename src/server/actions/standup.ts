"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { standupReports } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { todayTashkent } from "@/lib/my-work/buckets";
import { type ActionResult } from "@/lib/action-result";

/**
 * Bugungi kunlik hisobotni (standup) saqlaydi — user+sana boʻyicha upsert
 * (standup_user_date_uniq). Uch maydon ham boʻsh boʻlsa — rad etiladi.
 */
export async function submitStandup(input: {
  doneYesterday: string;
  plannedToday: string;
  blockers: string;
}): Promise<ActionResult> {
  const me = await requireUser();
  const date = todayTashkent();
  const values = {
    doneYesterday: input.doneYesterday.trim() || null,
    plannedToday: input.plannedToday.trim() || null,
    blockers: input.blockers.trim() || null,
  };
  if (!values.doneYesterday && !values.plannedToday && !values.blockers) {
    return { ok: false, error: "invalid" };
  }
  await db
    .insert(standupReports)
    .values({ userId: me.id, reportDate: date, ...values, submittedAt: new Date() })
    .onConflictDoUpdate({
      target: [standupReports.userId, standupReports.reportDate],
      set: { ...values, submittedAt: new Date() },
    });
  revalidatePath("/dashboard");
  revalidatePath("/reports/standup");
  return { ok: true };
}
