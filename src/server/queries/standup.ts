import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { standupReports, users } from "@/lib/db/schema";
import { todayTashkent } from "@/lib/my-work/buckets";

export type MyStandup = {
  doneYesterday: string;
  plannedToday: string;
  blockers: string;
  submitted: boolean;
};

/** Foydalanuvchining berilgan kundagi (standart — bugun, Toshkent) kunlik hisoboti. */
export async function getMyStandup(userId: string, date: string = todayTashkent()): Promise<MyStandup> {
  const [row] = await db
    .select()
    .from(standupReports)
    .where(and(eq(standupReports.userId, userId), eq(standupReports.reportDate, date)))
    .limit(1);
  return {
    doneYesterday: row?.doneYesterday ?? "",
    plannedToday: row?.plannedToday ?? "",
    blockers: row?.blockers ?? "",
    submitted: !!row,
  };
}

export type TeamStandupRow = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  doneYesterday: string | null;
  plannedToday: string | null;
  blockers: string | null;
  submittedAt: Date | null;
};

/**
 * Berilgan kundagi butun jamoaning hisobotlari (rahbarlar uchun): kim topshirdi,
 * kimda toʻsiq bor, kim hali topshirmagan. Topshirganlar yuqorida.
 */
export async function getTeamStandups(date: string = todayTashkent()): Promise<TeamStandupRow[]> {
  return db
    .select({
      userId: users.id,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      doneYesterday: standupReports.doneYesterday,
      plannedToday: standupReports.plannedToday,
      blockers: standupReports.blockers,
      submittedAt: standupReports.submittedAt,
    })
    .from(users)
    .leftJoin(
      standupReports,
      and(eq(standupReports.userId, users.id), eq(standupReports.reportDate, date)),
    )
    .where(and(eq(users.status, "active"), eq(users.hidden, false), ne(users.position, "kontragent")))
    .orderBy(desc(standupReports.submittedAt), users.fullName);
}
