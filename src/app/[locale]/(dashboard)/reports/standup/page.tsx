import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { standupReports, users } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { submitStandup } from "@/server/actions/standup";

export default async function StandupPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = session.user;
  const today = new Date().toISOString().slice(0, 10);

  const todayRow = await db
    .select()
    .from(standupReports)
    .where(and(eq(standupReports.userId, me.id), eq(standupReports.reportDate, today)))
    .limit(1);
  const myHistory = await db
    .select()
    .from(standupReports)
    .where(eq(standupReports.userId, me.id))
    .orderBy(desc(standupReports.reportDate))
    .limit(20);

  // Manager: subordinates' recent reports
  let subordinateReports: { userId: string; fullName: string; reportDate: string; doneYesterday: string | null; plannedToday: string | null; blockers: string | null }[] = [];
  if (["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis"].includes(me.position)) {
    const subordinates = ["direktor", "orinbosar"].includes(me.position)
      ? await db.select({ id: users.id }).from(users)
      : await db.select({ id: users.id }).from(users).where(sql`${users.reportsToUserId} = ${me.id}`);
    const ids = subordinates.map((u) => u.id);
    if (ids.length > 0) {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      subordinateReports = await db
        .select({
          userId: standupReports.userId,
          fullName: users.fullName,
          reportDate: standupReports.reportDate,
          doneYesterday: standupReports.doneYesterday,
          plannedToday: standupReports.plannedToday,
          blockers: standupReports.blockers,
        })
        .from(standupReports)
        .innerJoin(users, eq(users.id, standupReports.userId))
        .where(and(inArray(standupReports.userId, ids), gte(standupReports.reportDate, since)))
        .orderBy(desc(standupReports.reportDate));
    }
  }

  const cur = todayRow[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Daily standup</h1>

      <Card>
        <CardHeader><CardTitle>Today ({today})</CardTitle></CardHeader>
        <CardContent>
          <form action={submitStandup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doneYesterday">What I did yesterday</Label>
              <Textarea id="doneYesterday" name="doneYesterday" rows={3} defaultValue={cur?.doneYesterday ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plannedToday">What I plan to do today</Label>
              <Textarea id="plannedToday" name="plannedToday" rows={3} defaultValue={cur?.plannedToday ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blockers">Blockers</Label>
              <Textarea id="blockers" name="blockers" rows={2} defaultValue={cur?.blockers ?? ""} />
            </div>
            <Button type="submit">{cur ? "Update" : "Submit"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My history</CardTitle></CardHeader>
        <CardContent>
          {myHistory.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No history yet.</p>
          ) : (
            <ul className="space-y-3">
              {myHistory.map((r) => (
                <li key={r.id} className="border rounded-lg p-3 text-sm">
                  <p className="text-xs text-[var(--muted)] mb-1">{r.reportDate}</p>
                  {r.doneYesterday && <p><span className="text-[var(--muted)]">Done:</span> {r.doneYesterday}</p>}
                  {r.plannedToday && <p><span className="text-[var(--muted)]">Plan:</span> {r.plannedToday}</p>}
                  {r.blockers && <p><span className="text-[var(--danger)]">Blockers:</span> {r.blockers}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {subordinateReports.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Team reports (14d)</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {subordinateReports.map((r, i) => (
                <li key={`${r.userId}-${r.reportDate}-${i}`} className="border rounded-lg p-3 text-sm">
                  <p className="text-xs text-[var(--muted)] mb-1">{r.fullName} — {r.reportDate}</p>
                  {r.doneYesterday && <p><span className="text-[var(--muted)]">Done:</span> {r.doneYesterday}</p>}
                  {r.plannedToday && <p><span className="text-[var(--muted)]">Plan:</span> {r.plannedToday}</p>}
                  {r.blockers && <p><span className="text-[var(--danger)]">Blockers:</span> {r.blockers}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
