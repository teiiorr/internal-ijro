"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { changeTaskStatus } from "@/server/actions/tasks";

const NEXT_LABEL: Record<string, { status: string; label: string; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" }[]> = {
  todo: [{ status: "in_progress", label: "Start" }],
  in_progress: [{ status: "under_review", label: "Submit for review" }],
  under_review: [
    { status: "completed", label: "Approve" },
    { status: "rejected", label: "Reject", variant: "destructive" },
  ],
  rejected: [{ status: "in_progress", label: "Resume" }],
  completed: [],
};

export function StatusControl({ taskId, current, isCreator }: { taskId: string; current: string; isCreator: boolean }) {
  const options = NEXT_LABEL[current] ?? [];
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go(status: string) {
    setError(null);
    if (status === "rejected") {
      setShowReject(true);
      return;
    }
    start(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await changeTaskStatus(taskId, status as any);
      } catch (e) { setError((e as Error).message); }
    });
  }

  function confirmReject() {
    start(async () => {
      try {
        await changeTaskStatus(taskId, "rejected", reason || undefined);
        setShowReject(false);
        setReason("");
      } catch (e) { setError((e as Error).message); }
    });
  }

  if (options.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No transitions available.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => {
          if (o.status === "completed" && !isCreator) return null;
          if (o.status === "rejected" && !isCreator) return null;
          return (
            <Button key={o.status} variant={o.variant} disabled={pending} onClick={() => go(o.status)}>
              {o.label}
            </Button>
          );
        })}
      </div>
      {showReject && (
        <div className="space-y-2">
          <Textarea placeholder="Reason for rejection..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="destructive" disabled={pending} onClick={confirmReject}>Confirm reject</Button>
            <Button variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
