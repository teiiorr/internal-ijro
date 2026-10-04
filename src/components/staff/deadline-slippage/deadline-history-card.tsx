import { getTranslations } from "next-intl/server";
import {
  IconArrowRight,
  IconCalendarStats,
  IconInfoCircle,
} from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDate, formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { deltaDays as computeDelta, fmtDmy } from "@/lib/projects/slippage";
import { DEADLINE_CHANGE_SOURCES } from "@/lib/db/tables/deadline-slippage";
import { getProjectDeadlineHistory, type DeadlineHistoryItem } from "@/server/queries/slippage";

export type DeadlineHistoryCardProps = { projectId: string; locale: string };

/** Oxirgi N ta oʻzgarish doim koʻrinadi, qolganlari <details> ichida. */
const VISIBLE = 5;
const KNOWN_SOURCES = new Set<string>(DEADLINE_CHANGE_SOURCES);

const SOURCE_TONE: Record<string, string> = {
  manual: "bg-[var(--surface-2)] text-[var(--muted)]",
  edit: "bg-[var(--primary-soft)] text-[var(--primary)]",
  studio_request: "bg-[var(--warning-soft)] text-[var(--warning)]",
  backfill: "bg-[var(--surface-2)] text-[var(--subtle)]",
};

/**
 * Loyiha sahifasidagi "Muddat tarixi": bosqich muddatlarining har bir oʻzgarishi
 * (eski → yangi, farq, manba, sabab, muallif). Oʻzgarish boʻlmasa — hech narsa chizilmaydi.
 * Muddatlar maxfiy emas va summa koʻrsatilmaydi, shuning uchun loyihani ocha oladigan
 * har bir ichki xodim koʻradi.
 */
export async function DeadlineHistoryCard({ projectId, locale }: DeadlineHistoryCardProps) {
  const me = await requireUser();
  if (me.position === "kontragent") return null;

  const { changes, trackingSince } = await getProjectDeadlineHistory(projectId, locale);
  if (changes.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "staffX.deadlineSlippage" });
  const visible = changes.slice(0, VISIBLE);
  const older = changes.slice(VISIBLE);

  const item = (c: DeadlineHistoryItem, last: boolean) => {
    const delta = c.deltaDays ?? computeDelta(c.oldDeadline, c.newDeadline);
    const source = KNOWN_SOURCES.has(c.source) ? c.source : "manual";
    const author = c.byName ? localizeName(c.byName, locale) : t("systemActor");
    return (
      <li key={c.id} className="relative flex gap-3 pb-5 last:pb-0">
        {!last && <span aria-hidden className="absolute bottom-0 left-[15px] top-9 w-px bg-[var(--border)]" />}
        <span
          className={cn(
            "relative grid size-8 shrink-0 place-items-center rounded-full",
            delta != null && delta > 0
              ? "bg-[var(--danger-soft)] text-[var(--danger)]"
              : delta != null && delta < 0
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--surface-2)] text-[var(--muted)]"
          )}
        >
          <IconCalendarStats className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <p className="min-w-0 break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{c.stageName}</p>
            <time
              dateTime={new Date(c.createdAt).toISOString()}
              className="shrink-0 whitespace-nowrap text-xs text-[var(--subtle)] tabular"
            >
              {formatDateTime(c.createdAt, locale)}
            </time>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-semibold tabular">
              {fmtDmy(c.oldDeadline)}
              <IconArrowRight className="size-3 text-[var(--muted)]" aria-hidden />
              {fmtDmy(c.newDeadline)}
            </span>
            {delta != null && delta !== 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-bold tabular",
                  delta > 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"
                )}
              >
                {t("delta", { sign: delta > 0 ? "+" : "−", days: Math.abs(delta) })}
              </span>
            )}
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", SOURCE_TONE[source])}>
              {t(`source.${source}`)}
            </span>
          </div>

          {c.reason && (
            <p className="whitespace-pre-wrap break-words rounded-xl border-l-2 border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)] [overflow-wrap:anywhere]">
              {c.reason}
            </p>
          )}

          <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--muted)]">
            {c.byName && <UserAvatar name={author} avatarUrl={c.byAvatar} size="xs" clickable={false} className="size-6 text-[10px]" />}
            <span className="min-w-0 truncate">{author}</span>
          </div>
        </div>
      </li>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)]">
            <IconCalendarStats className="size-5 text-[var(--primary)]" />
          </div>
          <h3 className="min-w-0 truncate text-lg font-bold tracking-tight">{t("historyTitle")}</h3>
        </div>
        <span className="shrink-0 text-sm text-[var(--muted)] tabular">{t("changesCount", { count: changes.length })}</span>
      </div>

      <div className="px-5 pb-5 sm:px-7 sm:pb-6">
        <ol>{visible.map((c, i) => item(c, i === visible.length - 1 && older.length === 0))}</ol>
        {older.length > 0 && (
          <details className="group mt-1">
            <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-[var(--primary)] hover:underline [&::-webkit-details-marker]:hidden">
              {t("showAll", { count: older.length })}
            </summary>
            <ol className="pt-3">{older.map((c, i) => item(c, i === older.length - 1))}</ol>
          </details>
        )}

        {trackingSince && (
          <p className="mt-4 flex items-start gap-1.5 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            <IconInfoCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{t("trackingSince", { date: formatDate(trackingSince, locale) })}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
