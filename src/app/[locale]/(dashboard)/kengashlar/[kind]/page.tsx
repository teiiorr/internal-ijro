import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconCalendarClock as CalendarClock, IconChevronDown as ChevronDown, IconArchive as Archive, IconChecklist as Checklist } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getCouncilPage } from "@/server/queries/councils";
import { Card, CardContent } from "@/components/ui/card";
import { CouncilAgenda } from "@/components/councils/council-agenda";
import { CouncilMeetingForm } from "@/components/councils/council-meeting-form";
import { formatDateMaybeTime } from "@/lib/dates";
import { listAssignableUsers } from "@/server/queries/tasks";
import { isResolutionEditor, listOpenResolutions, listResolutionsForMeetings } from "@/server/queries/council-resolutions";
import { OpenResolutionsCarryover } from "@/components/staff/council-resolutions/open-resolutions-carryover";
import { ResolutionsEditor } from "@/components/staff/council-resolutions/resolutions-editor";
import { isStaffPosition } from "@/lib/councils/resolution-status";
import { can } from "@/lib/permissions/capabilities";

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

  const [{ upcoming, agenda, meetings, agendaByMeeting }, projectOpts] = await Promise.all([
    getCouncilPage(kind),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  const heading = kind === "ekspert" ? t("kengash.ekspertHeading") : t("kengash.smetaHeading");
  const pastMeetings = meetings.filter((m) => !upcoming || m.id !== upcoming.id);

  // Kengash qarorlari ijrosi — staff only; every read is guarded (empty before migration 0031).
  const showResolutions = isStaffPosition(me.position);
  const resolutionData = showResolutions
    ? await Promise.all([
        listResolutionsForMeetings([upcoming?.id, ...pastMeetings.map((m) => m.id)]),
        upcoming ? listOpenResolutions(kind, upcoming.id) : Promise.resolve([]),
        listAssignableUsers(me.id, me.position, me.departmentId),
        isResolutionEditor({ id: me.id, email: me.email ?? "", position: me.position }),
      ])
    : null;
  const resolutionsByMeeting = resolutionData?.[0] ?? {};
  const openResolutions = resolutionData?.[1] ?? [];
  // Responsible-person picker: staff only (hr cannot open /kengashlar/ijro).
  const people = (resolutionData?.[2] ?? []).filter((p) => isStaffPosition(p.position));
  // Same rule as canEditResolutions(me, meeting.createdByUserId), evaluated once for all meetings.
  const canEditResolutionsOf = (creatorId: string | null) => !!resolutionData && (resolutionData[3] || creatorId === me.id);
  const canAssign = can(me.position, "tasks.assign");
  const meRef = { id: me.id, position: me.position };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{heading}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {showResolutions && (
            <Link
              href={`/${locale}/kengashlar/ijro`}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)] active:scale-95"
            >
              <Checklist className="size-4 text-[var(--primary)]" />
              {t("staffX.councilResolutions.open")}
            </Link>
          )}
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
            {openResolutions.length > 0 && canEditResolutionsOf(upcoming.createdByUserId) && (
              <OpenResolutionsCarryover meetingId={upcoming.id} rows={openResolutions} agendaTopics={agenda.map((a) => a.topic)} />
            )}
            <CouncilAgenda
              meetingId={upcoming.id}
              items={agenda}
              projects={projectOpts}
              canManage={canManage}
            />
            {showResolutions && (
              <ResolutionsEditor
                meetingId={upcoming.id}
                kind={kind}
                rows={resolutionsByMeeting[upcoming.id] ?? []}
                agendaItems={agenda.map((a) => ({ id: a.id, topic: a.topic }))}
                people={canEditResolutionsOf(upcoming.createdByUserId) ? people : []}
                canEdit={canEditResolutionsOf(upcoming.createdByUserId)}
                canAssign={canAssign}
                me={meRef}
              />
            )}
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
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="text-left text-xs font-semibold text-[var(--muted)]">
                                <th className="w-8 border border-[var(--border)] px-2 py-2 font-semibold">№</th>
                                <th className="border border-[var(--border)] px-3 py-2 font-semibold">{t("kengash.topic")}</th>
                                <th className="border border-[var(--border)] px-3 py-2 font-semibold">{t("kengash.project")}</th>
                                <th className="border border-[var(--border)] px-3 py-2 font-semibold">{t("kengash.studio")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it, i) => (
                                <tr key={it.id} className="align-top">
                                  <td className="border border-[var(--border)] px-2 py-2 font-semibold tabular-nums text-[var(--muted)]">{i + 1}</td>
                                  <td className="border border-[var(--border)] px-3 py-2 font-medium">{it.topic}</td>
                                  <td className="border border-[var(--border)] px-3 py-2 text-[var(--muted)]">{it.projectName ?? "—"}</td>
                                  <td className="border border-[var(--border)] px-3 py-2 text-[var(--muted)]">{it.studioName ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {showResolutions && (
                        <div className="mt-4">
                          <ResolutionsEditor
                            compact
                            meetingId={m.id}
                            kind={kind}
                            rows={resolutionsByMeeting[m.id] ?? []}
                            agendaItems={items.map((it) => ({ id: it.id, topic: it.topic }))}
                            people={canEditResolutionsOf(m.createdByUserId) ? people : []}
                            canEdit={canEditResolutionsOf(m.createdByUserId)}
                            canAssign={canAssign}
                            me={meRef}
                          />
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
