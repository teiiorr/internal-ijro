import { useTranslations } from "next-intl";
import {
  IconAlertTriangle as AlertTriangle,
  IconZzz as Zzz,
  IconHourglassHigh as Hourglass,
  IconClockExclamation as ClockExclamation,
  IconCircleCheck as CircleCheck,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { shortDay } from "@/lib/reports/weekly-brief-core";
import type { WeeklyAttention } from "@/server/queries/weekly-brief";
import { BriefGroup, BriefRow, BriefSectionTitle } from "./brief-group";

const linkCls = "hover:text-[var(--primary)] hover:underline underline-offset-2";

/**
 * "Eʼtibor talab qiladi" — HOZIRGI holat: 14 kundan beri jim loyihalar (ogohlantirish),
 * BKRM'ni 5 kundan ortiq kutayotgan topshirishlar (xavf) va meʼyoriy muddatdan oshgan
 * bosqichlar (ogohlantirish).
 */
export function AttentionList({ attention, locale }: { attention: WeeklyAttention; locale: string }) {
  const t = useTranslations("staffX.weeklyBrief");
  const more = (count: number) => t("more", { count });
  const { silentProjects, waitingReview, overrunning } = attention;
  const empty = silentProjects.length + waitingReview.length + overrunning.length === 0;
  const stageHref = (projectId: string, stageId: string) => `/projects/${projectId}/stages/${stageId}`;

  return (
    <Card className="min-w-0">
      <CardContent className="space-y-3 p-4 sm:p-6">
        <BriefSectionTitle icon={<AlertTriangle className="size-5" />} title={t("attention")} />

        {empty ? (
          <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-[var(--muted)]">
            <CircleCheck className="size-6 text-[var(--success)]" aria-hidden />
            {t("attentionEmpty")}
          </p>
        ) : (
          <div className="space-y-3">
            {waitingReview.length > 0 && (
              <BriefGroup
                title={t("waitingReview")}
                icon={<Hourglass className="size-4" />}
                tone="danger"
                items={waitingReview}
                getKey={(s) => s.stageId}
                moreLabel={more}
                render={(s) => (
                  <BriefRow
                    primary={
                      <Link href={stageHref(s.projectId, s.stageId)} className={linkCls}>
                        {s.projectName}
                      </Link>
                    }
                    secondary={s.stageName}
                    meta={
                      <span className="font-semibold text-[var(--danger)]" title={formatDateTime(s.submittedAt, locale)}>
                        {t("days", { count: s.days })}
                      </span>
                    }
                  />
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
                  <BriefRow
                    primary={
                      <Link href={stageHref(s.projectId, s.stageId)} className={linkCls}>
                        {s.projectName}
                      </Link>
                    }
                    secondary={`${s.stageName} · ${shortDay(s.startedAt)}`}
                    meta={
                      <span className="font-semibold text-[var(--warning)]" title={formatDate(s.startedAt, locale)}>
                        {t("overrunDetail", { actual: s.actualDays, norm: s.defaultDays })}
                      </span>
                    }
                  />
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
                  <BriefRow
                    primary={
                      <Link href={`/projects/${p.id}`} className={linkCls}>
                        {p.name}
                      </Link>
                    }
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
                )}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
