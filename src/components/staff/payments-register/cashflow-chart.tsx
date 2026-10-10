"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { IconInfoCircle as Info } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mergeActualAndForecast, orderCurrencies, type ForecastBuckets } from "@/lib/finance/forecast";
import type { CashflowActual, CashflowStudioRow } from "@/server/queries/finance";
import { formatMoney, splitMonth } from "./format";

function ChartSkeleton() {
  return <div className="skeleton-shimmer h-[320px] w-full rounded-xl" />;
}

// recharts ogʻir — grafik boʻlagi faqat mijozda, paint'dan keyin yuklanadi.
const CashflowChartInner = dynamic(() => import("./cashflow-chart-inner").then((m) => m.CashflowChartInner), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

/**
 * 12 oylik pul oqimi: oxirgi 6 oy haqiqiy toʻlovlar + joriy oydan boshlab prognoz
 * (bosqich reja muddatlari boʻyicha). Valyuta tanlanadi — summalar hech qachon aralashmaydi.
 */
export function CashflowChart({
  months,
  currentMonth,
  actual,
  buckets,
  byStudio,
}: {
  months: string[];
  currentMonth: string;
  actual: CashflowActual[];
  /** bucketForecast(forecastStages, joriy oydan boshlangan oylar) natijasi */
  buckets: ForecastBuckets;
  byStudio: CashflowStudioRow[];
}) {
  const t = useTranslations("staffX.paymentsRegister");
  const currencies = orderCurrencies([
    ...actual.map((a) => a.currency),
    ...Object.keys(buckets),
    ...byStudio.map((s) => s.currency),
  ]);
  const [picked, setPicked] = useState<string | null>(null);
  const currency = picked && currencies.includes(picked) ? picked : (currencies[0] ?? "UZS");

  const monthLabel = (m: string) => {
    const [y, mo] = splitMonth(m);
    return `${t(`monthsShort.m${mo}`)} ’${String(y).slice(-2)}`;
  };

  // 12 ta qator — memo shart emas.
  const rows = mergeActualAndForecast(actual, buckets, months, currency).map((r) => ({ ...r, label: monthLabel(r.month) }));

  const compactNum = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");
  const formatAxis = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e9) return t("compactBillion", { n: compactNum(n / 1e9) });
    if (abs >= 1e6) return t("compactMillion", { n: compactNum(n / 1e6) });
    if (abs >= 1e3) return t("compactThousand", { n: compactNum(n / 1e3) });
    return String(Math.round(n));
  };
  const formatValue = (n: number) => formatMoney(n, currency);

  const b = buckets[currency] ?? {};
  const forecastTotal = months.filter((m) => m >= currentMonth).reduce((s, m) => s + (b[m] ?? 0), 0);
  const paidTotal = rows.reduce((s, r) => s + r.paid, 0);
  const summary = [
    { key: "overdue", label: t("overdueBucket"), value: b.overdue ?? 0, tone: "text-[var(--danger)]" },
    { key: "nodate", label: t("noDate"), value: b.nodate ?? 0, tone: "text-[var(--warning)]" },
    { key: "later", label: t("later"), value: b.later ?? 0, tone: "text-[var(--foreground)]" },
  ];
  const studios = byStudio.filter((s) => s.currency === currency);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight">{t("forecast")}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--muted)]">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="break-words">{t("forecastHint")}</span>
              </p>
            </div>
            {currencies.length > 1 && (
              <div role="group" aria-label={t("currency")} className="flex shrink-0 gap-1 self-start rounded-[10px] bg-[var(--surface-3)] p-1">
                {currencies.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPicked(c)}
                    aria-pressed={c === currency}
                    className={cn(
                      "rounded-[8px] px-3 py-1.5 text-sm font-semibold transition-all",
                      c === currency
                        ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-1)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl bg-[var(--success-soft)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--muted)]">{t("paid")}</p>
              <p className="break-words text-sm font-bold tabular-nums text-[var(--success)]">{formatMoney(paidTotal, currency)}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-[var(--primary-soft)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--muted)]">{t("forecast")}</p>
              <p className="break-words text-sm font-bold tabular-nums text-[var(--primary)]">{formatMoney(forecastTotal, currency)}</p>
            </div>
          </div>

          {/* Tor ekranda 12 ta ustun ezilib ketmasligi uchun gorizontal suriladi */}
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="min-w-[560px]">
              <CashflowChartInner
                rows={rows}
                currentMonth={currentMonth}
                labels={{ paid: t("paid"), forecast: t("forecast"), currentMonth: t("currentMonth") }}
                formatAxis={formatAxis}
                formatValue={formatValue}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {summary.map((s) => (
              <div key={s.key} className="min-w-0 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2.5">
                <p className="text-xs font-semibold text-[var(--muted)]">{s.label}</p>
                <p className={cn("break-words text-base font-bold tabular-nums", s.value > 0 ? s.tone : "text-[var(--subtle)]")}>
                  {formatMoney(s.value, currency)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight">
            {t("byStudio")}<span className="text-sm font-semibold text-[var(--muted)]">, {currency}</span>
          </h2>
          {studios.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-[12px] font-semibold text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2.5">{t("studio")}</th>
                    <th className="px-4 py-2.5 text-right">{t("paid12m")}</th>
                    <th className="px-4 py-2.5 text-right">{t("remaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {studios.map((s, i) => (
                    <tr key={`${s.studioName ?? "-"}-${i}`} className="border-t border-[var(--border)]">
                      <td className="max-w-[260px] truncate px-4 py-2.5 font-medium" title={s.studioName ?? undefined}>
                        {s.studioName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--success)]">
                        {formatMoney(s.paid12m, s.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">
                        {formatMoney(s.remaining, s.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
