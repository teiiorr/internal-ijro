import { useTranslations } from "next-intl";
import { IconAlertTriangle as AlertTriangle, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import type { PayableRow } from "@/server/queries/finance";
import { formatMoney } from "./format";

/** Qabul qilinganidan keyin shuncha kundan oshsa — qizil (kechikkan toʻlov). */
export const PAYABLE_AGING_DAYS = 30;

function remainingByCurrency(rows: PayableRow[]): { currency: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.currency, (map.get(r.currency) ?? 0) + r.remaining);
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => (a.currency === "UZS" ? -1 : b.currency === "UZS" ? 1 : a.currency.localeCompare(b.currency)));
}

function PayableItem({ row, kind }: { row: PayableRow; kind: "accepted" | "upcoming" }) {
  const t = useTranslations("staffX.paymentsRegister");
  const days = kind === "accepted" ? row.daysSinceCompleted : row.daysSinceSubmitted;
  const aged = kind === "accepted" && days != null && days > PAYABLE_AGING_DAYS;
  const ageText =
    days == null
      ? null
      : kind === "accepted"
        ? days === 0
          ? t("acceptedToday")
          : t("acceptedAgo", { days })
        : days === 0
          ? t("submittedToday")
          : t("submittedAgo", { days });
  const unpaid = t("unpaidAmount", { amount: formatMoney(row.remaining, row.currency) });

  return (
    <Link
      href={`/projects/${row.projectId}/stages/${row.stageId}`}
      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-2)] sm:px-6"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="break-words text-sm font-semibold text-[var(--ink)]">
          {row.projectName}
          <span className="font-normal text-[var(--ink-2)]">, {row.stageName}</span>
        </p>
        {row.studioName && <p className="truncate t-micro text-[var(--ink-3)]">{row.studioName}</p>}
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          {aged && <AlertTriangle className="size-4 shrink-0 text-[var(--danger)]" aria-hidden />}
          {ageText && (
            <span className={aged ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-3)]"}>{ageText}</span>
          )}
          {ageText && <span className="text-[var(--ink-3)]">,</span>}
          <span className="break-words font-bold tabular-nums text-[var(--warning)]">{unpaid}</span>
        </p>
        <p className="t-micro tabular-nums text-[var(--ink-3)]">
          {t("planned")}: {formatMoney(row.planned, row.currency)}, {t("paid")}: {formatMoney(row.paid, row.currency)}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-[var(--ink-3)] transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function PayablesSection({
  title,
  hint,
  rows,
  kind,
}: {
  title: string;
  hint: string;
  rows: PayableRow[];
  kind: "accepted" | "upcoming";
}) {
  const t = useTranslations("staffX.paymentsRegister");
  const totals = remainingByCurrency(rows);
  const meta = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="text-[var(--ink-3)]">{rows.length}</span>
      {totals.map((x) => (
        <span key={x.currency} className="tabular-nums text-[var(--warning)]">
          {formatMoney(x.amount, x.currency)}
        </span>
      ))}
    </span>
  );
  return (
    <Section title={title} meta={meta}>
      <p className="mb-3 t-small text-[var(--ink-3)]">{hint}</p>
      {rows.length === 0 ? (
        <Card solid className="py-10 text-center t-small text-[var(--ink-3)]">{t("empty")}</Card>
      ) : (
        <Card solid bare className="divide-y divide-[var(--line)]">
          {rows.map((r) => (
            <PayableItem key={r.stageId} row={r} kind={kind} />
          ))}
        </Card>
      )}
    </Section>
  );
}

/** "Toʻlanishi kerak": qabul qilingan, ammo toʻliq toʻlanmagan bosqichlar va kutilayotgan majburiyatlar. */
export function PayablesList({ accepted, upcoming }: { accepted: PayableRow[]; upcoming: PayableRow[] }) {
  const t = useTranslations("staffX.paymentsRegister");
  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <PayablesSection title={t("acceptedUnpaid")} hint={t("acceptedHint", { days: PAYABLE_AGING_DAYS })} rows={accepted} kind="accepted" />
      <PayablesSection title={t("upcoming")} hint={t("upcomingHint")} rows={upcoming} kind="upcoming" />
    </div>
  );
}
