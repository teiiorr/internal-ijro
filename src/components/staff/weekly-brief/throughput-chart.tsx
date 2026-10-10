"use client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { cn } from "@/lib/utils";
import { shortDay } from "@/lib/reports/weekly-brief-core";

function ChartSkeleton() {
  return <div className="skeleton-shimmer h-[240px] w-full rounded-[var(--radius-card)]" />;
}

// recharts ogʻir — grafik boʻlagi faqat mijozda, paint'dan keyin yuklanadi.
const ThroughputChartInner = dynamic(() => import("./throughput-chart-inner").then((m) => m.ThroughputChartInner), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

/**
 * Topshiriqlar oqimi: hafta kunlari boʻyicha yaratilgan va bajarilgan topshiriqlar
 * (recharts LineChart) + boʻlimlar kesimidagi jadval. BIIB: seksiya sarlavhasi + sarhisob
 * meta, oyna karta ichida grafik, boʻlimlar jadvali qattiq kartada.
 */
export function ThroughputChart({
  days,
  byDepartment,
}: {
  days: { date: string; created: number; completed: number }[];
  byDepartment: { department: string | null; created: number; completed: number; overdue: number }[];
}) {
  const t = useTranslations("staffX.weeklyBrief");
  const rows = days.map((d) => ({ label: shortDay(d.date), created: d.created, completed: d.completed }));
  const totalCreated = days.reduce((s, d) => s + d.created, 0);
  const totalCompleted = days.reduce((s, d) => s + d.completed, 0);
  const hasActivity = totalCreated + totalCompleted > 0;

  const meta = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="text-[var(--tint)]">
        {t("created")}: {totalCreated}
      </span>
      <span className="text-[var(--success)]">
        {t("completed")}: {totalCompleted}
      </span>
    </span>
  );

  return (
    <Section title={t("throughput")} meta={meta}>
      {!hasActivity && byDepartment.length === 0 ? (
        <Card>
          <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("noTasks")}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.length > 0 && (
            <Card>
              {/* Tor ekranda 7 nuqta ezilmasligi uchun gorizontal suriladi. */}
              <div className="-mx-1 overflow-x-auto px-1">
                <div className="min-w-[420px]">
                  <ThroughputChartInner rows={rows} labels={{ created: t("created"), completed: t("completed") }} />
                </div>
              </div>
            </Card>
          )}

          {byDepartment.length > 0 && (
            <Card solid bare className="overflow-hidden">
              <h3 className="px-5 pt-5 t-label text-[var(--ink-2)] sm:px-6 sm:pt-6">{t("byDepartment")}</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-left t-micro text-[var(--ink-3)]">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold sm:px-6">{t("department")}</th>
                      <th className="px-4 py-2.5 text-right font-semibold">{t("created")}</th>
                      <th className="px-4 py-2.5 text-right font-semibold">{t("completed")}</th>
                      <th className="px-5 py-2.5 text-right font-semibold sm:px-6">{t("overdue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDepartment.map((d, i) => (
                      <tr key={`${d.department ?? "-"}-${i}`} className="border-t border-[var(--line)]">
                        <td className="max-w-[280px] truncate px-5 py-2.5 font-medium text-[var(--ink)] sm:px-6" title={d.department ?? undefined}>
                          {d.department ?? <span className="text-[var(--ink-3)]">{t("noDepartment")}</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--ink-2)]">{d.created}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--success)]">
                          {d.completed}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums sm:px-6",
                            d.overdue > 0 ? "text-[var(--danger)]" : "text-[var(--ink-3)]"
                          )}
                        >
                          {d.overdue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </Section>
  );
}
