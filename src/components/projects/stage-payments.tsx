"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { IconTrash as Trash2, IconPlus as Plus, IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";
import { addStagePayment, setStagePaymentStatus, deleteStagePayment } from "@/server/actions/stages";
import { formatDate } from "@/lib/dates";

type Payment = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: Date | string | null;
  note: string | null;
  createdAt: Date | string;
};

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

export function StagePayments({
  stageId,
  payments,
  plannedAmount,
  canManage,
  showMoney = true,
}: {
  stageId: string;
  payments: Payment[];
  plannedAmount: number | null;
  canManage: boolean;
  // When false, all figures are shown as "***" (money visible only to the allowlist).
  showMoney?: boolean;
}) {
  const t = useTranslations();
  const fmt = (amount: number, currency: string) => (showMoney ? money(amount, currency) : "***");
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const paid = payments.filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount), 0);
  const pendingSum = payments.filter((p) => p.status !== "paid").reduce((a, p) => a + Number(p.amount), 0);
  const currency = payments[0]?.currency ?? "UZS";
  const plannedPct = plannedAmount && plannedAmount > 0 ? Math.min(100, Math.round((paid / plannedAmount) * 100)) : null;
  const fullyPaid = plannedAmount != null && plannedAmount > 0 && paid >= plannedAmount;

  function add() {
    setError(null);
    const val = Number(amount);
    if (!val || val <= 0) { setError(t("projects.stagePayments.invalidAmount")); return; }
    start(async () => {
      try {
        await addStagePayment({ stageId, amount: val, currency: "UZS", note: note || null, status: "pending" });
        setAmount(""); setNote("");
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <div className="space-y-4">
      {/* totals / planned-vs-paid — dashed frame, coloured figures, no grey fill */}
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">{t("projects.stagePayments.paid")}</span>
          <span className="whitespace-nowrap font-bold tabular-nums text-[var(--success)]">{fmt(paid, currency)}</span>
        </div>
        {plannedAmount != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">{t("projects.stagePayments.planned")}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums">{fmt(plannedAmount, currency)}</span>
          </div>
        )}
        {pendingSum > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">{t("projects.stagePayments.pending")}</span>
            <span className="whitespace-nowrap font-bold tabular-nums text-[var(--warning)]">{fmt(pendingSum, currency)}</span>
          </div>
        )}
        {plannedPct != null && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tabular-nums text-[var(--muted)]">{plannedPct}%</span>
              {fullyPaid && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/12 px-2 py-0.5 text-xs font-bold text-[var(--success)]">
                  <CheckCircle2 className="size-3.5" />
                  {t("projects.stagePayments.fullyPaid")}
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full bg-[var(--success)] transition-[width] duration-300" style={{ width: `${plannedPct}%` }} />
            </div>
          </>
        )}
      </div>

      {/* list — dashed rows, amount coloured by status (green paid / amber pending) */}
      <ul className="space-y-2">
        {payments.map((p) => (
          <li key={p.id} className="rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold tabular-nums ${p.status === "paid" ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {fmt(Number(p.amount), p.currency)}
                </p>
                <p className="text-xs text-[var(--muted)] truncate">
                  {p.note ? `${p.note} · ` : ""}
                  {p.status === "paid" && p.paidAt ? formatDate(p.paidAt as Date) : formatDate(p.createdAt as Date)}
                </p>
              </div>
              {canManage && (
                <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={t("common.delete")} onClick={() => start(async () => { await deleteStagePayment(p.id); })}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            {canManage && (
              <Button
                variant={p.status === "paid" ? "ghost" : "outline"}
                size="sm"
                className="w-full"
                disabled={pending}
                onClick={() => start(async () => { await setStagePaymentStatus(p.id, p.status === "paid" ? "pending" : "paid"); })}
              >
                {p.status === "paid" ? t("projects.stagePayments.markPending") : t("projects.stagePayments.markPaid")}
              </Button>
            )}
          </li>
        ))}
        {payments.length === 0 && <li className="text-sm text-[var(--muted)]">{t("projects.stagePayments.empty")}</li>}
      </ul>

      {/* add — wraps gracefully in narrow columns */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <MoneyInput placeholder={t("projects.stagePayments.amount")} value={amount} onValueChange={setAmount} className="w-36 flex-none" />
          <Input placeholder={t("projects.stagePayments.note")} value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 min-w-[150px]" />
          <Button onClick={add} disabled={pending} className="flex-none"><Plus className="size-4" />{t("projects.stagePayments.add")}</Button>
        </div>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
