"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconUser } from "@tabler/icons-react";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { cn } from "@/lib/utils";
import { AckButton } from "./ack-button";
import { deadlineLabel, ymdToDots, type PendingAckItem } from "./logic";

const DL_TONE: Record<"red" | "amber" | "muted", StatusTone> = {
  red: "danger",
  amber: "warning",
  muted: "neutral",
};

/**
 * "Tanishib chiqishim kerak" — my pending acknowledgements on /meyoriy-hujjatlar.
 * BIIB grammatikasi: bitta seksiya, ichida tekis karta va ajratuvchi qatorlar (quti emas).
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

  return (
    <Section title={t("myPendingCount", { count: items.length })}>
      <Card bare className="px-5 sm:px-6">
        <Rows>
          {items.map((it) => {
            const dl = deadlineLabel(it.daysLeft);
            const active = highlight === it.requestId;
            return (
              <Row key={it.requestId}>
                <div
                  id={`ack-${it.requestId}`}
                  className={cn(
                    "flex min-w-0 flex-1 scroll-mt-24 flex-col gap-3 rounded-[var(--radius-s)] transition-shadow md:flex-row md:items-start md:justify-between md:gap-5",
                    active && "shadow-[0_0_0_2px_var(--tint)]"
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="break-words text-[0.9375rem] font-medium leading-snug text-[var(--ink)] [overflow-wrap:anywhere]">{it.fileName}</p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 t-small text-[var(--ink-3)]">
                      <Status tone={DL_TONE[dl.tone]} dot>
                        {t(dl.key, { count: dl.count })}
                      </Status>
                      <span className="tabular-nums">{t("deadlineOn", { date: ymdToDots(it.deadline) })}</span>
                      {it.requestedByName && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <IconUser className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{it.requestedByName}</span>
                        </span>
                      )}
                    </div>
                    {it.message && (
                      <p className="whitespace-pre-line break-words t-small text-[var(--ink-2)] [overflow-wrap:anywhere]">{it.message}</p>
                    )}
                  </div>
                  <div className="w-full shrink-0 md:w-auto md:max-w-xs">
                    <AckButton requestId={it.requestId} fileUrl={it.fileUrl} isLink={it.isLink} openedAt={it.openedAt} />
                  </div>
                </div>
              </Row>
            );
          })}
        </Rows>
      </Card>
    </Section>
  );
}
