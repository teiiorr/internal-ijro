import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconCalendarClock as CalendarClock, IconChevronDown as ChevronDown, IconArchive as Archive } from "@tabler/icons-react";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { getCouncilPage } from "@/server/queries/councils";
import { Card, CardContent } from "@/components/ui/card";
import { CouncilAgenda } from "@/components/councils/council-agenda";
import { CouncilMeetingForm } from "@/components/councils/council-meeting-form";
import { formatDateMaybeTime } from "@/lib/dates";

const KINDS = ["ekspert", "smeta"] as const;
type Kind = (typeof KINDS)[number];

export default async function CouncilPage({ params }: { params: Promise<{ kind: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  const t = await getTranslations();
  const locale = await getLocale();

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{heading}</h1>
        {kind === "smeta" && (
          <Link
            href={`/kengashlar/${kind}/arxiv`}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)] active:scale-95"
          >
            <Archive className="size-4 text-[var(--primary)]" />
            {t("kengash.archiveButton")}
          </Link>
        )}
      </div>

      {/* yaqinlaşayotgan yiğiliş + uning kun tartibi */}
      {upcoming ? (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-[var(--primary)]" />
              <span className="font-semibold">{upcoming.title || t("kengash.agenda")}</span>
              <span className="text-[var(--muted)]">· {formatDateMaybeTime(upcoming.scheduledAt, locale)}</span>
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

      {/* yangi yiğiliş belgilaş */}
      {canManage && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-3">
            <h3 className="text-base font-semibold">{t("kengash.createMeeting")}</h3>
            <CouncilMeetingForm kind={kind as Kind} />
          </CardContent>
        </Card>
      )}

      {/* arxiv — har bir ötgan yiğiliş öz kun tartibini körsatiş uchun ochiladi */}
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
                      <span className="shrink-0 text-xs text-[var(--muted)] sm:text-sm">{formatDateMaybeTime(m.scheduledAt, locale)}</span>
                      <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      {items.length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">{t("kengash.emptyAgenda")}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
                                <th className="w-8 py-2 pr-2 font-semibold">№</th>
                                <th className="py-2 pr-4 font-semibold">{t("kengash.topic")}</th>
                                <th className="py-2 pr-4 font-semibold">{t("kengash.project")}</th>
                                <th className="py-2 font-semibold">{t("kengash.presenter")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it, i) => (
                                <tr key={it.id} className="border-b border-[var(--border)] align-top last:border-0">
                                  <td className="py-2 pr-2 font-semibold tabular-nums text-[var(--muted)]">{i + 1}</td>
                                  <td className="py-2 pr-4 font-medium">{it.topic}</td>
                                  <td className="py-2 pr-4 text-[var(--muted)]">{it.projectName ?? "—"}</td>
                                  <td className="py-2 text-[var(--muted)]">{it.presenterName ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
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
