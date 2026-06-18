"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMilestone, setMilestoneStatus, setMilestonePaymentStatus } from "@/server/actions/projects";

type M = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  weight: number;
  paymentAmount: string | null;
  paymentStatus: string;
  status: string;
};

const STATUSES = ["pending", "in_progress", "completed"] as const;
const PAY = ["pending", "partial", "paid"] as const;

export function MilestonesList({ projectId, items, canManage, canChangePayment }: { projectId: string; items: M[]; canManage: boolean; canChangePayment: boolean }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await createMilestone({
        projectId,
        title: String(fd.get("title") ?? ""),
        orderIndex: 0,
        deadline: (fd.get("deadline") as string) || null,
        weight: Number(fd.get("weight") ?? 1),
        paymentAmount: fd.get("paymentAmount") ? Number(fd.get("paymentAmount")) : null,
      });
      setAdding(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((m) => (
          <div key={m.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-semibold">{m.title}</h4>
                {m.description && <p className="text-sm text-[var(--muted)]">{m.description}</p>}
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="secondary">{t("projects.milestones.weight")}: {m.weight}</Badge>
                {m.deadline && <Badge variant="outline">{m.deadline}</Badge>}
                {m.paymentAmount && <Badge variant="outline">{m.paymentAmount}</Badge>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              {canManage ? (
                <Select value={m.status} onValueChange={(v) => start(async () => { await setMilestoneStatus(m.id, v); })}>
                  <SelectTrigger className="w-48 h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}` as "status.pending")}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={m.status === "completed" ? "success" : "secondary"}>{t(`status.${m.status}` as "status.pending")}</Badge>
              )}
              {canChangePayment ? (
                <Select value={m.paymentStatus} onValueChange={(v) => start(async () => { await setMilestonePaymentStatus(m.id, v); })}>
                  <SelectTrigger className="w-48 h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY.map((p) => <SelectItem key={p} value={p}>{t("projects.milestones.paymentLabel")}: {t(`projects.milestones.payment.${p}` as "projects.milestones.payment.pending")}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={m.paymentStatus === "paid" ? "success" : m.paymentStatus === "partial" ? "warning" : "secondary"}>
                  {t("projects.milestones.paymentLabel")}: {t(`projects.milestones.payment.${m.paymentStatus}` as "projects.milestones.payment.pending")}
                </Badge>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-[var(--muted)]">{t("projects.milestones.noMilestones")}</p>}
      </div>
      {canManage && (
        adding ? (
          <form onSubmit={onAdd} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2"><Label>{t("projects.milestones.title")}</Label><Input name="title" required /></div>
              <div className="space-y-2"><Label>{t("projects.milestones.deadline")}</Label><Input name="deadline" type="date" /></div>
              <div className="space-y-2"><Label>{t("projects.milestones.weight")}</Label><Input name="weight" type="number" defaultValue={1} min={1} /></div>
              <div className="space-y-2"><Label>{t("projects.milestones.paymentAmount")}</Label><Input name="paymentAmount" type="number" step="0.01" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={pending}>{t("projects.milestones.addBtn")}</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>{t("projects.milestones.addBtn")}</Button>
        )
      )}
    </div>
  );
}
