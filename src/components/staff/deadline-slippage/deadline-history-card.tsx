import { getTranslations } from "next-intl/server";
import { IconArrowRight, IconCalendarStats, IconInfoCircle } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui-biib/Card";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDate, formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { deltaDays as computeDelta, fmtDmy } from "@/lib/projects/slippage";
import { DEADLINE_CHANGE_SOURCES } from "@/lib/db/tables/deadline-slippage";
import { getProjectDeadlineHistory, type DeadlineHistoryItem } from "@/server/queries/slippage";

export type DeadlineHistoryCardProps = { projectId: string; locale: string };

/** Oxirgi N ta oʻzgarish doim koʻrinadi, qolganlari <details> ichida. */
const VISIBLE = 5;
const KNOWN_SOURCES = new Set<string>(DEADLINE_CHANGE_SOURCES);

/**
 * Loyiha sahifasidagi "Muddat tarixi": bosqich muddatlarining har bir oʻzgarishi
 * (eski → yangi, farq, manba, sabab, muallif). Oʻzgarish boʻlmasa — hech narsa chizilmaydi.
 * Muddatlar maxfiy emas va summa koʻrsatilmaydi, shuning uchun loyihani ocha oladigan
 * har bir ichki xodim koʻradi. BIIB: oyna karta, xronologiya, Status (kapsula/pill emas).
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
    const nodeTone: StatusTone = delta != null && delta > 0 ? "danger" : delta != null && delta < 0 ? "success" : "neutral";
    const nodeColor = nodeTone === "neutral" ? "var(--ink-2)" : `var(--${nodeTone})`;
    return (
      <li key={c.id} className="relative flex gap-3 pb-5 last:pb-0">
        {!last && <span aria-hidden className="absolute bottom-0 left-[15px] top-9 w-px bg-[var(--line)]" />}
        <span
          className="relative grid size-8 shrink-0 place-items-center rounded-full"
          style={{ color: nodeColor, backgroundColor: `color-mix(in oklab, ${nodeColor} 14%, transparent)` }}
        >
          <IconCalendarStats className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <p className="min-w-0 break-words text-[0.9375rem] font-semibold leading-snug text-[var(--ink)] [overflow-wrap:anywhere]">
              {c.stageName}
            </p>
            <time
              dateTime={new Date(c.createdAt).toISOString()}
              className="shrink-0 whitespace-nowrap t-micro tabular-nums text-[var(--ink-3)]"
            >
              {formatDateTime(c.createdAt, locale)}
            </time>
          </div>

          <div className="flex flex-wrap items-center gap-2 t-small">
            <span className="inline-flex items-center gap-1 tabular-nums text-[var(--ink-2)]">
              {fmtDmy(c.oldDeadline)}
              <IconArrowRight className="size-3 text-[var(--ink-3)]" aria-hidden />
              <span className="font-semibold text-[var(--ink)]">{fmtDmy(c.newDeadline)}</span>
            </span>
            {delta != null && delta !== 0 && (
              <Status tone={delta > 0 ? "danger" : "success"}>
                {t("delta", { sign: delta > 0 ? "+" : "−", days: Math.abs(delta) })}
              </Status>
            )}
            <span className="t-micro text-[var(--ink-3)]">{t(`source.${source}`)}</span>
          </div>

          {c.reason && (
            <p className="whitespace-pre-wrap break-words border-l-2 border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 t-small leading-relaxed text-[var(--ink-2)] [overflow-wrap:anywhere]">
              {c.reason}
            </p>
          )}

          <div className="flex min-w-0 items-center gap-2 t-small text-[var(--ink-3)]">
            {c.byName && <UserAvatar name={author} avatarUrl={c.byAvatar} size="xs" clickable={false} className="size-6 text-[10px]" />}
            <span className="min-w-0 truncate">{author}</span>
          </div>
        </div>
      </li>
    );
  };

  return (
    <Card bare className="px-5 py-5 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">
          {t("historyTitle")}
        </h3>
        <span className="shrink-0 t-small tabular-nums text-[var(--ink-3)]">{t("changesCount", { count: changes.length })}</span>
      </div>

      <ol>{visible.map((c, i) => item(c, i === visible.length - 1 && older.length === 0))}</ol>
      {older.length > 0 && (
        <details className="group mt-1">
          <summary className="cursor-pointer list-none py-2 t-small font-semibold text-[var(--tint)] hover:underline [&::-webkit-details-marker]:hidden">
            {t("showAll", { count: older.length })}
          </summary>
          <ol className="pt-3">{older.map((c, i) => item(c, i === older.length - 1))}</ol>
        </details>
      )}

      {trackingSince && (
        <p className="mt-4 flex items-start gap-1.5 border-t border-[var(--line)] pt-3 t-small text-[var(--ink-3)]">
          <IconInfoCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{t("trackingSince", { date: formatDate(trackingSince, locale) })}</span>
        </p>
      )}
    </Card>
  );
}
