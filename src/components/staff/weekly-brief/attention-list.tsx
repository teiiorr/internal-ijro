import { useTranslations } from "next-intl";
import {
  IconZzz as Zzz,
  IconHourglassHigh as Hourglass,
  IconClockExclamation as ClockExclamation,
  IconCircleCheck as CircleCheck,
} from "@tabler/icons-react";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Row } from "@/components/ui-biib/Rows";
import { formatDate, formatDateTime } from "@/lib/dates";
import { shortDay } from "@/lib/reports/weekly-brief-core";
import type { WeeklyAttention } from "@/server/queries/weekly-brief";
import { BriefGroup, BriefRow } from "./brief-group";

/**
 * "Eʼtibor talab qiladi" — HOZIRGI holat: 14 kundan beri jim loyihalar (ogohlantirish),
 * BKRM'ni 5 kundan ortiq kutayotgan topshirishlar (xavf) va meʼyoriy muddatdan oshgan
 * bosqichlar (ogohlantirish). BIIB: bitta seksiya, oyna karta, ajratuvchi qatorlar.
 */
export function AttentionList({ attention, locale }: { attention: WeeklyAttention; locale: string }) {
  const t = useTranslations("staffX.weeklyBrief");
  const more = (count: number) => t("more", { count });
  const { silentProjects, waitingReview, overrunning } = attention;
  const empty = silentProjects.length + waitingReview.length + overrunning.length === 0;
  const stageHref = (projectId: string, stageId: string) => `/projects/${projectId}/stages/${stageId}`;

  return (
    <Section title={t("attention")} headingLevel={3}>
      <Card bare className="px-5 sm:px-6">
        {empty ? (
          <p className="flex flex-col items-center gap-2 py-6 text-center t-small text-[var(--ink-3)]">
            <CircleCheck className="size-6 text-[var(--success)]" aria-hidden />
            {t("attentionEmpty")}
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-6 py-1">
            {waitingReview.length > 0 && (
              <BriefGroup
                title={t("waitingReview")}
                icon={<Hourglass className="size-4" />}
                tone="danger"
                items={waitingReview}
                getKey={(s) => s.stageId}
                moreLabel={more}
                render={(s) => (
                  <Row href={stageHref(s.projectId, s.stageId)}>
                    <BriefRow
                      primary={s.projectName}
                      secondary={s.stageName}
                      meta={
                        <span className="font-semibold text-[var(--danger)]" title={formatDateTime(s.submittedAt, locale)}>
                          {t("days", { count: s.days })}
                        </span>
                      }
                    />
                  </Row>
                )}
              />
            )}

            {overrunning.length > 0 && (
              <BriefGroup
                title={t("overrunning")}
                icon={<ClockExclamation className="size-4" />}
                tone="warning"
                items={overrunning}
                getKey={(s) => s.stageId}
                moreLabel={more}
                render={(s) => (
                  <Row href={stageHref(s.projectId, s.stageId)}>
                    <BriefRow
                      primary={s.projectName}
                      secondary={`${s.stageName}, ${shortDay(s.startedAt)}`}
                      meta={
                        <span className="font-semibold text-[var(--warning)]" title={formatDate(s.startedAt, locale)}>
                          {t("overrunDetail", { actual: s.actualDays, norm: s.defaultDays })}
                        </span>
                      }
                    />
                  </Row>
                )}
              />
            )}

            {silentProjects.length > 0 && (
              <BriefGroup
                title={t("silentProjects")}
                icon={<Zzz className="size-4" />}
                tone="warning"
                items={silentProjects}
                getKey={(p) => p.id}
                moreLabel={more}
                render={(p) => (
                  <Row href={`/projects/${p.id}`}>
                    <BriefRow
                      primary={p.name}
                      meta={
                        p.lastActivityAt ? (
                          <span title={formatDateTime(p.lastActivityAt, locale)}>
                            {t("lastActivity", { date: formatDate(p.lastActivityAt, locale) })}
                          </span>
                        ) : (
                          <span>{t("noActivity")}</span>
                        )
                      }
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
