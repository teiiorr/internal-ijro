"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconArrowRight } from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
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
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
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
    <span className="inline-flex flex-wrap items-center gap-1.5 text-sm font-semibold tabular-nums">
      <span>{fmtDdMm(r.previousDate)}</span>
      <IconArrowRight className="size-3.5 text-[var(--ink-3)]" aria-hidden />
      <span className="text-[var(--tint)]">{fmtDdMm(r.requestedDate)}</span>
      {days !== null && <span className="text-[var(--ink-3)]">({t("extraDays", { days })})</span>}
    </span>
  );
}

export function DeadlineRequestsCard({ requests, canDecide, locale }: DeadlineRequestsCardProps) {
  const t = useTranslations("staffX.taskEdit");
  const pending = requests.filter((r) => r.status === "pending");
  const past = requests.filter((r) => r.status !== "pending");
  if (requests.length === 0) return null;

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)]">
          {t("requestsCard")}
        </h3>
        {pending.length > 0 && <Status tone="warning">{pending.length}</Status>}
      </div>

      <div className="space-y-3">
        {pending.map((r) => (
          <div
            key={r.id}
            className="rounded-[var(--radius-control)] p-3 sm:p-4"
            style={{ backgroundColor: "color-mix(in oklab, var(--warning) 10%, transparent)" }}
          >
            <div className="flex min-w-0 items-start gap-3">
              <UserAvatar name={r.requesterName} avatarUrl={r.requesterAvatar} size="sm" clickable={false} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="min-w-0 truncate text-[15px] font-semibold text-[var(--ink)]">{localizeName(r.requesterName, locale)}</p>
                  <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{formatDateTime(r.createdAt, locale)}</span>
                </div>
                <DateShift r={r} />
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{r.reason}</p>
              </div>
            </div>
            {canDecide && <DecisionControls requestId={r.id} />}
          </div>
        ))}

        {past.length > 0 && (
          <ul className="divide-y divide-[var(--line)]">
            {past.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Status tone={TONE[r.status]}>{t(STATUS_KEY[r.status])}</Status>
                  <span className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">{localizeName(r.requesterName, locale)}</span>
                  <DateShift r={r} />
                  <span className="ml-auto t-micro tabular-nums text-[var(--ink-3)]">
                    {formatDateTime(r.decidedAt ?? r.createdAt, locale)}
                  </span>
                </div>
                <p className="line-clamp-2 break-words t-micro text-[var(--ink-3)] [overflow-wrap:anywhere]">{r.reason}</p>
                {(r.decisionNote || r.deciderName) && r.status !== "cancelled" && (
                  <p className="break-words border-l-2 border-[var(--line-strong)] pl-2.5 t-micro italic text-[var(--ink-3)] [overflow-wrap:anywhere]">
                    {r.deciderName && <span className="font-semibold not-italic text-[var(--ink-2)]">{localizeName(r.deciderName, locale)}</span>}
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
    <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
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
