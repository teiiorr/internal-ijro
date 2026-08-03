import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { IconCalendarClock as CalendarClock, IconChevronDown as ChevronDown } from "@tabler/icons-react";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { getCouncilPage } from "@/server/queries/councils";
import { Card, CardContent } from "@/components/ui/card";
import { CouncilAgenda } from "@/components/councils/council-agenda";
import { CouncilMeetingForm } from "@/components/councils/council-meeting-form";
import { formatDate } from "@/lib/dates";

const KINDS = ["ekspert", "smeta"] as const;
type Kind = (typeof KINDS)[number];

function dateTime(d: Date | string): string {
  // Toshkent vaqti (UTC+5) — server UTC'da ishlaydi.
  const date = new Date(new Date(d).getTime() + 5 * 60 * 60 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(d)} · ${hh}:${mm}`;
}

export default async function CouncilPage({ params }: { params: Promise<{ kind: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  const t = await getTranslations();

  const me = session.user;
  const canManage = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"].includes(me.position);

  const [{ upcoming, agenda, meetings, agendaByMeeting }, projectOpts, employeeOpts] = await Promise.all([
    getCouncilPage(kind),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db
      .select({ id: users.id, name: users.fullName })
      .from(users)
      .where(sql`${users.status}='active' AND ${users.position} <> 'kontragent'`)
      .orderBy(users.fullName),
  ]);

  const heading = kind === "ekspert" ? t("kengash.ekspertHeading") : t("kengash.smetaHeading");
  const pastMeetings = meetings.filter((m) => !upcoming || m.id !== upcoming.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{heading}</h1>

      {/* upcoming meeting + its agenda */}
      {upcoming ? (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-[var(--primary)]" />
              <span className="font-semibold">{upcoming.title || t("kengash.agenda")}</span>
              <span className="text-[var(--muted)]">· {dateTime(upcoming.scheduledAt)}</span>
            </div>
            <CouncilAgenda
              meetingId={upcoming.id}
              items={agenda}
              projects={projectOpts}
              employees={employeeOpts}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--muted)]">{t("kengash.noUpcoming")}</CardContent>
        </Card>
      )}

      {/* schedule a new meeting */}
      {canManage && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-3">
            <h3 className="text-base font-semibold">{t("kengash.createMeeting")}</h3>
            <CouncilMeetingForm kind={kind as Kind} />
          </CardContent>
        </Card>
      )}

      {/* archive — each past meeting expands to show its own agenda (kun tartibi) */}
      {pastMeetings.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-3">
            <h3 className="text-base font-semibold">{t("kengash.history")}</h3>
            <div className="space-y-2">
              {pastMeetings.map((m) => {
                const items = agendaByMeeting[m.id] ?? [];
                return (
                  <details key={m.id} className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:px-4 sm:py-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm sm:gap-3 [&::-webkit-details-marker]:hidden">
                      <CalendarClock className="size-4 shrink-0 text-[var(--subtle)]" />
                      <span className="min-w-0 flex-1 truncate font-medium">{m.title || t("kengash.agenda")}</span>
                      <span className="shrink-0 text-xs text-[var(--muted)] sm:text-sm">{dateTime(m.scheduledAt)}</span>
                      <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-sm">
                      {items.length === 0 ? (
                        <li className="text-[var(--muted)]">{t("kengash.emptyAgenda")}</li>
                      ) : (
                        items.map((it, i) => (
                          <li key={it.id} className="flex gap-2">
                            <span className="shrink-0 font-semibold tabular-nums text-[var(--muted)]">{i + 1}.</span>
                            <span className="min-w-0">
                              {it.topic}
                              {it.projectName ? <span className="text-[var(--muted)]"> — {it.projectName}</span> : null}
                              {it.presenterName ? <span className="text-[var(--muted)]"> ({it.presenterName})</span> : null}
                            </span>
                          </li>
                        ))
                      )}
                    </ol>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
