import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconCalendarClock as CalendarClock, IconChevronDown as ChevronDown } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { EmptyState } from "@/components/empty-state";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getCouncilPage } from "@/server/queries/councils";
import { CouncilAgenda } from "@/components/councils/council-agenda";
import { CouncilMeetingDialog } from "@/components/councils/council-meeting-dialog";
import { CouncilTabs } from "@/components/councils/council-tabs";
import { SmetaProjects } from "@/components/councils/smeta-projects";
import { SmetaDocs } from "@/components/councils/smeta-docs";
import { listSmetaCommissionProjects } from "@/server/queries/smeta-commission";
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

  // Smeta komissiyasida "Majlis qoʻshish" oʻrniga komissiyaga oʻtgan loyihalar roʻyxati yuritiladi.
  const isSmeta = kind === "smeta";
  const [{ upcoming, agenda, meetings, agendaByMeeting }, projectOpts, smetaList] = await Promise.all([
    getCouncilPage(kind),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    isSmeta ? listSmetaCommissionProjects() : Promise.resolve(null),
  ]);

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
    <div className="flex flex-col gap-8 lg:gap-12">
      <PageHeader
        title={t("nav.group.councils")}
        tools={<CouncilTabs active={kind as Kind} showIjro={showResolutions} />}
        actions={!isSmeta && canManage ? <CouncilMeetingDialog kind="ekspert" /> : undefined}
      />

      {smetaList && (
        <SmetaProjects items={smetaList.items} projects={projectOpts} canManage={canManage} ready={smetaList.ready} />
      )}

      {/* Smeta komissiyasi sonlari arxivi: qadab qoʻyilgan sonlar, bosilganda fayllari ochiladi. */}
      {isSmeta && <SmetaDocs />}

      {/* Yaqinlashayotgan majlis va uning kun tartibi (Smeta'da faqat mavjud boʻlsa) */}
      {upcoming ? (
        <Section
          title={upcoming.title || t("kengash.agenda")}
          meta={formatDateMaybeTime(upcoming.scheduledAt, locale)}
        >
          <div className="flex flex-col gap-4">
            {openResolutions.length > 0 && canEditResolutionsOf(upcoming.createdByUserId) && (
              <OpenResolutionsCarryover meetingId={upcoming.id} rows={openResolutions} agendaTopics={agenda.map((a) => a.topic)} />
            )}
            <Card solid>
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
            </Card>
          </div>
        </Section>
      ) : (
        !isSmeta && (
          <Card solid bare>
            <EmptyState icon={CalendarClock} title={t("kengash.noUpcoming")} />
          </Card>
        )
      )}

      {/* Arxiv — har bir oʻtgan majlis oʻz kun tartibini koʻrsatish uchun ochiladi */}
      {pastMeetings.length > 0 && (
        <Section title={t("kengash.history")} meta={pastMeetings.length}>
          <Card solid bare className="px-5 sm:px-6">
            <ul className="divide-y divide-[var(--line)]">
              {pastMeetings.map((m) => {
                const items = agendaByMeeting[m.id] ?? [];
                return (
                  <li key={m.id}>
                    <details className="group -mx-5 px-5 py-1 sm:-mx-6 sm:px-6">
                      <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                        <CalendarClock className="size-4 shrink-0 text-[var(--ink-3)]" />
                        <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">{m.title || t("kengash.agenda")}</span>
                        <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{formatDateMaybeTime(m.scheduledAt, locale)}</span>
                        <ChevronDown className="size-4 shrink-0 text-[var(--ink-3)] transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="pb-4 pt-1">
                        {items.length === 0 ? (
                          <p className="t-small text-[var(--ink-3)]">{t("kengash.emptyAgenda")}</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--line)] text-left t-micro text-[var(--ink-3)]">
                                  <th className="w-8 py-2 pr-3 font-semibold">№</th>
                                  <th className="py-2 pr-3 font-semibold">{t("kengash.topic")}</th>
                                  <th className="py-2 pr-3 font-semibold">{t("kengash.project")}</th>
                                  <th className="py-2 pr-3 font-semibold">{t("kengash.studio")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--line)]">
                                {items.map((it, i) => (
                                  <tr key={it.id} className="align-top">
                                    <td className="py-2 pr-3 font-semibold tabular-nums text-[var(--ink-3)]">{i + 1}</td>
                                    <td className="py-2 pr-3 font-medium text-[var(--ink)]">{it.topic}</td>
                                    <td className="py-2 pr-3 text-[var(--ink-2)]">{it.projectName ?? "—"}</td>
                                    <td className="py-2 pr-3 text-[var(--ink-2)]">{it.studioName ?? "—"}</td>
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
                  </li>
                );
              })}
            </ul>
          </Card>
        </Section>
      )}
    </div>
  );
}
