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
import { PageHeader } from "@/components/ui-biib/PageHeader";
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
    <div>
      <PageHeader
        title={t("title")}
        subtitle={<>{t("week")}: <span className="font-semibold tabular-nums text-[var(--ink)]">{weekOptionLabel(week)}</span></>}
        actions={<WeekPicker week={week} options={options} prevWeek={prevWeek} nextWeek={nextWeek} />}
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <KpiDeltaStrip
          metrics={brief.metrics}
          prev={brief.prev}
          series={brief.series}
          isEstimate={brief.isEstimate}
          canMoney={brief.canMoney}
        />

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
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
    </div>
  );
}
