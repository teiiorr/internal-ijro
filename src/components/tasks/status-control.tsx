"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { changeTaskStatus } from "@/server/actions/tasks";

const NEXT_LABEL: Record<string, { status: string; labelKey: string; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" }[]> = {
  todo: [{ status: "in_progress", labelKey: "tasks.transitions.start" }],
  in_progress: [{ status: "under_review", labelKey: "tasks.transitions.submit" }],
  under_review: [
    { status: "completed", labelKey: "tasks.transitions.approve" },
    { status: "rejected", labelKey: "tasks.transitions.reject", variant: "destructive" },
  ],
  rejected: [{ status: "in_progress", labelKey: "tasks.transitions.resume" }],
  completed: [],
};

export function StatusControl({ taskId, current, isCreator }: { taskId: string; current: string; isCreator: boolean }) {
  const t = useTranslations();
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
    return <p className="text-sm text-[var(--muted)]">{t("tasks.transitions.noTransitions")}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => {
          if (o.status === "completed" && !isCreator) return null;
          if (o.status === "rejected" && !isCreator) return null;
          return (
            <Button key={o.status} variant={o.variant} disabled={pending} onClick={() => go(o.status)}>
              {t(o.labelKey as Parameters<typeof t>[0])}
            </Button>
          );
        })}
      </div>
      {showReject && (
        <div className="space-y-2">
          <Textarea placeholder={t("tasks.transitions.reasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="destructive" disabled={pending} onClick={confirmReject}>{t("tasks.transitions.confirmReject")}</Button>
            <Button variant="ghost" onClick={() => setShowReject(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
