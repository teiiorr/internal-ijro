import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProjectStageKpis,
  getProjectStatusBreakdown,
  getProjectTypeBreakdown,
  getStageDeadlineBoard,
  getProjectPaymentsSummary,
  getTopAssigneesByCompleted,
  getTopAssigneesByOverdue,
  getDepartmentWorkload,
} from "@/server/queries/dashboards";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { ProjectStatusDonut } from "@/components/dashboards/project-status-donut";
import { ProjectTypeBar } from "@/components/dashboards/project-type-bar";
import type { DerivedStatus } from "@/lib/projects/progress";
import {
  Trophy,
  AlertTriangle,
  Layers,
  FolderKanban,
  CalendarClock,
  CalendarX2,
  ListChecks,
  ChevronRight,
  PieChart,
  BarChart3,
  Wallet,
} from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} UZS`;

// Traffic-light hexes (recharts fills don't take CSS vars) kept in sync with the theme.
const STATUS_HEX: Record<DerivedStatus, string> = {
  in_progress: "#6366F1",
  completed: "#10B981",
  on_hold: "#F59E0B",
  not_started: "#94A3B8",
};

const KPI_TONE = {
  primary: { chip: "bg-[var(--primary-soft)]", icon: "text-[var(--primary)]", value: "" },
  danger: { chip: "bg-[var(--danger-soft)]", icon: "text-[var(--danger)]", value: "text-[var(--danger)]" },
  warning: { chip: "bg-[var(--warning-soft)]", icon: "text-[var(--warning)]", value: "" },
} as const;

export async function ManagerWidgets({ showPayments = false }: { showPayments?: boolean }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const [kpi, statusBreak, typeBreak, board, pay, top, slow, deptLoad] = await Promise.all([
    getProjectStageKpis(),
    getProjectStatusBreakdown(),
    getProjectTypeBreakdown(locale),
    getStageDeadlineBoard(locale, 8),
    getProjectPaymentsSummary(),
    getTopAssigneesByCompleted(5),
    getTopAssigneesByOverdue(5),
    getDepartmentWorkload(),
  ]);

  const topMax = Math.max(...top.map((x) => x.c), 1);
  const slowMax = Math.max(...slow.map((x) => x.c), 1);

  const kpis = [
    { key: "active", href: "/projects", icon: FolderKanban, value: kpi.activeProjects, label: t("dashboard.manager.kpiActiveProjects"), tone: "primary" as const },
    { key: "ovStages", href: "/projects?overdue=1", icon: CalendarX2, value: kpi.overdueStages, label: t("dashboard.manager.kpiOverdueStages"), tone: "danger" as const },
    { key: "dueSoon", href: "#stage-board", icon: CalendarClock, value: kpi.dueSoonStages, label: t("dashboard.manager.kpiDueSoon"), tone: "warning" as const },
    { key: "ovTasks", href: "/tasks?scope=all&tab=in_progress", icon: ListChecks, value: kpi.overdueTasks, label: t("dashboard.manager.kpiOverdueTasks"), tone: "danger" as const },
  ];

  const donut = (["in_progress", "completed", "on_hold", "not_started"] as const).map((k) => ({
    key: k,
    name: t(`projects.derivedStatus.${k}` as "projects.derivedStatus.in_progress"),
    value: statusBreak[k],
    color: STATUS_HEX[k],
  }));

  // payments bar geometry (paid green + pending amber over the planned reference)
  const payBase = Math.max(pay.planned, pay.paid + pay.pending, 1);
  const paidPct = (pay.paid / payBase) * 100;
  const pendingPct = (pay.pending / payBase) * 100;

  return (
    <div className="space-y-6">
      {/* Clickable KPI hero row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const tone = KPI_TONE[k.tone];
          return (
            <Link
              key={k.key}
              href={k.href}
              className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]"
            >
              <div className="flex items-center justify-between">
                <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone.chip}`}>
                  <k.icon className={`size-5 ${tone.icon}`} />
                </div>
                <ChevronRight className="size-4 shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
              </div>
              <div>
                <div className={`text-3xl font-bold leading-none tabular-nums ${tone.value}`}>{k.value}</div>
                <div className="mt-1.5 text-xs font-medium leading-tight text-[var(--muted)] sm:text-sm">{k.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Projects analytics: status donut + type bar */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)]">
              <PieChart className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.projectsByStatus")}</CardTitle>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.projectsByStatusDesc")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <ProjectStatusDonut data={donut} centerLabel={t("dashboard.manager.projectsTotal")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)]">
              <BarChart3 className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.projectsByType")}</CardTitle>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.projectsByTypeDesc")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <ProjectTypeBar data={typeBreak} />
          </CardContent>
        </Card>
      </div>

      {/* Stage deadline board — the actionable heart of the dashboard */}
      <Card id="stage-board" className="scroll-mt-24">
        <CardHeader className="flex-row items-center gap-3 pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--warning-soft)]">
            <CalendarClock className="size-5 text-[var(--warning)]" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{t("dashboard.manager.stageBoard")}</CardTitle>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.stageBoardDesc")}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {board.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">{t("dashboard.manager.stageBoardEmpty")}</p>
          ) : (
            board.map((s) => (
              <Link
                key={s.stageId}
                href={`/projects/${s.projectId}/stages/${s.stageId}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-3)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.stageName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[var(--muted)]">
                    <FolderKanban className="size-3 shrink-0" />
                    {s.projectName}
                    {s.responsibleName ? ` · ${s.responsibleName}` : ""}
                  </p>
                </div>
                <DeadlineCountdown deadline={s.plannedDeadline} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Payments overview — restricted (director, Finance dept, dept heads) */}
      {showPayments && (
      <Card>
        <CardHeader className="flex-row items-center gap-3 pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--success-soft)]">
            <Wallet className="size-5 text-[var(--success)]" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{t("dashboard.manager.paymentsTitle")}</CardTitle>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.paymentsDesc")}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* stacked label→value rows on mobile (long sums never overlap); 3 columns from sm up */}
          <div className="space-y-2.5 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <p className="text-xs font-medium text-[var(--muted)]">{t("projects.stagePayments.planned")}</p>
              <p className="whitespace-nowrap text-lg font-bold tabular-nums sm:mt-1 sm:text-xl">{money(pay.planned)}</p>
            </div>
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <p className="text-xs font-medium text-[var(--muted)]">{t("projects.stagePayments.paid")}</p>
              <p className="whitespace-nowrap text-lg font-bold tabular-nums text-[var(--success)] sm:mt-1 sm:text-xl">{money(pay.paid)}</p>
            </div>
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <p className="text-xs font-medium text-[var(--muted)]">{t("projects.stagePayments.pending")}</p>
              <p className="whitespace-nowrap text-lg font-bold tabular-nums text-[var(--warning)] sm:mt-1 sm:text-xl">{money(pay.pending)}</p>
            </div>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-3)]">
            {pay.paid > 0 && <div className="bg-[var(--success)] transition-all duration-500" style={{ width: `${paidPct}%` }} title={money(pay.paid)} />}
            {pay.pending > 0 && <div className="bg-[var(--warning)] transition-all duration-500" style={{ width: `${pendingPct}%` }} title={money(pay.pending)} />}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Row: Top performers + Most overdue (people) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--success-soft)]">
              <Trophy className="size-5 text-[var(--success)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.topPerformers")}</CardTitle>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.topPerformersDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">{t("dashboard.manager.noCompletions")}</p>
            ) : (
              top.map((row, i) => (
                <div key={row.userId} className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--success-soft)] text-xs font-bold text-[var(--success)]">
                    {initials(row.fullName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <Link href={`/employees/${row.userId}`} className="truncate font-semibold transition-colors hover:text-[var(--success)]">
                        {row.fullName}
                      </Link>
                      <span className="shrink-0 font-bold tabular-nums text-[var(--success)]">{row.c}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500" style={{ width: `${(row.c / topMax) * 100}%` }} />
                    </div>
                  </div>
                  <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-[var(--subtle)]">#{i + 1}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--danger-soft)]">
              <AlertTriangle className="size-5 text-[var(--danger)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.mostOverdue")}</CardTitle>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.mostOverdueDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {slow.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">{t("dashboard.manager.allOnTrack")}</p>
            ) : (
              slow.map((row, i) => (
                <div key={row.userId} className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--danger-soft)] text-xs font-bold text-[var(--danger)]">
                    {initials(row.fullName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <Link href={`/employees/${row.userId}`} className="truncate font-semibold transition-colors hover:text-[var(--danger)]">
                        {row.fullName}
                      </Link>
                      <span className="shrink-0 font-bold tabular-nums text-[var(--danger)]">{row.c}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div className="h-full rounded-full bg-[var(--danger)] transition-[width] duration-500" style={{ width: `${(row.c / slowMax) * 100}%` }} />
                    </div>
                  </div>
                  <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-[var(--subtle)]">#{i + 1}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department workload — stacked bar */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)]">
            <Layers className="size-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{t("dashboard.manager.deptLoad")}</CardTitle>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.deptLoadDesc")}</p>
          </div>
          <div className="hidden items-center gap-3 text-xs font-semibold sm:flex">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--primary)]" /> {t("status.in_progress")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--warning)]" /> {t("status.under_review")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--danger)]" /> {t("dashboard.manager.overdue")}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {deptLoad.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">{t("dashboard.manager.deptEmpty")}</p>
          ) : (
            deptLoad.map((d) => {
              const total = d.in_progress + d.under_review + d.overdue;
              const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
              return (
                <div key={d.department} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{d.department}</span>
                    <span className="font-bold tabular-nums text-[var(--muted)]">{total}</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    {d.in_progress > 0 && <div title={`${t("status.in_progress")}: ${d.in_progress}`} className="bg-[var(--primary)] transition-all duration-500" style={{ width: `${pct(d.in_progress)}%` }} />}
                    {d.under_review > 0 && <div title={`${t("status.under_review")}: ${d.under_review}`} className="bg-[var(--warning)] transition-all duration-500" style={{ width: `${pct(d.under_review)}%` }} />}
                    {d.overdue > 0 && <div title={`${t("dashboard.manager.overdue")}: ${d.overdue}`} className="bg-[var(--danger)] transition-all duration-500" style={{ width: `${pct(d.overdue)}%` }} />}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
