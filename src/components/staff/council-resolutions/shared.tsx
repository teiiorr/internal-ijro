"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconCalendarDue as CalendarDue } from "@tabler/icons-react";
import { StatusTag } from "@/components/ui/status-tag";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { isActiveStatus, type EffectiveStatus } from "@/lib/councils/resolution-status";

export const NS = "staffX.councilResolutions";

/** Native <select> / date field style shared by the resolution forms and filters. */
export const FIELD =
  "h-10 w-full min-w-0 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--foreground)] " +
  "transition-[border-color,box-shadow] focus:border-[var(--primary)] focus:outline-none focus:shadow-[0_0_0_2px_var(--primary-soft)] disabled:opacity-60";

/** A Tashkent calendar date (YYYY-MM-DD) or an ISO instant, formatted for the UI locale. */
export function fmtDay(iso: string, locale: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatDate(`${iso}T12:00:00+05:00`, locale) : formatDate(iso, locale);
}

const TONE: Record<EffectiveStatus, "green" | "amber" | "red" | "muted" | null> = {
  open: null,
  due_soon: "amber",
  overdue: "red",
  done: "green",
  cancelled: "muted",
};

export function ResolutionStatusChip({ status, className }: { status: EffectiveStatus; className?: string }) {
  const t = useTranslations(NS);
  const tone = TONE[status];
  if (!tone) {
    // "Open" is neutral-but-alive: a soft primary chip instead of the filled signal tag.
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[var(--primary)]",
          className
        )}
      >
        {t("status.open")}
      </span>
    );
  }
  return (
    <StatusTag tone={tone} className={className}>
      {t(`status.${status}`)}
    </StatusTag>
  );
}

export function KindChip({ kind, className }: { kind: string; className?: string }) {
  const t = useTranslations(NS);
  const known = kind === "ekspert" || kind === "smeta";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-[11px] font-bold",
        kind === "smeta" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--primary-soft)] text-[var(--primary)]",
        className
      )}
    >
      {known ? t(kind) : kind}
    </span>
  );
}

/** Due date + live countdown (only while the point is still active). */
export function DueCell({ dueDate, effective, className }: { dueDate: string | null; effective: EffectiveStatus; className?: string }) {
  const t = useTranslations(NS);
  const locale = useLocale();
  if (!dueDate) return <span className={cn("text-sm text-[var(--subtle)]", className)}>{t("noDue")}</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium tabular-nums",
          effective === "overdue" ? "text-[var(--danger)]" : "text-[var(--foreground)]"
        )}
      >
        <CalendarDue className="size-3.5 shrink-0 text-[var(--subtle)]" />
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
          className="mt-1 text-xs font-semibold text-[var(--primary)] hover:underline"
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
