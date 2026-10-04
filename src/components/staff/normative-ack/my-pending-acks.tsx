"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconFileCertificate, IconUser } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { cn } from "@/lib/utils";
import { AckButton } from "./ack-button";
import { deadlineLabel, ymdToDots, type PendingAckItem } from "./logic";

/**
 * "Tanishib chiqishim kerak" — my pending acknowledgements on /meyoriy-hujjatlar.
 * The ?ack=<requestId> row is highlighted and scrolled into view.
 */
export function MyPendingAcks({ items, highlight }: { items: PendingAckItem[]; highlight?: string | null }) {
  const t = useTranslations("staffX.normativeAck");

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(`ack-${highlight}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  if (items.length === 0) return null;

  // .glass-card is unlayered CSS (it beats Tailwind utilities), so the warning tint lives on an inner wrapper.
  return (
    <Card className="overflow-hidden">
      <div className="bg-[var(--warning-soft)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--warning)]/20 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--warning)]/15 text-[var(--warning)]">
            <IconFileCertificate className="size-5" />
          </div>
          <h2 className="min-w-0 flex-1 break-words text-base font-bold tracking-tight sm:text-lg">{t("myPending")}</h2>
          <span className="shrink-0 text-xl font-bold tabular-nums">{items.length}</span>
        </div>
        <ul className="space-y-2 p-2 sm:p-3">
          {items.map((it) => {
            const dl = deadlineLabel(it.daysLeft);
            const active = highlight === it.requestId;
            return (
              <li
                key={it.requestId}
                id={`ack-${it.requestId}`}
                className={cn(
                  "scroll-mt-24 rounded-xl border bg-[var(--card)] p-3 transition-shadow sm:p-4",
                  active
                    ? "border-[var(--primary)] shadow-[0_0_0_2px_var(--primary-glow)]"
                    : "border-[var(--border)]"
                )}
              >
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="break-words text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{it.fileName}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                      <StatusTag tone={dl.tone} size="sm">
                        {t(dl.key, { count: dl.count })}
                      </StatusTag>
                      <span className="tabular-nums">{t("deadlineOn", { date: ymdToDots(it.deadline) })}</span>
                      {it.requestedByName && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <IconUser className="size-3.5 shrink-0" />
                          <span className="truncate">{it.requestedByName}</span>
                        </span>
                      )}
                    </div>
                    {it.message && (
                      <p className="whitespace-pre-line break-words text-sm text-[var(--foreground)]/85 [overflow-wrap:anywhere]">
                        {it.message}
                      </p>
                    )}
                  </div>
                  <div className="w-full shrink-0 md:w-auto md:max-w-xs">
                    <AckButton requestId={it.requestId} fileUrl={it.fileUrl} isLink={it.isLink} openedAt={it.openedAt} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
