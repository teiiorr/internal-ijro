import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { canSeeMoney } from "@/lib/permissions/money";
import {
  addWeeks,
  canEditWeeklySummary,
  canViewWeeklyBrief,
  lastCompletedWeekStart,
  parseWeekParam,
  recentWeekStarts,
  weekOptionLabel,
} from "@/lib/reports/weekly-brief-core";
import { getWeeklyBrief } from "@/server/queries/weekly-brief";
import { WeekPicker } from "@/components/staff/weekly-brief/week-picker";
import { KpiDeltaStrip } from "@/components/staff/weekly-brief/kpi-delta-strip";
import { WeekEvents } from "@/components/staff/weekly-brief/week-events";
import { AttentionList } from "@/components/staff/weekly-brief/attention-list";
import { ThroughputChart } from "@/components/staff/weekly-brief/throughput-chart";
import { WeeklySummaryEditor } from "@/components/staff/weekly-brief/weekly-summary-editor";

type SP = Promise<Record<string, string | string[] | undefined>>;

/**
 * Haftalik rahbar brifingi — dushanba majlisi uchun loyihalarga yoʻnaltirilgan kesim:
 * KPI (oʻtgan haftaga nisbatan + 12 haftalik sparkline), "Bu hafta nima boʻldi",
 * "Eʼtibor talab qiladi", topshiriqlar oqimi va "Hafta xulosasi".
 * Kirish: 4 ta rahbar lavozimi + egasi (reports/layout.tsx ham tekshiradi).
 */
export default async function WeeklyBriefPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const owner = isOwner(me.email);
  if (!canViewWeeklyBrief(me.position, owner)) redirect("/dashboard");

  const [t, locale, sp, canMoney] = await Promise.all([
    getTranslations("staffX.weeklyBrief"),
    getLocale(),
    searchParams,
    canSeeMoney({ id: me.id, email: me.email }),
  ]);

  const now = new Date();
  const latest = lastCompletedWeekStart(now);
  const week = parseWeekParam(sp.week, now);
  const brief = await getWeeklyBrief(week, { canMoney, locale });

  const weeks = recentWeekStarts(latest, 12);
  if (!weeks.includes(week)) weeks.push(week);
  const options = weeks.map((w) => ({ value: w, label: weekOptionLabel(w) }));
  const nextWeek = week < latest ? addWeeks(week, 1) : null;
  const prevWeek = addWeeks(week, -1);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
          <p className="mt-0.5 break-words text-sm text-[var(--muted)]">
            {t("week")}: <span className="font-semibold tabular-nums text-[var(--foreground)]">{weekOptionLabel(week)}</span>
          </p>
        </div>
        <WeekPicker week={week} options={options} prevWeek={prevWeek} nextWeek={nextWeek} />
      </div>

      <KpiDeltaStrip
        metrics={brief.metrics}
        prev={brief.prev}
        series={brief.series}
        isEstimate={brief.isEstimate}
        canMoney={brief.canMoney}
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <WeekEvents events={brief.events} locale={locale} />
        <AttentionList attention={brief.attention} locale={locale} />
      </div>

      <ThroughputChart days={brief.throughput.days} byDepartment={brief.throughput.byDepartment} />

      <WeeklySummaryEditor
        key={week}
        weekStart={week}
        note={brief.summary?.note ?? null}
        byName={brief.summary?.byName ?? null}
        at={brief.summary?.at ? brief.summary.at.toISOString() : null}
        canEdit={canEditWeeklySummary(me.position, owner)}
        locale={locale}
      />
    </div>
  );
}
