import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconDownload as Download, IconInfoCircle as InfoCircle } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui-biib/Button";
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

/**
 * Muddat surilishi tahlili: loyihalar reytingi, studiyalar kesimi va rejalashtirish aniqligi.
 * BIIB: sarlavha + bitta sarhisob qator (plitka EMAS), filtrlar header asboblarida,
 * jadvallar qattiq kartada. Kirish: 4 ta rahbar lavozimi + egasi (layout ham tekshiradi).
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

  // Sarhisob: faqat oʻzgarishlari qayd etilgan loyihalar boʻyicha.
  const rows = report.projects;
  const slipped = rows.filter((r) => (r.slipDays ?? 0) > 0).length;
  const totalReschedules = rows.reduce((a, r) => a + r.reschedules, 0);
  const studioReschedules = rows.reduce((a, r) => a + r.studioReschedules, 0);
  const withSlip = rows.filter((r) => r.slipDays != null);
  const avgSlip = withSlip.length ? round1(withSlip.reduce((a, r) => a + (r.slipDays ?? 0), 0) / withSlip.length) : null;
  const overallShare = sharePercent(totalReschedules > 0 ? studioReschedules / totalReschedules : null);

  const avgDisplay = avgSlip == null ? "—" : avgSlip > 0 ? `+${avgSlip}` : avgSlip < 0 ? `−${Math.abs(avgSlip)}` : "0";
  const slipTone = slipped > 0 ? "text-[var(--danger)]" : "text-[var(--ink)]";
  const avgTone =
    avgSlip != null && avgSlip > 14 ? "text-[var(--danger)]" : avgSlip != null && avgSlip > 0 ? "text-[var(--warning)]" : "text-[var(--ink)]";

  return (
    <div>
      <PageHeader
        title={t("title")}
        actions={
          <Button asChild variant="glass" size="40" icon={Download}>
            {/* API marshruti — locale prefiksisiz, oddiy <a> */}
            <a href={exportHref}>{t("export")}</a>
          </Button>
        }
        tools={<SlippageFilters
          types={options.types}
          studios={options.studios}
          curators={options.curators.map((c) => ({ id: c.id, name: localizeName(c.name, locale) }))}
        />}
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-x-6 gap-y-1.5 t-small text-[var(--ink-2)]">
            <span>
              {t("kpiSlipped")}: <span className={cn("font-bold tabular-nums", slipTone)}>{slipped}</span>
            </span>
            <span>
              {t("kpiAvgSlip")}: <span className={cn("font-bold tabular-nums", avgTone)}>{avgDisplay}</span>
            </span>
            <span>
              {t("kpiReschedules")}: <span className="font-bold tabular-nums text-[var(--ink)]">{totalReschedules}</span>
            </span>
            <span>
              {t("studioShare")}:{" "}
              <span className="font-bold tabular-nums text-[var(--ink)]">{overallShare == null ? "—" : `${overallShare}%`}</span>
            </span>
          </p>

          {report.trackingSince && (
            <p className="flex items-start gap-1.5 t-small text-[var(--ink-3)]">
              <InfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{t("trackingSince", { date: formatDate(report.trackingSince, locale) })}</span>
            </p>
          )}
        </div>

        <Section title={t("projectsTitle")} headingLevel={2}>
          <Card solid>
            <p className="mb-4 t-small text-[var(--ink-3)]">{t("projectsHint")}</p>
            <SlippageTable rows={rows} />
          </Card>
        </Section>

        <Section title={t("studiosTitle")} headingLevel={2}>
          <Card solid>
            <StudioSlipTable rows={report.studios} />
          </Card>
        </Section>

        <Section title={t("benchmarkTitle")} headingLevel={2}>
          <Card solid>
            <p className="mb-4 t-small text-[var(--ink-3)]">{t("benchmarkHint")}</p>
            <StageDurationBenchmark rows={report.benchmarks} />
          </Card>
        </Section>
      </div>
    </div>
  );
}
