"use client";
import { useLocale, useTranslations } from "next-intl";
import { IconBellRinging as BellRinging, IconListCheck as ListCheck, IconFolder as Folder } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui-biib/Card";
import { Status } from "@/components/ui-biib/Status";
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
  medium: "bg-[var(--tint)]",
  low: "bg-[var(--ink-3)]",
};

type T = ReturnType<typeof useTranslations>;

/**
 * Nazorat taxtasi. md+ → jadval (qattiq karta); md ostida — bitta qattiq kartadagi
 * ajratuvchi bloklar (quti emas, sahifa boʻylab gorizontal skroll yoʻq).
 * Har bir ijrochi — holat rangi bilan halqalangan avatar; muddati oʻtganiga qoʻshimcha qizil halqa.
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
      <Card solid className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <ListCheck className="size-8 text-[var(--ink-3)]" aria-hidden />
        <p className="t-small font-medium text-[var(--ink-2)]">{tc("empty")}</p>
      </Card>
    );
  }

  return (
    <>
      {/* md+ : table */}
      <Card solid bare className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left t-micro text-[var(--ink-3)]">
                <th className="px-4 py-3 font-semibold">{tc("colTask")}</th>
                <th className="px-3 py-3 font-semibold">{tc("colDeadline")}</th>
                <th className="px-3 py-3 font-semibold">{tc("colAssignees")}</th>
                <th className="px-3 py-3 font-semibold">{tc("colProgress")}</th>
                <th className="px-3 py-3 font-semibold">{tc("lastResponse")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const canManage = isLeadership || r.createdByUserId === currentUserId;
                return (
                  <tr key={r.id} className="border-b border-[var(--line)] align-top transition-colors last:border-b-0 hover:bg-[var(--surface-2)]">
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
                    <td className="whitespace-nowrap px-3 py-3.5 t-small text-[var(--ink-3)]">
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
      </Card>

      {/* < md : bitta kartadagi ajratuvchi bloklar */}
      <Card solid bare className="divide-y divide-[var(--line)] md:hidden">
        {rows.map((r) => {
          const canManage = isLeadership || r.createdByUserId === currentUserId;
          return (
            <div key={r.id} className="min-w-0 space-y-3 p-4">
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
                <span className="t-small text-[var(--ink-3)]">
                  {tc("lastResponse")}:{" "}
                  <span suppressHydrationWarning>{r.lastResponseAt ? timeAgo(r.lastResponseAt, locale) : "—"}</span>
                </span>
              </div>
              {canManage && hasActions(r) && (
                <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3 [&>*]:flex-1 sm:[&>*]:flex-initial">
                  <RowActions row={r} canManage={canManage} tc={tc} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
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
          <span className="truncate font-mono text-[11px] font-semibold text-[var(--ink-3)]">{row.registrationNumber}</span>
        )}
      </div>
      <Link
        href={`/tasks/${row.id}`}
        className="line-clamp-2 break-words font-semibold leading-snug text-[var(--ink)] hover:text-[var(--tint)]"
      >
        {row.title}
      </Link>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 t-small text-[var(--ink-3)]">
        {row.projectName && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            <Folder className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{row.projectName}</span>
          </span>
        )}
        {row.createdByUserId !== currentUserId && <span className="truncate">{shortName(row.creatorName)}</span>}
      </div>
    </div>
  );
}

function DeadlineCell({ row, locale }: { row: ControlRow; locale: string }) {
  if (!row.deadline) return <span className="t-small text-[var(--ink-3)]">—</span>;
  return (
    <div className="flex flex-col items-end gap-1 md:items-start">
      <DeadlineCountdown deadline={row.deadline} />
      <span className="t-micro tabular-nums text-[var(--ink-3)]">{formatDate(row.deadline, locale)}</span>
    </div>
  );
}

function Progress({ row, tc }: { row: ControlRow; tc: T }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 t-small font-semibold tabular-nums text-[var(--ink)]">
      <span>{tc("answered", { answered: row.answered, total: row.total })}</span>
      {row.underReview > 0 && <Status tone="warning">{tc("underReviewCount", { count: row.underReview })}</Status>}
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
          a.overdue ? `${statusLabel}, ${tc("overdue")}` : statusLabel,
          a.nudgeCount > 0 ? tc("nudgedTimes", { count: a.nudgeCount }) : null,
        ]
          .filter(Boolean)
          .join(", ");
        const ring = chipRingColor(a.status);
        return (
          <li
            key={a.userId}
            title={tip}
            aria-label={tip}
            className="relative inline-flex rounded-full"
            style={{
              boxShadow: a.overdue
                ? `0 0 0 2px ${ring}, 0 0 0 4px var(--surface), 0 0 0 6px var(--danger)`
                : `0 0 0 2px ${ring}`,
            }}
          >
            <UserAvatar name={shortName(a.fullName)} avatarUrl={a.avatarUrl} size="xs" clickable={false} className="ring-0" />
            {a.nudgeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--surface-3)] px-1 text-[9px] font-bold tabular-nums text-[var(--ink-3)] ring-2 ring-[var(--surface)]">
                {a.nudgeCount}
              </span>
            )}
          </li>
        );
      })}
      {rest.length > 0 && (
        <li
          title={rest.map((a) => a.fullName).join(", ")}
          className="grid size-8 place-items-center rounded-full bg-[var(--surface-3)] text-[11px] font-bold text-[var(--ink-3)]"
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
            <Button type="button" variant="default" size="sm">
              <ListCheck className="size-4" />
              {tc("review")}
            </Button>
          }
        />
      )}
    </>
  );
}
