import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { cn } from "@/lib/utils";
import type { BudgetMismatchRow, MissingAmountsRow, OverpaidRow } from "@/server/queries/finance";
import { formatMoney } from "./format";

const ROW = "block px-5 py-3 transition-colors hover:bg-[var(--surface-2)] sm:px-6";

function AnomalySection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: StatusTone;
  children: ReactNode;
}) {
  const t = useTranslations("staffX.paymentsRegister");
  const active = count > 0;
  return (
    <Section
      title={title}
      meta={active ? <Status tone={tone} dot>{count}</Status> : <Status tone="success" dot>{count}</Status>}
    >
      {active ? (
        <Card solid bare className="max-h-[480px] divide-y divide-[var(--line)] overflow-y-auto overscroll-contain">
          {children}
        </Card>
      ) : (
        <Card solid className="py-8 text-center t-small text-[var(--ink-3)]">{t("noAnomalies")}</Card>
      )}
    </Section>
  );
}

/** Uch xil moliyaviy nomuvofiqlik: rejadan ortiq toʻlov, byudjet ≠ bosqichlar summasi, summasiz bosqichlar. */
export function AnomaliesPanel({
  overpaid,
  budgetMismatch,
  missingAmounts,
}: {
  overpaid: OverpaidRow[];
  budgetMismatch: BudgetMismatchRow[];
  missingAmounts: MissingAmountsRow[];
}) {
  const t = useTranslations("staffX.paymentsRegister");
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-3 xl:gap-10">
      <AnomalySection title={t("overpaid")} count={overpaid.length} tone="danger">
        {overpaid.map((r) => (
          <Link key={r.stageId} href={`/projects/${r.projectId}/stages/${r.stageId}`} className={ROW}>
            <p className="break-words text-sm font-semibold text-[var(--ink)]">
              {r.projectName}
              <span className="font-normal text-[var(--ink-2)]">, {r.stageName}</span>
            </p>
            <p className="mt-1 t-micro tabular-nums text-[var(--ink-3)]">
              {t("planned")}: {formatMoney(r.planned, r.currency)}, {t("paid")}: {formatMoney(r.paid, r.currency)}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--danger)]">
              {t("overpaidBy", { amount: formatMoney(r.over, r.currency) })}
            </p>
          </Link>
        ))}
      </AnomalySection>

      <AnomalySection title={t("budgetMismatch")} count={budgetMismatch.length} tone="warning">
        {budgetMismatch.map((r) => {
          const diff = r.stagesTotal - r.budget;
          return (
            <Link key={r.projectId} href={`/projects/${r.projectId}`} className={ROW}>
              <p className="break-words text-sm font-semibold text-[var(--ink)]">{r.projectName}</p>
              <p className="mt-1 t-micro tabular-nums text-[var(--ink-3)]">
                {t("budget")}: {formatMoney(r.budget, r.currency)}
              </p>
              <p className="t-micro tabular-nums text-[var(--ink-3)]">
                {t("stagesTotal")}: {formatMoney(r.stagesTotal, r.currency)}
              </p>
              <p className={cn("mt-0.5 text-sm font-bold tabular-nums", diff > 0 ? "text-[var(--danger)]" : "text-[var(--warning)]")}>
                {t("difference")}: {diff > 0 ? "+" : ""}
                {formatMoney(diff, r.currency)}
              </p>
            </Link>
          );
        })}
      </AnomalySection>

      <AnomalySection title={t("missingAmounts")} count={missingAmounts.length} tone="warning">
        {missingAmounts.map((r) => (
          <Link key={r.projectId} href={`/projects/${r.projectId}`} className={ROW}>
            <p className="break-words text-sm font-semibold text-[var(--ink)]">{r.projectName}</p>
            <p className="mt-1 t-micro text-[var(--ink-3)]">
              {t("missingOf", { missing: r.missingCount, total: r.totalStages })}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full bg-[var(--warning)]"
                style={{ width: `${r.totalStages > 0 ? Math.round((r.missingCount / r.totalStages) * 100) : 0}%` }}
              />
            </div>
          </Link>
        ))}
      </AnomalySection>
    </div>
  );
}
