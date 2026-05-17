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
          <div key={m.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-medium">{m.title}</h4>
                {m.description && <p className="text-sm text-[var(--muted)]">{m.description}</p>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">weight {m.weight}</Badge>
                {m.deadline && <Badge variant="outline">{m.deadline}</Badge>}
                {m.paymentAmount && <Badge variant="outline">{m.paymentAmount}</Badge>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              {canManage ? (
                <Select value={m.status} onValueChange={(v) => start(async () => { await setMilestoneStatus(m.id, v); })}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={m.status === "completed" ? "success" : "secondary"}>{m.status}</Badge>
              )}
              {canChangePayment ? (
                <Select value={m.paymentStatus} onValueChange={(v) => start(async () => { await setMilestonePaymentStatus(m.id, v); })}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY.map((p) => <SelectItem key={p} value={p}>payment: {p}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={m.paymentStatus === "paid" ? "success" : m.paymentStatus === "partial" ? "warning" : "secondary"}>payment: {m.paymentStatus}</Badge>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-[var(--muted)]">{t("projects.milestones.noMilestones")}</p>}
      </div>
      {canManage && (
        adding ? (
          <form onSubmit={onAdd} className="border rounded-lg p-3 space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <div className="space-y-1 md:col-span-2"><Label>{t("projects.milestones.title")}</Label><Input name="title" required /></div>
              <div className="space-y-1"><Label>{t("projects.milestones.deadline")}</Label><Input name="deadline" type="date" /></div>
              <div className="space-y-1"><Label>{t("projects.milestones.weight")}</Label><Input name="weight" type="number" defaultValue={1} min={1} /></div>
              <div className="space-y-1"><Label>{t("projects.milestones.paymentAmount")}</Label><Input name="paymentAmount" type="number" step="0.01" /></div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>{t("projects.milestones.addBtn")}</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>{t("common.cancel")}</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>{t("projects.milestones.addBtn")}</Button>
        )
      )}
    </div>
  );
}
