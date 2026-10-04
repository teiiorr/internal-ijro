"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconArrowRight, IconCalendarTime } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { decideDeadlineRequest } from "@/server/actions/task-edits";
import { diffDaysIso, errorMessageKey, fmtDdMm, type DeadlineRequestView } from "./task-edit-logic";

export type DeadlineRequestsCardProps = {
  requests: DeadlineRequestView[];
  canDecide: boolean;
  locale: string;
};

const TONE: Record<DeadlineRequestView["status"], StatusTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  cancelled: "muted",
};

const STATUS_KEY: Record<DeadlineRequestView["status"], string> = {
  pending: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
  cancelled: "statusCancelled",
};

function DateShift({ r }: { r: DeadlineRequestView }) {
  const t = useTranslations("staffX.taskEdit");
  const days = r.previousDate ? diffDaysIso(r.previousDate, r.requestedDate) : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-sm font-semibold tabular">
      <span>{fmtDdMm(r.previousDate)}</span>
      <IconArrowRight className="size-3.5 text-[var(--muted)]" />
      <span className="text-[var(--primary)]">{fmtDdMm(r.requestedDate)}</span>
      {days !== null && <span className="text-[var(--muted)]">({t("extraDays", { days })})</span>}
    </span>
  );
}

export function DeadlineRequestsCard({ requests, canDecide, locale }: DeadlineRequestsCardProps) {
  const t = useTranslations("staffX.taskEdit");
  const pending = requests.filter((r) => r.status === "pending");
  const past = requests.filter((r) => r.status !== "pending");
  if (requests.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--warning-soft)]">
            <IconCalendarTime className="size-5 text-[var(--warning)]" />
          </div>
          <h3 className="min-w-0 truncate text-lg font-bold tracking-tight">{t("requestsCard")}</h3>
        </div>
        {pending.length > 0 && <StatusTag tone="amber" size="sm">{pending.length}</StatusTag>}
      </div>

      <div className="space-y-3 px-3 pb-5 sm:px-5">
        {pending.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] p-3 sm:p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <UserAvatar name={r.requesterName} avatarUrl={r.requesterAvatar} size="sm" clickable={false} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="min-w-0 truncate text-[15px] font-semibold">{localizeName(r.requesterName, locale)}</p>
                  <span className="shrink-0 text-xs text-[var(--muted)] tabular">{formatDateTime(r.createdAt, locale)}</span>
                </div>
                <DateShift r={r} />
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{r.reason}</p>
              </div>
            </div>
            {canDecide && <DecisionControls requestId={r.id} />}
          </div>
        ))}

        {past.length > 0 && (
          <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {past.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:px-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusTag tone={TONE[r.status]} size="sm">{t(STATUS_KEY[r.status])}</StatusTag>
                  <span className="min-w-0 truncate text-sm font-semibold">{localizeName(r.requesterName, locale)}</span>
                  <DateShift r={r} />
                  <span className="ml-auto text-xs text-[var(--subtle)] tabular">
                    {formatDateTime(r.decidedAt ?? r.createdAt, locale)}
                  </span>
                </div>
                <p className="line-clamp-2 break-words text-xs text-[var(--muted)] [overflow-wrap:anywhere]">{r.reason}</p>
                {(r.decisionNote || r.deciderName) && r.status !== "cancelled" && (
                  <p className="break-words border-l-2 border-[var(--border-strong)] pl-2.5 text-xs italic text-[var(--muted)] [overflow-wrap:anywhere]">
                    {r.deciderName && <span className="font-semibold not-italic">{localizeName(r.deciderName, locale)}</span>}
                    {r.deciderName && r.decisionNote && ": "}
                    {r.decisionNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function DecisionControls({ requestId }: { requestId: string }) {
  const t = useTranslations("staffX.taskEdit");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();

  function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && note.trim().length < 2) {
      toast.error(t("noteRequired"));
      return;
    }
    start(async () => {
      try {
        const res = await decideDeadlineRequest({ requestId, decision, note: note.trim() || undefined });
        if (!res.ok) {
          toast.error(t(errorMessageKey(res.error), { name: res.detail ?? "" }));
          return;
        }
        toast.success(decision === "approved" ? t("approvedToast") : t("rejectedToast"));
        setNote("");
        router.refresh();
      } catch (err) {
        toast.error(t("errors.generic"), { description: (err as Error).message });
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--warning)]/30 pt-3">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        placeholder={t("decisionNotePlaceholder")}
        aria-label={t("decisionNote")}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={busy}>
          {t("reject")}
        </Button>
        <Button size="sm" variant="success" onClick={() => decide("approved")} disabled={busy}>
          {t("approve")}
        </Button>
      </div>
    </div>
  );
}
