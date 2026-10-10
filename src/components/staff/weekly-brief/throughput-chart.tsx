"use client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { IconChartLine as ChartLine } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shortDay } from "@/lib/reports/weekly-brief-core";
import { BriefSectionTitle } from "./brief-group";

function ChartSkeleton() {
  return <div className="skeleton-shimmer h-[240px] w-full rounded-xl" />;
}

// recharts ogʻir — grafik boʻlagi faqat mijozda, paint'dan keyin yuklanadi.
const ThroughputChartInner = dynamic(() => import("./throughput-chart-inner").then((m) => m.ThroughputChartInner), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

/**
 * Topshiriqlar oqimi: hafta kunlari boʻyicha yaratilgan va bajarilgan topshiriqlar
 * (recharts LineChart) + boʻlimlar kesimidagi jadval.
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

  return (
    <Card className="min-w-0">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <BriefSectionTitle
          icon={<ChartLine className="size-5" />}
          title={t("throughput")}
          aside={
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold tabular-nums text-[var(--primary)]">
                {t("created")}: {totalCreated}
              </span>
              <span className="rounded-md bg-[var(--success-soft)] px-3 py-1 text-xs font-bold tabular-nums text-[var(--success)]">
                {t("completed")}: {totalCompleted}
              </span>
            </div>
          }
        />

        {!hasActivity && byDepartment.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">{t("noTasks")}</p>
        ) : (
          <>
            {rows.length > 0 && (
              // Tor ekranda 7 nuqta ezilib ketmasligi uchun gorizontal suriladi.
              <div className="-mx-1 overflow-x-auto px-1">
                <div className="min-w-[420px]">
                  <ThroughputChartInner rows={rows} labels={{ created: t("created"), completed: t("completed") }} />
                </div>
              </div>
            )}

            {byDepartment.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold">{t("byDepartment")}</h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="bg-[var(--surface-2)] text-left text-[12px] font-semibold text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-2.5">{t("department")}</th>
                        <th className="px-4 py-2.5 text-right">{t("created")}</th>
                        <th className="px-4 py-2.5 text-right">{t("completed")}</th>
                        <th className="px-4 py-2.5 text-right">{t("overdue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDepartment.map((d, i) => (
                        <tr key={`${d.department ?? "-"}-${i}`} className="border-t border-[var(--border)]">
                          <td className="max-w-[280px] truncate px-4 py-2.5 font-medium" title={d.department ?? undefined}>
                            {d.department ?? <span className="text-[var(--muted)]">{t("noDepartment")}</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{d.created}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[var(--success)]">
                            {d.completed}
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums",
                              d.overdue > 0 ? "text-[var(--danger)]" : "text-[var(--subtle)]"
                            )}
                          >
                            {d.overdue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
