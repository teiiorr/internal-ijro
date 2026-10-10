import { useTranslations } from "next-intl";
import {
  IconCircleCheck as CircleCheck,
  IconAlarm as Alarm,
  IconArrowsShuffle as ArrowsShuffle,
  IconCash as Cash,
  IconSparkles as Sparkles,
  IconMessageCircle as MessageCircle,
} from "@tabler/icons-react";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { formatInt, numericDay, shortDay } from "@/lib/reports/weekly-brief-core";
import type { WeeklyEvents } from "@/server/queries/weekly-brief";
import { BriefGroup, BriefRow } from "./brief-group";

/**
 * "Bu hafta nima boʻldi" — vaqt belgilaridan hisoblangan hodisalar (har qanday oʻtgan hafta
 * uchun, snapshot'siz ham toʻgʻri): yakunlangan bosqichlar, muddati oʻtgan bosqichlar,
 * muddat oʻzgarishlari, toʻlovlar, yangi loyihalar va studiya soʻrovlari. BIIB: bitta
 * seksiya, oyna karta, ajratuvchi qatorlar (butun qator — havola), ramkasiz guruhlar.
 */
export function WeekEvents({ events, locale }: { events: WeeklyEvents; locale: string }) {
  const t = useTranslations("staffX.weeklyBrief");
  const more = (count: number) => t("more", { count });
  const { completedStages, crossedDeadline, deadlineMoves, payments, newProjects, studioRequests } = events;

  const empty =
    completedStages.length +
      crossedDeadline.length +
      deadlineMoves.length +
      payments.length +
      newProjects.length +
      studioRequests.opened +
      studioRequests.decided ===
    0;

  const stageHref = (projectId: string, stageId: string) => `/projects/${projectId}/stages/${stageId}`;

  return (
    <Section title={t("whatHappened")} headingLevel={3}>
      <Card bare className="px-5 sm:px-6">
        {empty ? (
          <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("empty")}</p>
        ) : (
          <div className="flex min-w-0 flex-col gap-6 py-1">
            {(studioRequests.opened > 0 || studioRequests.decided > 0) && (
              <Rows>
                <Row href="/contractors/requests">
                  <MessageCircle className="size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
                  <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-[var(--ink)]">
                    {t("studioRequests", { opened: studioRequests.opened, decided: studioRequests.decided })}
                  </span>
                </Row>
              </Rows>
            )}

            {completedStages.length > 0 && (
              <BriefGroup
                title={t("completedStages")}
                icon={<CircleCheck className="size-4" />}
                tone="success"
                items={completedStages}
                getKey={(s) => `${s.stageId}-${s.at.getTime()}`}
                moreLabel={more}
                render={(s) => (
                  <Row href={stageHref(s.projectId, s.stageId)}>
                    <BriefRow
                      primary={s.projectName}
                      secondary={s.stageName}
                      meta={<span title={formatDateTime(s.at, locale)}>{shortDay(s.at)}</span>}
                    />
                  </Row>
                )}
              />
            )}

            {crossedDeadline.length > 0 && (
              <BriefGroup
                title={t("crossedDeadline")}
                icon={<Alarm className="size-4" />}
                tone="danger"
                items={crossedDeadline}
                getKey={(s) => s.stageId}
                moreLabel={more}
                render={(s) => (
                  <Row href={stageHref(s.projectId, s.stageId)}>
                    <BriefRow
                      primary={s.projectName}
                      secondary={s.stageName}
                      meta={
                        <span className="flex items-center justify-end gap-2">
                          <span>{shortDay(s.deadline)}</span>
                          <Status tone={s.stillOpen ? "danger" : "warning"}>
                            {s.stillOpen ? t("stillOpen") : t("completedLate")}
                          </Status>
                        </span>
                      }
                    />
                  </Row>
                )}
              />
            )}

            {deadlineMoves.length > 0 && (
              <BriefGroup
                title={t("deadlineMoves")}
                icon={<ArrowsShuffle className="size-4" />}
                tone="warning"
                items={deadlineMoves}
                getKey={(m, i) => `${m.stageId}-${m.at.getTime()}-${i}`}
                moreLabel={more}
                render={(m) => (
                  <Row href={stageHref(m.projectId, m.stageId)}>
                    <BriefRow
                      primary={m.projectName}
                      secondary={
                        <>
                          {m.stageName}
                          {m.by ? `, ${localizeName(m.by, locale)}` : ""}
                          {m.viaStudio ? `, ${t("viaStudio")}` : ""}
                        </>
                      }
                      meta={
                        <span title={formatDateTime(m.at, locale)}>
                          {m.oldValue ? `${numericDay(m.oldValue)} → ` : "→ "}
                          <span className="font-semibold text-[var(--ink)]">
                            {m.newValue ? numericDay(m.newValue) : "—"}
                          </span>
                        </span>
                      }
                    />
                  </Row>
                )}
              />
            )}

            {payments.length > 0 && (
              <BriefGroup
                title={t("payments")}
                icon={<Cash className="size-4" />}
                items={payments}
                getKey={(p, i) => `${p.stageId}-${p.paidAt.getTime()}-${i}`}
                moreLabel={more}
                render={(p) => (
                  <Row href={stageHref(p.projectId, p.stageId)}>
                    <BriefRow
                      primary={p.projectName}
                      secondary={`${p.stageName}, ${shortDay(p.paidAt)}`}
                      meta={
                        <span className="font-semibold text-[var(--ink)]">
                          {typeof p.amount === "number" ? `${formatInt(p.amount)} ${p.currency}` : p.amount}
                        </span>
                      }
                    />
                  </Row>
                )}
              />
            )}

            {newProjects.length > 0 && (
              <BriefGroup
                title={t("newProjects")}
                icon={<Sparkles className="size-4" />}
                tone="success"
                items={newProjects}
                getKey={(p) => p.id}
                moreLabel={more}
                render={(p) => (
                  <Row href={`/projects/${p.id}`}>
                    <BriefRow
                      primary={p.name}
                      meta={<span title={formatDateTime(p.at, locale)}>{shortDay(p.at)}</span>}
                    />
                  </Row>
                )}
              />
            )}
          </div>
        )}
      </Card>
    </Section>
  );
}
