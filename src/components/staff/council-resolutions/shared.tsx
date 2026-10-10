"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconCalendarDue as CalendarDue } from "@tabler/icons-react";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { isActiveStatus, type EffectiveStatus } from "@/lib/councils/resolution-status";

export const NS = "staffX.councilResolutions";

/** Native <select> / date field style shared by the resolution forms and filters. */
export const FIELD =
  "h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--ink)] " +
  "transition-[border-color] focus:border-[var(--tint)] focus:outline-none disabled:opacity-60";

/** A Tashkent calendar date (YYYY-MM-DD) or an ISO instant, formatted for the UI locale. */
export function fmtDay(iso: string, locale: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatDate(`${iso}T12:00:00+05:00`, locale) : formatDate(iso, locale);
}

const TONE: Record<EffectiveStatus, StatusTone> = {
  open: "info",
  due_soon: "warning",
  overdue: "danger",
  done: "success",
  cancelled: "neutral",
};

/** One calm status chip (BIIB Status) — no capsule, no uppercase signal tag. */
export function ResolutionStatusChip({ status, className }: { status: EffectiveStatus; className?: string }) {
  const t = useTranslations(NS);
  return (
    <Status tone={TONE[status]} className={className}>
      {t(`status.${status}`)}
    </Status>
  );
}

/** Council kind — plain metadata text, not a pill (wrapped in a Link by the caller). */
export function KindChip({ kind, className }: { kind: string; className?: string }) {
  const t = useTranslations(NS);
  const known = kind === "ekspert" || kind === "smeta";
  return (
    <span className={cn("truncate text-sm font-semibold text-[var(--ink)]", className)}>
      {known ? t(kind) : kind}
    </span>
  );
}

/** Due date + live countdown (only while the point is still active). */
export function DueCell({ dueDate, effective, className }: { dueDate: string | null; effective: EffectiveStatus; className?: string }) {
  const t = useTranslations(NS);
  const locale = useLocale();
  if (!dueDate) return <span className={cn("text-sm text-[var(--ink-3)]", className)}>{t("noDue")}</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium tabular-nums",
          effective === "overdue" ? "text-[var(--danger)]" : "text-[var(--ink)]"
        )}
      >
        <CalendarDue className="size-3.5 shrink-0 text-[var(--ink-3)]" />
        {fmtDay(dueDate, locale)}
      </span>
      {isActiveStatus(effective) && (
        <DeadlineCountdown deadline={`${dueDate}T23:59:59+05:00`} completed={false} />
      )}
    </span>
  );
}

/** Long resolution text: clamped to 3 lines with an expand toggle (length heuristic — no layout reads). */
export function ExpandableText({ text, className }: { text: string; className?: string }) {
  const t = useTranslations(NS);
  const [open, setOpen] = useState(false);
  const long = text.length > 220 || text.split("\n").length > 3;
  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("whitespace-pre-line break-words [overflow-wrap:anywhere]", !open && long && "line-clamp-3")}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-xs font-semibold text-[var(--tint)] hover:underline"
        >
          {open ? t("showLess") : t("showMore")}
        </button>
      )}
    </div>
  );
}

const ERROR_CODES = new Set([
  "forbidden",
  "not_found",
  "invalid",
  "unavailable",
  "task_linked",
  "not_open",
  "already_tasked",
  "forbidden_assign",
  "bad_responsible",
  "bad_agenda",
  "already_added",
]);

/** Maps a server-action error code to a localized message. */
export function useResolutionErrorText(): (code: string) => string {
  const t = useTranslations(NS);
  const tg = useTranslations();
  return (code: string) => {
    if (code === "need_responsible_and_due") return t("needResponsibleAndDue");
    if (ERROR_CODES.has(code)) return t(`errors.${code}`);
    return tg("common.error");
  };
}
