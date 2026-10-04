import { useTranslations } from "next-intl";
import {
  IconCalendarEvent as CalendarEvent,
  IconCircleCheck as CircleCheck,
  IconAlarm as Alarm,
  IconArrowsShuffle as ArrowsShuffle,
  IconCash as Cash,
  IconSparkles as Sparkles,
  IconMessageCircle as MessageCircle,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { formatInt, numericDay, shortDay } from "@/lib/reports/weekly-brief-core";
import type { WeeklyEvents } from "@/server/queries/weekly-brief";
import { BriefGroup, BriefRow, BriefSectionTitle } from "./brief-group";

const linkCls = "hover:text-[var(--primary)] hover:underline underline-offset-2";

/**
 * "Bu hafta nima boʻldi" — vaqt belgilaridan hisoblangan hodisalar (har qanday oʻtgan hafta
 * uchun, snapshot'siz ham toʻgʻri): yakunlangan bosqichlar, muddati oʻtgan bosqichlar,
 * muddat oʻzgarishlari, toʻlovlar, yangi loyihalar va studiya soʻrovlari.
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
    <Card className="min-w-0">
      <CardContent className="space-y-3 p-4 sm:p-6">
        <BriefSectionTitle icon={<CalendarEvent className="size-5" />} title={t("whatHappened")} />

        {empty ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            {(studioRequests.opened > 0 || studioRequests.decided > 0) && (
              <p className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm sm:px-4">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" aria-hidden />
                <Link href="/contractors/requests" className={`min-w-0 break-words font-medium ${linkCls}`}>
                  {t("studioRequests", { opened: studioRequests.opened, decided: studioRequests.decided })}
                </Link>
              </p>
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
                  <BriefRow
                    primary={
                      <Link href={stageHref(s.projectId, s.stageId)} className={linkCls}>
                        {s.projectName}
                      </Link>
                    }
                    secondary={s.stageName}
                    meta={<span title={formatDateTime(s.at, locale)}>{shortDay(s.at)}</span>}
                  />
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
                  <BriefRow
                    primary={
                      <Link href={stageHref(s.projectId, s.stageId)} className={linkCls}>
                        {s.projectName}
                      </Link>
                    }
                    secondary={s.stageName}
                    meta={
                      <span className="flex flex-wrap items-center gap-x-2 sm:justify-end">
                        <span>{shortDay(s.deadline)}</span>
                        <span className={s.stillOpen ? "font-semibold text-[var(--danger)]" : "text-[var(--warning)]"}>
                          {s.stillOpen ? t("stillOpen") : t("completedLate")}
                        </span>
                      </span>
                    }
                  />
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
                  <BriefRow
                    primary={
                      <Link href={stageHref(m.projectId, m.stageId)} className={linkCls}>
                        {m.projectName}
                      </Link>
                    }
                    secondary={
                      <>
                        {m.stageName}
                        {m.by ? ` · ${localizeName(m.by, locale)}` : ""}
                        {m.viaStudio ? ` · ${t("viaStudio")}` : ""}
                      </>
                    }
                    meta={
                      <span title={formatDateTime(m.at, locale)}>
                        {m.oldValue ? `${numericDay(m.oldValue)} → ` : "→ "}
                        <span className="font-semibold text-[var(--foreground)]">
                          {m.newValue ? numericDay(m.newValue) : "—"}
                        </span>
                      </span>
                    }
                  />
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
                  <BriefRow
                    primary={
                      <Link href={stageHref(p.projectId, p.stageId)} className={linkCls}>
                        {p.projectName}
                      </Link>
                    }
                    secondary={`${p.stageName} · ${shortDay(p.paidAt)}`}
                    meta={
                      <span className="font-semibold text-[var(--foreground)]">
                        {typeof p.amount === "number" ? `${formatInt(p.amount)} ${p.currency}` : p.amount}
                      </span>
                    }
                  />
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
                  <BriefRow
                    primary={
                      <Link href={`/projects/${p.id}`} className={linkCls}>
                        {p.name}
                      </Link>
                    }
                    meta={<span title={formatDateTime(p.at, locale)}>{shortDay(p.at)}</span>}
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
