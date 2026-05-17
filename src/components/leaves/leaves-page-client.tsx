"use client";
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
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaves</h1>
        {open ? null : <Button onClick={() => setOpen(true)}>Request leave</Button>}
      </div>

      {open && (
        <Card><CardContent className="p-6">
          <form action={(fd) => start(async () => { await requestLeave(fd); setOpen(false); })} className="grid gap-3 md:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select name="type" defaultValue="vacation">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Start</Label><Input name="startDate" type="date" required /></div>
            <div className="space-y-1.5"><Label>End</Label><Input name="endDate" type="date" required /></div>
            <div className="space-y-1.5 md:col-span-4"><Label>Reason</Label><Textarea name="reason" rows={2} /></div>
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" disabled={pending}>Submit</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>My leaves</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
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
              {myLeaves.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted)] py-6">No leaves.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Pending approval</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingForReview.length === 0 && <p className="text-sm text-[var(--muted)]">None.</p>}
            {pendingForReview.map((l) => (
              <div key={l.id} className="border rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">{l.userName} · {l.type}</p>
                  <p className="text-xs text-[var(--muted)]">{l.startDate} → {l.endDate}{l.reason ? ` · ${l.reason}` : ""}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {rejectId === l.id ? (
                    <>
                      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-9 w-48" />
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { await rejectLeave(l.id, reason); setRejectId(null); setReason(""); })}>Confirm reject</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" disabled={pending} onClick={() => start(async () => { await approveLeave(l.id); })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectId(l.id)}>Reject</Button>
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
