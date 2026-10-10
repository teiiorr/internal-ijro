"use client";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconCircleCheck as CheckCircle,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui-biib/Card";
import { Status } from "@/components/ui-biib/Status";
import { formatDate } from "@/lib/dates";
import { setStagePaymentStatus } from "@/server/actions/stages";
import type { CurrencyTotal, RegisterRow } from "@/server/queries/finance";
import { RegisterFiltersBar } from "./register-filters";
import { formatMoney } from "./format";

type Opt = { id: string; name: string };

export type RegisterTableProps = {
  rows: RegisterRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: CurrencyTotal[];
  /** canEditMoney — "Toʻlandi" tugmasi faqat shunda koʻrinadi (server action ham qayta tekshiradi). */
  canEdit: boolean;
  studios: Opt[];
  projects: (Opt & { studioId: string | null })[];
  types: Opt[];
};

function MarkPaidButton({ paymentId, className }: { paymentId: string; className?: string }) {
  const t = useTranslations("staffX.paymentsRegister");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      try {
        await setStagePaymentStatus(paymentId, "paid");
        toast.success(t("markedPaid"));
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  return (
    <Button type="button" variant="soft" size="sm" onClick={onClick} disabled={pending} className={className}>
      <CheckCircle className="size-4" />
      {t("markPaid")}
    </Button>
  );
}

function StatusChip({ status }: { status: string }) {
  const t = useTranslations("staffX.paymentsRegister");
  const paid = status === "paid";
  return <Status tone={paid ? "success" : "warning"}>{paid ? t("paid") : t("pending")}</Status>;
}

/** Barcha loyihalar boʻyicha bosqich toʻlovlari reestri: filtrlar, valyuta kesimidagi jami, jadval/kartalar, sahifalash. */
export function RegisterTable({ rows, total, page, pageSize, totals, canEdit, studios, projects, types }: RegisterTableProps) {
  const t = useTranslations("staffX.paymentsRegister");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [navigating, startNav] = useTransition();

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const firstIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastIdx = Math.min(total, page * pageSize);

  function goTo(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    startNav(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true }));
  }

  const dateOf = (r: RegisterRow) => formatDate(r.paidAt ?? r.createdAt, locale);
  const amountTone = (r: RegisterRow) => (r.status === "paid" ? "text-[var(--success)]" : "text-[var(--warning)]");
  const stageHref = (r: RegisterRow) => `/projects/${r.projectId}/stages/${r.stageId}`;

  return (
    <div className="space-y-4">
      <RegisterFiltersBar studios={studios} projects={projects} types={types} />

      {/* Valyuta kesimidagi jami — UZS va USD hech qachon qoʻshilmaydi (bitta idish) */}
      {totals.length > 0 && (
        <Card solid>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {totals.map((tot) => (
              <div key={tot.currency} className="min-w-0">
                <p className="t-label text-[var(--ink-3)]">{t("totals", { currency: tot.currency })}</p>
                <div className="mt-1.5 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-2)]">{t("paid")}</span>
                    <span className="break-all text-right font-bold tabular-nums text-[var(--success)]">{formatMoney(tot.paid, tot.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-2)]">{t("pending")}</span>
                    <span className="break-all text-right font-bold tabular-nums text-[var(--warning)]">{formatMoney(tot.pending, tot.currency)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card solid className="py-14 text-center t-small text-[var(--ink-3)]">{t("empty")}</Card>
      ) : (
        <div className={navigating ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {/* Desktop jadval — keng boʻlsa gorizontal suriladi */}
          <Card solid bare className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[12px] font-semibold text-[var(--ink-2)]">
                <tr>
                  <th className="px-4 py-3">{t("date")}</th>
                  <th className="px-4 py-3">{t("project")}</th>
                  <th className="px-4 py-3">{t("stage")}</th>
                  <th className="px-4 py-3 text-right">{t("amount")}</th>
                  <th className="px-4 py-3 text-right">{t("planned")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3">{t("note")}</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.paymentId} className="border-t border-[var(--border)] align-top transition-colors hover:bg-[var(--surface-2)]">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{dateOf(r)}</td>
                    <td className="max-w-[240px] px-4 py-3">
                      <Link href={`/projects/${r.projectId}`} className="block truncate font-semibold hover:text-[var(--primary)]" title={r.projectName}>
                        {r.projectName}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted)]">{r.studioName ?? "—"}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <Link href={stageHref(r)} className="block truncate font-medium hover:text-[var(--primary)]" title={r.stageName}>
                        {r.stageName}
                      </Link>
                      {r.contractNumber && (
                        <p className="truncate text-xs text-[var(--muted)]">
                          {t("contract")} {r.contractNumber}
                        </p>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums ${amountTone(r)}`}>
                      {formatMoney(r.amount, r.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[var(--muted)]">
                      {r.plannedAmount != null ? formatMoney(r.plannedAmount, r.projectCurrency) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {r.note && <p className="line-clamp-2 break-words text-xs">{r.note}</p>}
                      <p className="truncate text-xs text-[var(--muted)]">{r.createdByName ?? "—"}</p>
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {r.status !== "paid" && <MarkPaidButton paymentId={r.paymentId} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobil ro'yxat — ajratuvchi qatorlar */}
          <Card solid bare className="divide-y divide-[var(--line)] md:hidden">
            {rows.map((r) => (
              <div key={r.paymentId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className={`min-w-0 break-words text-base font-bold tabular-nums ${amountTone(r)}`}>{formatMoney(r.amount, r.currency)}</p>
                  <StatusChip status={r.status} />
                </div>
                <Link href={stageHref(r)} className="mt-2 block min-w-0">
                  <p className="break-words text-sm font-semibold text-[var(--ink)]">{r.projectName}</p>
                  <p className="break-words text-sm text-[var(--ink-2)]">
                    {r.stageName}
                    {r.contractNumber ? `, ${t("contract")} ${r.contractNumber}` : ""}
                  </p>
                </Link>
                <p className="mt-1 truncate text-xs text-[var(--ink-3)]">
                  {dateOf(r)}, {r.studioName ?? "—"}
                </p>
                {r.plannedAmount != null && (
                  <p className="mt-1 text-xs text-[var(--ink-3)]">
                    {t("planned")}: <span className="tabular-nums">{formatMoney(r.plannedAmount, r.projectCurrency)}</span>
                  </p>
                )}
                {r.note && <p className="mt-1 break-words text-xs text-[var(--ink-2)]">{r.note}</p>}
                {r.createdByName && (
                  <p className="mt-1 truncate text-xs text-[var(--ink-3)]">
                    {t("createdBy")}: {r.createdByName}
                  </p>
                )}
                {canEdit && r.status !== "paid" && <MarkPaidButton paymentId={r.paymentId} className="mt-3 w-full" />}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Sahifalash */}
      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm tabular-nums text-[var(--muted)]">{t("showing", { from: firstIdx, to: lastIdx, total })}</p>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1 || navigating} onClick={() => goTo(page - 1)}>
                <ChevronLeft className="size-4" />
                {t("prev")}
              </Button>
              <span className="min-w-16 text-center text-sm font-semibold tabular-nums">
                {page} / {pages}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={page >= pages || navigating} onClick={() => goTo(page + 1)}>
                {t("next")}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
