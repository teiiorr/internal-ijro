import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  IconArrowsShuffle as ArrowsShuffle,
  IconBuildingStore as BuildingStore,
  IconCalendarDue as CalendarDue,
  IconDownload as Download,
  IconInfoCircle as InfoCircle,
  IconRulerMeasure as RulerMeasure,
  IconTrendingUp as TrendingUp,
} from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  canViewSlippage,
  parseSlippageFilters,
  round1,
  sharePercent,
  slippageFiltersToParams,
} from "@/lib/projects/slippage";
import { getSlippageFilterOptions, getSlippageReport } from "@/server/queries/slippage";
import { SlippageFilters } from "@/components/staff/deadline-slippage/slippage-filters";
import { SlippageTable } from "@/components/staff/deadline-slippage/slippage-table";
import { StudioSlipTable } from "@/components/staff/deadline-slippage/studio-slip-table";
import { StageDurationBenchmark } from "@/components/staff/deadline-slippage/stage-duration-benchmark";

type SP = Promise<Record<string, string | string[] | undefined>>;

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">{icon}</div>
          <div className="min-w-0">
            <h2 className="break-words text-base font-bold tracking-tight sm:text-lg">{title}</h2>
            {hint && <p className="break-words text-xs text-[var(--muted)] sm:text-sm">{hint}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Muddat surilishi tahlili: loyihalar reytingi, studiyalar kesimi va rejalashtirish aniqligi.
 * Kirish: direktor, oʻrinbosar, koordinator, boʻlim boshligʻi va platforma egasi
 * (reports/layout.tsx ham tekshiradi — bu yerda takroriy himoya).
 */
export default async function SlippageReportPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  if (!canViewSlippage(me.position, isOwner(me.email))) redirect("/dashboard");

  const [t, locale, sp] = await Promise.all([getTranslations("staffX.deadlineSlippage"), getLocale(), searchParams]);
  const filters = parseSlippageFilters((k) => {
    const v = sp[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  });

  const [report, options] = await Promise.all([getSlippageReport(filters, locale), getSlippageFilterOptions(locale)]);

  const qs = slippageFiltersToParams(filters).toString();
  const exportHref = `/api/export/slippage${qs ? `?${qs}` : ""}`;

  // KPI: faqat oʻzgarishlari qayd etilgan loyihalar boʻyicha.
  const rows = report.projects;
  const slipped = rows.filter((r) => (r.slipDays ?? 0) > 0).length;
  const totalReschedules = rows.reduce((a, r) => a + r.reschedules, 0);
  const studioReschedules = rows.reduce((a, r) => a + r.studioReschedules, 0);
  const withSlip = rows.filter((r) => r.slipDays != null);
  const avgSlip = withSlip.length ? round1(withSlip.reduce((a, r) => a + (r.slipDays ?? 0), 0) / withSlip.length) : null;
  const overallShare = sharePercent(totalReschedules > 0 ? studioReschedules / totalReschedules : null);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
          <p className="mt-0.5 break-words text-sm text-[var(--muted)]">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-auto">
          {/* API marshruti — locale prefiksisiz, oddiy <a> */}
          <a href={exportHref}>
            <Download className="size-4" />
            {t("export")}
          </a>
        </Button>
      </div>

      <SlippageFilters
        types={options.types}
        studios={options.studios}
        curators={options.curators.map((c) => ({ id: c.id, name: localizeName(c.name, locale) }))}
      />

      {report.trackingSince && (
        <p className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--muted)]">
          <InfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{t("trackingSince", { date: formatDate(report.trackingSince, locale) })}</span>
        </p>
      )}

      {/* StatCard yorligʻi min-w-0 emas — 375px'da uzun soʻz (KOʻCHIRISHLAR) kartadan chiqmasin */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0 [&_p]:min-w-0 [&_p]:[overflow-wrap:anywhere]">
        <StatCard
          label={t("kpiSlipped")}
          value={slipped}
          tone={slipped > 0 ? "danger" : "default"}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label={t("kpiAvgSlip")}
          value={avgSlip == null ? "—" : avgSlip > 0 ? `+${avgSlip}` : avgSlip < 0 ? `−${Math.abs(avgSlip)}` : "0"}
          tone={avgSlip != null && avgSlip > 14 ? "danger" : avgSlip != null && avgSlip > 0 ? "warning" : "default"}
          icon={<CalendarDue className="size-4" />}
        />
        <StatCard label={t("kpiReschedules")} value={totalReschedules} icon={<ArrowsShuffle className="size-4" />} />
        <StatCard
          label={t("studioShare")}
          value={overallShare == null ? "—" : `${overallShare}%`}
          tone="primary"
          icon={<BuildingStore className="size-4" />}
        />
      </div>

      <Section icon={<TrendingUp className="size-5" />} title={t("projectsTitle")} hint={t("projectsHint")}>
        <SlippageTable rows={rows} />
      </Section>

      <Section icon={<BuildingStore className="size-5" />} title={t("studiosTitle")}>
        <StudioSlipTable rows={report.studios} />
      </Section>

      <Section icon={<RulerMeasure className="size-5" />} title={t("benchmarkTitle")} hint={t("benchmarkHint")}>
        <StageDurationBenchmark rows={report.benchmarks} />
      </Section>
    </div>
  );
}
