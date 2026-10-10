import { getTranslations, getLocale } from "next-intl/server";
import {
  getProjectStatusBreakdown,
  getProjectTypeBreakdown,
  getProjectPaymentsSummary,
} from "@/server/queries/dashboards";
import { ProjectStatusDonut, ProjectTypeBar } from "@/components/dashboards/lazy-charts";
import type { DerivedStatus } from "@/lib/projects/progress";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { FactList } from "@/components/ui-biib/FactList";

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
  const [statusBreak, typeBreak, pay] = await Promise.all([
    getProjectStatusBreakdown(),
    getProjectTypeBreakdown(locale),
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

  return (
    <>
      {/* Loyihalar tahlili: holat donut + tur bar */}
      <Section title={t("dashboard.manager.projectsByStatus")}>
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
