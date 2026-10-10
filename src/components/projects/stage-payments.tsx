"use client";
import { useTranslations, useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Status } from "@/components/ui-biib/Status";
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
  // false bölsa, barcha raqamlar "***" körinişida körsatiladi (pulni faqat ruxsat röyxatidagilar köradi).
  showMoney?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
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
      {/* jami / reja va tölangan — rangli raqamlar, ramkasiz */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-2)]">{t("projects.stagePayments.paid")}</span>
          <span className="whitespace-nowrap font-bold tabular-nums text-[var(--success)]">{fmt(paid, currency)}</span>
        </div>
        {plannedAmount != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-2)]">{t("projects.stagePayments.planned")}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums text-[var(--ink)]">{fmt(plannedAmount, currency)}</span>
          </div>
        )}
        {pendingSum > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-2)]">{t("projects.stagePayments.pending")}</span>
            <span className="whitespace-nowrap font-bold tabular-nums text-[var(--warning)]">{fmt(pendingSum, currency)}</span>
          </div>
        )}
        {plannedPct != null && (
          <>
            <div className="flex items-center justify-between pt-1 t-micro">
              <span className="font-semibold tabular-nums text-[var(--ink-3)]">{plannedPct}%</span>
              {fullyPaid && (
                <Status tone="success" className="gap-1">
                  <CheckCircle2 className="size-3.5" />
                  {t("projects.stagePayments.fullyPaid")}
                </Status>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full bg-[var(--success)] transition-[width] duration-300" style={{ width: `${plannedPct}%` }} />
            </div>
          </>
        )}
      </div>

      {/* röyxat — ajratuvchi qatorlar, summa holat böyicha ranglangan */}
      <ul className="-mt-1 divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {payments.map((p) => (
          <li key={p.id} className="space-y-2 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold tabular-nums ${p.status === "paid" ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {fmt(Number(p.amount), p.currency)}
                </p>
                <p className="t-micro text-[var(--ink-3)] truncate">
                  {p.note ? `${p.note}, ` : ""}
                  {p.status === "paid" && p.paidAt ? formatDate(p.paidAt as Date, locale) : formatDate(p.createdAt as Date, locale)}
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
        {payments.length === 0 && <li className="py-3 t-small text-[var(--ink-3)]">{t("projects.stagePayments.empty")}</li>}
      </ul>

      {/* qöşiş — tor ustunlarda çiroyli tarzda qatorga öradi */}
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
