import { getTranslations } from "next-intl/server";
import { IconFileCertificate, IconChevronRight } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { listMyPendingAcks } from "@/server/queries/normative-ack";
import { deadlineLabel } from "./logic";

const MAX_ROWS = 4;

/**
 * Dashboard card "Tanishib chiqishim kerak (N)" — null when nothing is pending.
 * Mounted by the main implementer under InboxWidget inside <Suspense fallback={null}>.
 */
export async function AckWidget({ userId }: { userId: string }) {
  const items = await listMyPendingAcks(userId);
  if (items.length === 0) return null;
  const t = await getTranslations("staffX.normativeAck");

  return (
    <Card>
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]">
          <IconFileCertificate className="size-5" />
        </div>
        <h3 className="min-w-0 flex-1 break-words text-base font-bold tracking-tight sm:text-lg">
          {t("myPendingCount", { count: items.length })}
        </h3>
      </div>
      <div className="space-y-0.5 px-2 py-2">
        {items.slice(0, MAX_ROWS).map((it) => {
          const dl = deadlineLabel(it.daysLeft);
          return (
            <Link
              key={it.requestId}
              href={`/meyoriy-hujjatlar?ack=${it.requestId}`}
              className="group flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--surface-3)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{it.fileName}</p>
                {it.requestedByName && <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{it.requestedByName}</p>}
              </div>
              <StatusTag tone={dl.tone} size="sm" className="shrink-0">
                {t(dl.key, { count: dl.count })}
              </StatusTag>
              <IconChevronRight className="size-4 shrink-0 text-[var(--subtle)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
        {items.length > MAX_ROWS && (
          <Link
            href="/meyoriy-hujjatlar"
            className="flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-3)]"
          >
            {t("allPending", { count: items.length })}
            <IconChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </Card>
  );
}
