"use client";
import { useLocale, useTranslations } from "next-intl";
import { IconBellRinging as BellRinging, IconListCheck as ListCheck, IconFolder as Folder } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate, timeAgo } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { NudgeDialog } from "./nudge-dialog";
import { ResponseReviewDrawer } from "./response-review-drawer";
import { chipRingColor, isOpenStatus, type ControlAssignee, type ControlRow } from "./control-logic";

const MAX_CHIPS = 8;
const KNOWN_STATUS = new Set(["todo", "in_progress", "under_review", "completed", "rejected"]);
const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-[var(--danger)]",
  high: "bg-[var(--warning)]",
  medium: "bg-[var(--primary)]",
  low: "bg-[var(--subtle)]",
};

type T = ReturnType<typeof useTranslations>;

/**
 * Task-control board. md+ → table; below md → stacked glass cards (no horizontal page scroll).
 * Each assignee is an avatar chip ringed by status colour; overdue assignees get an extra red ring.
 */
export function ControlTable({
  rows,
  currentUserId,
  isLeadership,
}: {
  rows: ControlRow[];
  currentUserId: string;
  /** direktor / orinbosar — may nudge and review on any task. */
  isLeadership: boolean;
}) {
  const t = useTranslations();
  const tc = useTranslations("staffX.taskControl");
  const locale = useLocale();

  if (rows.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <ListCheck className="size-8 text-[var(--subtle)]" />
        <p className="text-sm font-medium text-[var(--muted)]">{tc("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* md+ : table */}
      <div className="glass-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">{tc("colTask")}</th>
                <th className="px-3 py-3">{tc("colDeadline")}</th>
                <th className="px-3 py-3">{tc("colAssignees")}</th>
                <th className="px-3 py-3">{tc("colProgress")}</th>
                <th className="px-3 py-3">{tc("lastResponse")}</th>
                <th className="px-4 py-3 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const canManage = isLeadership || r.createdByUserId === currentUserId;
                return (
                  <tr key={r.id} className="border-b border-[var(--border)] align-top last:border-b-0">
                    <td className="max-w-[340px] px-4 py-3.5">
                      <TaskCell row={r} currentUserId={currentUserId} t={t} tc={tc} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
                      <DeadlineCell row={r} locale={locale} />
                    </td>
                    <td className="px-3 py-3.5">
                      <Chips assignees={r.assignees} t={t} tc={tc} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
                      <Progress row={r} tc={tc} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px] text-[var(--muted)]">
                      <span suppressHydrationWarning>{r.lastResponseAt ? timeAgo(r.lastResponseAt, locale) : "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <RowActions row={r} canManage={canManage} tc={tc} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* < md : cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const canManage = isLeadership || r.createdByUserId === currentUserId;
          return (
            <li key={r.id} className="glass-card min-w-0 space-y-3 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <TaskCell row={r} currentUserId={currentUserId} t={t} tc={tc} />
                </div>
                <div className="shrink-0 text-right">
                  <DeadlineCell row={r} locale={locale} />
                </div>
              </div>
              <Chips assignees={r.assignees} t={t} tc={tc} />
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <Progress row={r} tc={tc} />
                <span className="text-xs text-[var(--muted)]">
                  {tc("lastResponse")}:{" "}
                  <span suppressHydrationWarning>{r.lastResponseAt ? timeAgo(r.lastResponseAt, locale) : "—"}</span>
                </span>
              </div>
              {canManage && hasActions(r) && (
                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3 [&>*]:flex-1 sm:[&>*]:flex-initial">
                  <RowActions row={r} canManage={canManage} tc={tc} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function TaskCell({ row, currentUserId, t, tc }: { row: ControlRow; currentUserId: string; t: T; tc: T }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[row.priority] ?? PRIORITY_DOT.medium)}
          title={`${tc("priority")}: ${t(`tasks.priority.${row.priority in PRIORITY_DOT ? row.priority : "medium"}`)}`}
        />
        {row.registrationNumber && (
          <span className="truncate font-mono text-[11px] font-semibold text-[var(--muted)]">{row.registrationNumber}</span>
        )}
      </div>
      <Link
        href={`/tasks/${row.id}`}
        className="line-clamp-2 break-words font-semibold leading-snug text-[var(--foreground)] hover:text-[var(--primary)] hover:underline"
      >
        {row.title}
      </Link>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
        {row.projectName && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            <Folder className="size-3.5 shrink-0" />
            <span className="truncate">{row.projectName}</span>
          </span>
        )}
        {row.createdByUserId !== currentUserId && <span className="truncate">{shortName(row.creatorName)}</span>}
      </div>
    </div>
  );
}

function DeadlineCell({ row, locale }: { row: ControlRow; locale: string }) {
  if (!row.deadline) return <span className="text-xs text-[var(--muted)]">—</span>;
  return (
    <div className="flex flex-col items-end gap-1 md:items-start">
      <DeadlineCountdown deadline={row.deadline} />
      <span className="text-[11px] tabular-nums text-[var(--muted)]">{formatDate(row.deadline, locale)}</span>
    </div>
  );
}

function Progress({ row, tc }: { row: ControlRow; tc: T }) {
  const pct = row.total > 0 ? Math.round((row.answered / row.total) * 100) : 0;
  return (
    <div className="min-w-[120px] space-y-1.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
        <span>{tc("answered", { answered: row.answered, total: row.total })}</span>
        {row.underReview > 0 && (
          <span className="rounded-md bg-[var(--warning)]/15 px-1.5 py-0.5 text-[11px] font-bold text-[var(--warning)]">
            {tc("underReviewCount", { count: row.underReview })}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full bg-[var(--success)] transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Chips({ assignees, t, tc }: { assignees: ControlAssignee[]; t: T; tc: T }) {
  const shown = assignees.slice(0, MAX_CHIPS);
  const rest = assignees.slice(MAX_CHIPS);
  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-3 p-1.5">
      {shown.map((a) => {
        const statusLabel = t(`tasks.status.${KNOWN_STATUS.has(a.status) ? a.status : "todo"}`);
        const tip = [
          a.fullName,
          a.departmentName,
          a.overdue ? `${statusLabel} · ${tc("overdue")}` : statusLabel,
          a.nudgeCount > 0 ? tc("nudgedTimes", { count: a.nudgeCount }) : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const ring = chipRingColor(a.status);
        return (
          <li
            key={a.userId}
            title={tip}
            aria-label={tip}
            className="relative inline-flex rounded-full"
            style={{
              boxShadow: a.overdue
                ? `0 0 0 2px ${ring}, 0 0 0 4px var(--card), 0 0 0 6px var(--danger)`
                : `0 0 0 2px ${ring}`,
            }}
          >
            <UserAvatar name={shortName(a.fullName)} avatarUrl={a.avatarUrl} size="xs" clickable={false} className="ring-0" />
            {a.nudgeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--surface-3)] px-1 text-[9px] font-bold tabular-nums text-[var(--muted)] ring-2 ring-[var(--card)]">
                {a.nudgeCount}
              </span>
            )}
          </li>
        );
      })}
      {rest.length > 0 && (
        <li
          title={rest.map((a) => a.fullName).join(", ")}
          className="grid size-8 place-items-center rounded-full bg-[var(--surface-3)] text-[11px] font-bold text-[var(--muted)]"
        >
          +{rest.length}
        </li>
      )}
    </ul>
  );
}

function hasActions(row: ControlRow): boolean {
  return row.assignees.some((a) => (isOpenStatus(a.status) && !a.kontragent) || a.status === "under_review");
}

function RowActions({ row, canManage, tc }: { row: ControlRow; canManage: boolean; tc: T }) {
  if (!canManage) return null;
  const open = row.assignees.filter((a) => isOpenStatus(a.status) && !a.kontragent);
  const toReview = row.assignees.filter((a) => a.status === "under_review");
  return (
    <>
      {open.length > 0 && (
        <NudgeDialog
          taskId={row.id}
          assignees={open.map((a) => ({
            userId: a.userId,
            fullName: a.fullName,
            avatarUrl: a.avatarUrl,
            status: a.status,
            lastNudgeAt: a.lastNudgeAt,
          }))}
          trigger={
            <Button type="button" variant="outline" size="sm">
              <BellRinging className="size-4" />
              {tc("nudge")}
            </Button>
          }
        />
      )}
      {toReview.length > 0 && (
        <ResponseReviewDrawer
          taskId={row.id}
          taskTitle={row.title}
          items={toReview.map((a) => ({
            userId: a.userId,
            fullName: a.fullName,
            avatarUrl: a.avatarUrl,
            departmentName: a.departmentName,
            responseText: a.responseText,
            responseFileUrl: a.responseFileUrl,
            responseFileName: a.responseFileName,
            responseSubmittedAt: a.responseSubmittedAt,
          }))}
          trigger={
            <Button type="button" variant="soft" size="sm">
              <ListCheck className="size-4" />
              {tc("review")}
            </Button>
          }
        />
      )}
    </>
  );
}
