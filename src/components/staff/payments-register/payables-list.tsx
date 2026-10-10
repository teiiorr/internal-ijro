import { useTranslations } from "next-intl";
import { IconAlertTriangle as AlertTriangle, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
    <li>
      <Link
        href={`/projects/${row.projectId}/stages/${row.stageId}`}
        className={cn(
          "group flex items-center gap-3 rounded-2xl border p-4 shadow-[var(--shadow-1)] transition-colors",
          aged
            ? "border-[var(--danger)] bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)]"
            : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--surface-2)]",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-sm font-semibold">
            {row.projectName}
            <span className="font-normal text-[var(--muted)]"> · {row.stageName}</span>
          </p>
          {row.studioName && <p className="truncate text-xs text-[var(--muted)]">{row.studioName}</p>}
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            {aged && <AlertTriangle className="size-4 shrink-0 text-[var(--danger)]" aria-hidden />}
            {ageText && (
              <span className={aged ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"}>{ageText}</span>
            )}
            {ageText && <span className="text-[var(--subtle)]">·</span>}
            <span className="break-words font-bold tabular-nums text-[var(--warning)]">{unpaid}</span>
          </p>
          <p className="text-xs tabular-nums text-[var(--subtle)]">
            {t("planned")}: {formatMoney(row.planned, row.currency)} · {t("paid")}: {formatMoney(row.paid, row.currency)}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}

function Section({
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
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            {title}
            <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--muted)]">{rows.length}</span>
          </h2>
          <p className="text-sm text-[var(--muted)]">{hint}</p>
        </div>
        {totals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {totals.map((x) => (
              <span
                key={x.currency}
                className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-sm font-bold tabular-nums"
              >
                <span className="font-semibold text-[var(--muted)]">{t("totals", { currency: x.currency })}: </span>
                {formatMoney(x.amount, x.currency)}
              </span>
            ))}
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--muted)]">{t("empty")}</CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <PayableItem key={r.stageId} row={r} kind={kind} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Toʻlanishi kerak": qabul qilingan, ammo toʻliq toʻlanmagan bosqichlar va kutilayotgan majburiyatlar. */
export function PayablesList({ accepted, upcoming }: { accepted: PayableRow[]; upcoming: PayableRow[] }) {
  const t = useTranslations("staffX.paymentsRegister");
  return (
    <div className="space-y-8">
      <Section title={t("acceptedUnpaid")} hint={t("acceptedHint", { days: PAYABLE_AGING_DAYS })} rows={accepted} kind="accepted" />
      <Section title={t("upcoming")} hint={t("upcomingHint")} rows={upcoming} kind="upcoming" />
    </div>
  );
}
