"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { standupReports } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";

const schema = z.object({
  doneYesterday: z.string().max(2000).nullable().optional(),
  plannedToday: z.string().max(2000).nullable().optional(),
  blockers: z.string().max(2000).nullable().optional(),
});

export async function submitStandup(formData: FormData) {
  const me = await requireUser();
  const parsed = schema.parse({
    doneYesterday: (formData.get("doneYesterday") as string) || null,
    plannedToday: (formData.get("plannedToday") as string) || null,
    blockers: (formData.get("blockers") as string) || null,
  });
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  const existing = await db
    .select()
    .from(standupReports)
    .where(and(eq(standupReports.userId, me.id), eq(standupReports.reportDate, dateStr)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(standupReports)
      .set({ ...parsed, submittedAt: new Date() })
      .where(eq(standupReports.id, existing[0].id));
  } else {
    await db.insert(standupReports).values({
      userId: me.id,
      reportDate: dateStr,
      doneYesterday: parsed.doneYesterday ?? null,
      plannedToday: parsed.plannedToday ?? null,
      blockers: parsed.blockers ?? null,
    });
  }
  await logActivity({ userId: me.id, action: "standup.submitted", entityType: "standup_report" });
  revalidatePath("/reports/standup");
}
