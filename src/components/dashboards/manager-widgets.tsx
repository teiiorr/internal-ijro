import { getTranslations, getLocale } from "next-intl/server";
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
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { FactList } from "@/components/ui-biib/FactList";
import { IconLayoutKanban as FolderKanban } from "@tabler/icons-react";

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} UZS`;

// Chart ranglari (recharts SVG fill CSS oʻzgaruvchilarni hisoblamaydi).
const STATUS_HEX: Record<DerivedStatus, string> = {
  in_progress: "#2563eb",
  completed: "#16a34a",
  on_hold: "#e08c10",
  not_started: "#94a3b8",
};

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

  // KPI raqamlari — plitka emas, seksiya meta sifatida rangli matn (A4.4.5).
  const boardMeta = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {kpi.overdueStages > 0 && <span className="text-[var(--danger)]">{t("dashboard.manager.kpiOverdueStages")}: {kpi.overdueStages}</span>}
      {kpi.dueSoonStages > 0 && <span className="text-[var(--warning)]">{t("dashboard.manager.kpiDueSoon")}: {kpi.dueSoonStages}</span>}
      {kpi.overdueTasks > 0 && <span className="text-[var(--danger)]">{t("dashboard.manager.kpiOverdueTasks")}: {kpi.overdueTasks}</span>}
    </span>
  );

  return (
    <>
      {/* Bosqich muddatlari — dashboardning amaliy markazi */}
      <Section
        title={t("dashboard.manager.stageBoard")}
        meta={boardMeta}
        seeAllHref="/projects?overdue=1"
        seeAllLabel={t("common.all")}
      >
        <Card bare className="px-5 sm:px-6">
          {board.length === 0 ? (
            <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("dashboard.manager.stageBoardEmpty")}</p>
          ) : (
            <Rows>
              {board.map((s) => (
                <Row key={s.stageId} href={`/projects/${s.projectId}/stages/${s.stageId}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{s.stageName}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate t-small text-[var(--ink-3)]">
                      <FolderKanban className="size-3.5 shrink-0" aria-hidden />
                      {s.projectName}
                      {s.responsibleName ? `, ${s.responsibleName}` : ""}
                    </p>
                  </div>
                  <DeadlineCountdown deadline={s.plannedDeadline} />
                </Row>
              ))}
            </Rows>
          )}
        </Card>
      </Section>

      {/* Loyihalar tahlili: holat donut + tur bar */}
      <Section title={t("dashboard.manager.projectsByStatus")} meta={`${t("dashboard.manager.kpiActiveProjects")}: ${kpi.activeProjects}`}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <h3 className="text-[0.9375rem] font-bold text-[var(--ink)]">{t("dashboard.manager.projectsByStatus")}</h3>
            <p className="mt-0.5 mb-3 t-small text-[var(--ink-3)]">{t("dashboard.manager.projectsByStatusDesc")}</p>
            <ProjectStatusDonut data={donut} centerLabel={t("dashboard.manager.projectsTotal")} />
          </Card>
          <Card>
            <h3 className="text-[0.9375rem] font-bold text-[var(--ink)]">{t("dashboard.manager.projectsByType")}</h3>
            <p className="mt-0.5 mb-3 t-small text-[var(--ink-3)]">{t("dashboard.manager.projectsByTypeDesc")}</p>
            <ProjectTypeBar data={typeBreak} />
          </Card>
        </div>
      </Section>

      {/* Toʻlovlar sharhi — cheklangan */}
      {showPayments && (
        <Section title={t("dashboard.manager.paymentsTitle")}>
          <Card>
            <FactList
              items={[
                { term: t("projects.stagePayments.planned"), value: <span className="font-bold tabular-nums">{money(pay.planned)}</span> },
                { term: t("projects.stagePayments.paid"), value: <span className="font-bold tabular-nums text-[var(--success)]">{money(pay.paid)}</span> },
                { term: t("projects.stagePayments.pending"), value: <span className="font-bold tabular-nums text-[var(--warning)]">{money(payRemaining)}</span> },
              ]}
            />
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-[var(--radius-s)] bg-[var(--surface-2)]">
              {pay.paid > 0 && <div className="bg-[var(--success)] transition-all duration-500" style={{ width: `${paidPct}%` }} title={money(pay.paid)} />}
              {payRemaining > 0 && <div className="bg-[var(--warning)] transition-all duration-500" style={{ width: `${pendingPct}%` }} title={money(payRemaining)} />}
            </div>
          </Card>
        </Section>
      )}
    </>
  );
}
