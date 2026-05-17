"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changePosition } from "@/server/actions/employees";

const POSITIONS = [
  "direktor", "orinbosar", "koordinator", "bolim_boshligi",
  "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr",
] as const;

export function ChangePositionDialog({
  userId,
  currentPosition,
  currentDepartmentId,
  departments,
  managers,
}: {
  userId: string;
  currentPosition: string;
  currentDepartmentId: string | null;
  departments: { id: string; name: string }[];
  managers: { id: string; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [pos, setPos] = useState(currentPosition);
  const [dept, setDept] = useState<string>(currentDepartmentId ?? "");
  const [reportsTo, setReportsTo] = useState<string>("");
  const [reason, setReason] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await changePosition({
        userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newPosition: pos as any,
        newDepartmentId: dept || null,
        reportsToUserId: reportsTo || null,
        reason: reason || undefined,
      });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change position</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Change position / department</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>New position</Label>
            <Select value={pos} onValueChange={setPos}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reports to</Label>
            <Select value={reportsTo} onValueChange={setReportsTo}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
            <Button type="submit" disabled={pending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
