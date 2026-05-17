"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { archiveEmployee, restoreEmployee } from "@/server/actions/employees";

export function ArchiveButton({ userId, status }: { userId: string; status: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (status === "archived") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => start(async () => { await restoreEmployee(userId); })}>
        Restore
      </Button>
    );
  }

  if (open) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm bg-[var(--background-elevated)]"
        />
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => start(async () => {
            await archiveEmployee(userId, date);
            setOpen(false);
          })}
        >
          Archive
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    );
  }

  return <Button variant="destructive" onClick={() => setOpen(true)}>Archive</Button>;
}
