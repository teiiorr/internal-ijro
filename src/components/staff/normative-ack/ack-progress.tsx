"use client";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconBell,
  IconCircleCheckFilled,
  IconEye,
  IconFileTypePdf,
  IconLoader2,
  IconUsers,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { loadAckProgress, remindAck, type AckProgressView } from "@/server/actions/normative-ack";
import { ackPercent, errorKey, formatTashkentDateTime, ymdToDots, type AckRecipientItem } from "./logic";

/** Small SVG progress ring. */
function Ring({ done, total, size = 22 }: { done: number; total: number; size?: number }) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const pct = ackPercent(done, total);
  const complete = total > 0 && done >= total;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-strong)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={complete ? "var(--success)" : "var(--primary)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

function RecipientRow({ p }: { p: AckRecipientItem }) {
  const t = useTranslations("staffX.normativeAck");
  const tr = useTranslations();
  const label = p.positionTitle?.trim() || tr(`positions.${p.position}`);
  return (
    <li className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[var(--surface-2)]">
      <UserAvatar name={p.fullName} avatarUrl={p.avatarUrl} size="xs" clickable={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p.fullName}</p>
        <p className="truncate text-xs text-[var(--muted)]">
          {label}
          {p.departmentName ? ` · ${p.departmentName}` : ""}
        </p>
      </div>
      {p.acknowledgedAt ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-right text-[11px] font-semibold text-[var(--success)]">
          <IconCircleCheckFilled className="size-4" />
          <span className="tabular-nums">{formatTashkentDateTime(p.acknowledgedAt)}</span>
        </span>
      ) : p.openedAt ? (
        <span
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--muted)]"
          title={t("openedAt", { time: formatTashkentDateTime(p.openedAt) })}
        >
          <IconEye className="size-3.5" />
          <span className="hidden tabular-nums sm:inline">{formatTashkentDateTime(p.openedAt)}</span>
        </span>
      ) : (
        <span className="shrink-0 text-[11px] text-[var(--subtle)]">{t("notOpened")}</span>
      )}
    </li>
  );
}

/**
 * "X/Y" ring for one acknowledgement request. Click → recipients with opened / acknowledged
 * status, "Eslatish" (12h throttle on the server) and the printable PDF sheet.
 */
export function AckProgress({
  requestId,
  total,
  acknowledged,
  deadline,
}: {
  requestId: string;
  total: number;
  acknowledged: number;
  deadline: string;
}) {
  const t = useTranslations("staffX.normativeAck");
  const tr = useTranslations();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AckProgressView | null>(null);
  const [loading, startLoad] = useTransition();
  const [reminding, startRemind] = useTransition();

  function load() {
    startLoad(async () => {
      try {
        const res = await loadAckProgress(requestId);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        setView(res.view);
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  const { pendingList, doneList } = useMemo(() => {
    const rs = view?.recipients ?? [];
    return {
      pendingList: rs.filter((p) => !p.acknowledgedAt),
      doneList: rs
        .filter((p) => !!p.acknowledgedAt)
        .sort((a, b) => new Date(b.acknowledgedAt as Date).getTime() - new Date(a.acknowledgedAt as Date).getTime()),
    };
  }, [view]);

  const done = view ? doneList.length : acknowledged;
  const all = view ? view.recipients.length : total;

  function remind() {
    startRemind(async () => {
      try {
        const res = await remindAck(requestId);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        if (res.sent === 0) toast.info(t("nothingToRemind"));
        else toast.success(t("remindSent", { count: res.sent }));
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  const label = t("progress", { done: acknowledged, total });

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        title={`${label} · ${t("deadlineOn", { date: ymdToDots(deadline) })}`}
        className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-1.5 pr-2.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--primary)]"
      >
        <Ring done={acknowledged} total={total} />
        <span className="truncate tabular-nums">{label}</span>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-h-[85vh] gap-4 overflow-y-auto p-5 sm:max-w-lg sm:p-7">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2.5">
              <Ring done={done} total={all} size={30} />
              <span className="min-w-0 break-words tabular-nums">{t("progress", { done, total: all })}</span>
            </DialogTitle>
            <DialogDescription className="tabular-nums">{t("deadlineOn", { date: ymdToDots(view?.deadline ?? deadline) })}</DialogDescription>
          </DialogHeader>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", done >= all && all > 0 ? "bg-[var(--success)]" : "bg-[var(--primary)]")}
              style={{ width: `${ackPercent(done, all)}%` }}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={reminding || loading || (view !== null && pendingList.length === 0)}
              onClick={remind}
            >
              {reminding ? <IconLoader2 className="size-4 animate-spin" /> : <IconBell className="size-4" />}
              {t("remind")}
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <a href={`/api/export/normative-ack/${requestId}`} target="_blank" rel="noopener noreferrer">
                <IconFileTypePdf className="size-4" />
                {t("pdfSheet")}
              </a>
            </Button>
          </div>

          {view?.message && (
            <p className="whitespace-pre-line break-words rounded-xl bg-[var(--surface-2)] p-3 text-sm [overflow-wrap:anywhere]">{view.message}</p>
          )}

          {!view ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--muted)]">
              {loading ? <IconLoader2 className="size-4 animate-spin" /> : <IconUsers className="size-4" />}
              {tr("common.loading")}
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.length > 0 && (
                <section className="space-y-1">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    {t("notYet")}
                    <span className="tabular-nums text-[var(--subtle)]">{pendingList.length}</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </h4>
                  <ul>
                    {pendingList.map((p) => (
                      <RecipientRow key={p.userId} p={p} />
                    ))}
                  </ul>
                </section>
              )}
              {doneList.length > 0 && (
                <section className="space-y-1">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    {t("acknowledgedList")}
                    <span className="tabular-nums text-[var(--subtle)]">{doneList.length}</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </h4>
                  <ul>
                    {doneList.map((p) => (
                      <RecipientRow key={p.userId} p={p} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
