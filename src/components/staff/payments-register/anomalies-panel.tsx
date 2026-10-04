import { useTranslations } from "next-intl";
import {
  IconAlertOctagon as AlertOctagon,
  IconCircleCheck as CircleCheck,
  IconFileAlert as FileAlert,
  IconScale as Scale,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BudgetMismatchRow, MissingAmountsRow, OverpaidRow } from "@/server/queries/finance";
import { formatMoney } from "./format";

const ROW =
  "block rounded-xl border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-2)]";

function AnomalyCard({
  icon: Icon,
  title,
  count,
  tone,
  children,
}: {
  icon: typeof AlertOctagon;
  title: string;
  count: number;
  tone: "danger" | "warning";
  children: React.ReactNode;
}) {
  const t = useTranslations("staffX.paymentsRegister");
  const active = count > 0;
  return (
    <Card className="min-w-0">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              !active && "bg-[var(--success-soft)] text-[var(--success)]",
              active && tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)]",
              active && tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning)]",
            )}
          >
            {active ? <Icon className="size-5" /> : <CircleCheck className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-base font-bold leading-snug">{title}</h3>
            <p className="text-3xl font-black tabular-nums">{count}</p>
          </div>
        </div>
        {active ? (
          <ul className="max-h-[480px] space-y-2 overflow-y-auto overscroll-contain pr-1">{children}</ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("noAnomalies")}</p>
        )}
      </CardContent>
    </Card>
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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <AnomalyCard icon={AlertOctagon} title={t("overpaid")} count={overpaid.length} tone="danger">
        {overpaid.map((r) => (
          <li key={r.stageId}>
            <Link href={`/projects/${r.projectId}/stages/${r.stageId}`} className={ROW}>
              <p className="break-words text-sm font-semibold">
                {r.projectName}
                <span className="font-normal text-[var(--muted)]"> · {r.stageName}</span>
              </p>
              <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                {t("planned")}: {formatMoney(r.planned, r.currency)} · {t("paid")}: {formatMoney(r.paid, r.currency)}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--danger)]">
                {t("overpaidBy", { amount: formatMoney(r.over, r.currency) })}
              </p>
            </Link>
          </li>
        ))}
      </AnomalyCard>

      <AnomalyCard icon={Scale} title={t("budgetMismatch")} count={budgetMismatch.length} tone="warning">
        {budgetMismatch.map((r) => {
          const diff = r.stagesTotal - r.budget;
          return (
            <li key={r.projectId}>
              <Link href={`/projects/${r.projectId}`} className={ROW}>
                <p className="break-words text-sm font-semibold">{r.projectName}</p>
                <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                  {t("budget")}: {formatMoney(r.budget, r.currency)}
                </p>
                <p className="text-xs tabular-nums text-[var(--muted)]">
                  {t("stagesTotal")}: {formatMoney(r.stagesTotal, r.currency)}
                </p>
                <p className={cn("mt-0.5 text-sm font-bold tabular-nums", diff > 0 ? "text-[var(--danger)]" : "text-[var(--warning)]")}>
                  {t("difference")}: {diff > 0 ? "+" : ""}
                  {formatMoney(diff, r.currency)}
                </p>
              </Link>
            </li>
          );
        })}
      </AnomalyCard>

      <AnomalyCard icon={FileAlert} title={t("missingAmounts")} count={missingAmounts.length} tone="warning">
        {missingAmounts.map((r) => (
          <li key={r.projectId}>
            <Link href={`/projects/${r.projectId}`} className={ROW}>
              <p className="break-words text-sm font-semibold">{r.projectName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("missingOf", { missing: r.missingCount, total: r.totalStages })}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full bg-[var(--warning)]"
                  style={{ width: `${r.totalStages > 0 ? Math.round((r.missingCount / r.totalStages) * 100) : 0}%` }}
                />
              </div>
            </Link>
          </li>
        ))}
      </AnomalyCard>
    </div>
  );
}
