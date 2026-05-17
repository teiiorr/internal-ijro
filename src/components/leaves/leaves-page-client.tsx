"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveLeave, rejectLeave, requestLeave } from "@/server/actions/leaves";

type Leave = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
  rejectionReason: string | null;
  userName?: string;
};

export function LeavesPageClient({
  myLeaves,
  pendingForReview,
  canManage,
}: {
  myLeaves: Leave[];
  pendingForReview: Leave[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("leaves.pageTitle")}</h1>
        {open ? null : <Button onClick={() => setOpen(true)}>{t("leaves.request")}</Button>}
      </div>

      {open && (
        <Card><CardContent className="p-6">
          <form action={(fd) => start(async () => { await requestLeave(fd); setOpen(false); })} className="grid gap-3 md:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label>{t("leaves.fields.type")}</Label>
              <Select name="type" defaultValue="vacation">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">{t("leaves.types.vacation")}</SelectItem>
                  <SelectItem value="sick">{t("leaves.types.sick")}</SelectItem>
                  <SelectItem value="unpaid">{t("leaves.types.unpaid")}</SelectItem>
                  <SelectItem value="other">{t("leaves.types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("leaves.fields.start")}</Label><Input name="startDate" type="date" required /></div>
            <div className="space-y-1.5"><Label>{t("leaves.fields.end")}</Label><Input name="endDate" type="date" required /></div>
            <div className="space-y-1.5 md:col-span-4"><Label>{t("leaves.fields.reason")}</Label><Textarea name="reason" rows={2} /></div>
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" disabled={pending}>{t("common.submit")}</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            </div>
          </form>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("leaves.myLeaves")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>{t("leaves.fields.type")}</TableHead><TableHead>{t("leaves.fields.start")}</TableHead><TableHead>{t("leaves.fields.end")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead>{t("leaves.fields.reason")}</TableHead></TableRow></TableHeader>
            <TableBody>
              {myLeaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.type}</TableCell>
                  <TableCell>{l.startDate}</TableCell>
                  <TableCell>{l.endDate}</TableCell>
                  <TableCell><Badge variant={l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}>{l.status}</Badge></TableCell>
                  <TableCell className="text-[var(--muted)] text-sm">{l.status === "rejected" ? l.rejectionReason : l.reason}</TableCell>
                </TableRow>
              ))}
              {myLeaves.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted)] py-6">{t("leaves.none")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle>{t("leaves.pending")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingForReview.length === 0 && <p className="text-sm text-[var(--muted)]">{t("contractors.none")}</p>}
            {pendingForReview.map((l) => (
              <div key={l.id} className="border rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">{l.userName} · {l.type}</p>
                  <p className="text-xs text-[var(--muted)]">{l.startDate} → {l.endDate}{l.reason ? ` · ${l.reason}` : ""}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {rejectId === l.id ? (
                    <>
                      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("common.reason")} className="h-9 w-48" />
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { await rejectLeave(l.id, reason); setRejectId(null); setReason(""); })}>{t("tasks.transitions.confirmReject")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>{t("common.cancel")}</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" disabled={pending} onClick={() => start(async () => { await approveLeave(l.id); })}>{t("common.approve")}</Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectId(l.id)}>{t("common.reject")}</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
