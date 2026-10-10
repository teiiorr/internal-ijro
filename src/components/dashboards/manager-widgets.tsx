import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProjectStageKpis,
  getProjectStatusBreakdown,
  getProjectTypeBreakdown,
  getStageDeadlineBoard,
  getProjectPaymentsSummary,
} from "@/server/queries/dashboards";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { ProjectStatusDonut, ProjectTypeBar } from "@/components/dashboards/lazy-charts";
import type { DerivedStatus } from "@/lib/projects/progress";
import {
  IconLayoutKanban as FolderKanban,
  IconCalendarClock as CalendarClock,
  IconCalendarX as CalendarX2,
  IconListCheck as ListChecks,
  IconChevronRight as ChevronRight,
  IconChartPie as PieChart,
  IconChartBar as BarChart3,
  IconWallet as Wallet,
} from "@tabler/icons-react";

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} UZS`;

// Chart ranglari (recharts SVG fill CSS o'zgaruvchilarni hisoblamaydi) — yangi palitra.
const STATUS_HEX: Record<DerivedStatus, string> = {
  in_progress: "#2563eb",
  completed: "#16a34a",
  on_hold: "#e08c10",
  not_started: "#94a3b8",
};

const KPI_TONE = {
  primary: { chip: "bg-[var(--primary-soft)]", icon: "text-[var(--primary)]", value: "" },
  danger: { chip: "bg-[var(--danger-soft)]", icon: "text-[var(--danger)]", value: "text-[var(--danger)]" },
  warning: { chip: "bg-[var(--warning-soft)]", icon: "text-[var(--warning)]", value: "" },
} as const;

export async function ManagerWidgets({ showPayments = false }: { showPayments?: boolean }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const [kpi, statusBreak, typeBreak, board, pay] = await Promise.all([
    getProjectStageKpis(),
    getProjectStatusBreakdown(),
    getProjectTypeBreakdown(locale),
    getStageDeadlineBoard(locale, 8),
    getProjectPaymentsSummary(),
  ]);

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

  const payRemaining = Math.max(0, pay.planned - pay.paid);
  const payBase = Math.max(pay.planned, pay.paid, 1);
  const paidPct = (pay.paid / payBase) * 100;
  const pendingPct = (payRemaining / payBase) * 100;

  return (
    <div className="space-y-6">
      {/* Ixcham KPI qatori */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const tone = KPI_TONE[k.tone];
          return (
            <Link
              key={k.key}
              href={k.href}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]"
            >
              <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone.chip}`}>
                <k.icon className={`size-5 ${tone.icon}`} stroke={1.75} />
              </div>
              <div className="min-w-0">
                <div className={`text-2xl font-extrabold leading-none tabular-nums ${tone.value}`}>{k.value}</div>
                <div className="mt-1 truncate text-xs font-medium text-[var(--muted)]">{k.label}</div>
              </div>
              <ChevronRight className="ml-auto size-4 shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
            </Link>
          );
        })}
      </div>

      {/* Loyihalar tahlili: holat donut + tur bar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

      {/* Bosqich muddatlari taxtasi — dashboardning amaliy markazi */}
      <Card id="stage-board" className="scroll-mt-24">
        <CardHeader className="flex-row items-center gap-3 pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--warning-soft)]">
            <CalendarClock className="size-5 text-[var(--warning)]" />
          </div>
          <div className="min-w-0 flex-1">
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

      {/* To'lovlar sharhi — cheklangan (direktor, Moliya bo'limi, bo'lim boshliqlari) */}
      {showPayments && (
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--success-soft)]">
              <Wallet className="size-5 text-[var(--success)]" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg">{t("dashboard.manager.paymentsTitle")}</CardTitle>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.manager.paymentsDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="whitespace-nowrap text-lg font-bold tabular-nums text-[var(--warning)] sm:mt-1 sm:text-xl">{money(payRemaining)}</p>
              </div>
            </div>
            <div className="flex h-3 overflow-hidden rounded-md bg-[var(--surface-3)]">
              {pay.paid > 0 && <div className="bg-[var(--success)] transition-all duration-500" style={{ width: `${paidPct}%` }} title={money(pay.paid)} />}
              {payRemaining > 0 && <div className="bg-[var(--warning)] transition-all duration-500" style={{ width: `${pendingPct}%` }} title={money(payRemaining)} />}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
