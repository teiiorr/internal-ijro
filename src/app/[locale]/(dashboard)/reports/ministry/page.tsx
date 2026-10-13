import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconDownload as Download } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { canSeeMoney } from "@/lib/permissions/money";
import { canViewWeeklyBrief, formatInt, tashkentToday } from "@/lib/reports/weekly-brief-core";
import { MONEY_MASK } from "@/lib/permissions/project-editors";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui-biib/Button";
import { Segmented } from "@/components/ui-biib/Segmented";
import {
  getMinistryReport,
  ministryPeriodToParams,
  parseMinistryPeriod,
} from "@/server/queries/ministry-report";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** "YYYY-MM-DD" → "dd.mm.yyyy". */
function dmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function StatTile({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className={cn("min-w-0 break-words text-[1.625rem] font-bold leading-none tabular-nums", tone ?? "text-[var(--ink)]")}>
        {value}
      </p>
      <p className="mt-1.5 min-w-0 break-words t-small text-[var(--ink-3)]">{label}</p>
    </div>
  );
}

/**
 * Ministrlik uchun davriy hisobot — markaz davr ichida nima ishlab chiqarganining bosma
 * uchun qulay jamlanmasi: sarlavha plitkalar, tur boʻyicha ishlab chiqarish va byudjet
 * jadvallari. Kirish: 4 ta rahbar lavozimi + egasi (reports/layout.tsx ham tekshiradi).
 * Pul summalari faqat money-ruxsatli foydalanuvchiga koʻrinadi (aks holda ***).
 */
export default async function MinistryReportPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const owner = isOwner(me.email);
  if (!canViewWeeklyBrief(me.position, owner)) redirect("/dashboard");

  const [t, locale, sp, canMoney] = await Promise.all([
    getTranslations("staffX.ministryReport"),
    getLocale(),
    searchParams,
    canSeeMoney({ id: me.id, email: me.email }),
  ]);

  const period = parseMinistryPeriod((k) => {
    const v = sp[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  });
  const report = await getMinistryReport(period.from, period.to, locale);

  const qs = ministryPeriodToParams(period).toString();
  const exportHref = `/api/export/ministry${qs ? `?${qs}` : ""}`;

  const currentYear = Number(tashkentToday().slice(0, 4));
  const periodOptions = [
    { href: `/reports/ministry?year=${currentYear}`, label: t("thisYear"), active: period.year === currentYear },
    { href: `/reports/ministry?year=${currentYear - 1}`, label: t("lastYear"), active: period.year === currentYear - 1 },
  ];

  const periodLabel =
    period.year != null ? t("yearLabel", { year: String(period.year) }) : `${dmy(period.from)} — ${dmy(period.to)}`;
  const money = (n: number) => (canMoney ? formatInt(n) : MONEY_MASK);
  const primaryBudget = report.budget.find((b) => b.currency === "UZS") ?? report.budget[0] ?? null;
  const onTime = report.discipline.onTimePercent;
  const onTimeTone =
    onTime == null ? "text-[var(--ink)]" : onTime >= 85 ? "text-[var(--success)]" : onTime >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]";

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={
          <>
            {t("period")}: <span className="font-semibold tabular-nums text-[var(--ink)]">{periodLabel}</span>
          </>
        }
        actions={
          <Button asChild variant="glass" size="40" icon={Download}>
            {/* API marshruti — locale prefiksisiz, oddiy <a> */}
            <a href={exportHref}>{t("export")}</a>
          </Button>
        }
        tools={
          <nav aria-label={t("period")} className="-mx-1 overflow-x-auto px-1">
            <Segmented items={periodOptions} />
          </nav>
        }
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <section aria-label={t("title")}>
          <Card>
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
              <StatTile value={formatInt(report.produced.total)} label={t("producedTotal")} />
              <StatTile value={formatInt(report.inProduction)} label={t("inProduction")} />
              <StatTile
                value={onTime == null ? "—" : `${onTime}%`}
                label={t("onTimePercent")}
                tone={onTimeTone}
              />
              <StatTile
                value={money(primaryBudget?.paid ?? 0)}
                label={primaryBudget ? t("budgetPaidCurrency", { currency: primaryBudget.currency }) : t("budgetPaid")}
              />
            </div>
          </Card>
        </section>

        <Section title={t("producedTitle")} headingLevel={2}>
          <Card solid>
            <p className="mb-4 t-small text-[var(--ink-3)]">{t("producedHint")}</p>
            {report.produced.byType.length === 0 ? (
              <p className="t-small text-[var(--ink-3)]">{t("empty")}</p>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="pb-2 pr-4 t-micro font-semibold uppercase tracking-wide text-[var(--ink-3)]">{t("typeHeader")}</th>
                    <th className="pb-2 t-micro font-semibold uppercase tracking-wide text-[var(--ink-3)]">{t("countHeader")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.produced.byType.map((row) => (
                    <tr key={row.name} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-2 pr-4 t-small text-[var(--ink)]">{row.name}</td>
                      <td className="py-2 t-small font-semibold tabular-nums text-[var(--ink)]">{formatInt(row.count)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[var(--line-strong)]">
                    <td className="py-2 pr-4 t-small font-bold text-[var(--ink)]">{t("totalRow")}</td>
                    <td className="py-2 t-small font-bold tabular-nums text-[var(--ink)]">{formatInt(report.produced.total)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </Card>
        </Section>

        <Section title={t("budgetTitle")} headingLevel={2} meta={t("studiosEngaged", { count: report.studiosEngaged })}>
          <Card solid>
            <p className="mb-4 t-small text-[var(--ink-3)]">{t("budgetHint")}</p>
            {report.budget.length === 0 ? (
              <p className="t-small text-[var(--ink-3)]">{t("budgetEmpty")}</p>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="pb-2 pr-4 t-micro font-semibold uppercase tracking-wide text-[var(--ink-3)]">{t("currencyHeader")}</th>
                    <th className="pb-2 pr-4 t-micro font-semibold uppercase tracking-wide text-[var(--ink-3)]">{t("plannedHeader")}</th>
                    <th className="pb-2 pr-4 t-micro font-semibold uppercase tracking-wide text-[var(--ink-3)]">{t("paidHeader")}</th>
                    <th className="pb-2 t-micro font-semibold uppercase tracking-wide text-[var(--ink-3)]">{t("remainingHeader")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.budget.map((row) => (
                    <tr key={row.currency} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-2 pr-4 t-small font-semibold text-[var(--ink)]">{row.currency}</td>
                      <td className="py-2 pr-4 t-small tabular-nums text-[var(--ink)]">{money(row.planned)}</td>
                      <td className="py-2 pr-4 t-small tabular-nums text-[var(--ink)]">{money(row.paid)}</td>
                      <td className="py-2 t-small tabular-nums text-[var(--ink)]">{money(row.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 t-small text-[var(--ink-2)]">
              <span>
                {t("disciplineOnTime")}: <span className={cn("font-bold tabular-nums", onTimeTone)}>{onTime == null ? "—" : `${onTime}%`}</span>
              </span>
              <span>
                {t("disciplineLate")}: <span className="font-bold tabular-nums text-[var(--ink)]">{formatInt(report.discipline.late)}</span>
              </span>
              <span>
                {t("disciplineCompleted")}: <span className="font-bold tabular-nums text-[var(--ink)]">{formatInt(report.discipline.completedStages)}</span>
              </span>
            </p>
          </Card>
        </Section>
      </div>
    </div>
  );
}
