import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import {
  IconArrowsExchange,
  IconBell,
  IconCalendarCheck,
  IconCalendarMinus,
  IconCalendarPlus,
  IconCalendarX,
  IconCircleCheck,
  IconCircleX,
  IconHistory,
  IconMessage,
  IconPaperclip,
  IconPencil,
  IconSend,
  IconSparkles,
  IconUserMinus,
  IconUserPlus,
  type Icon,
} from "@tabler/icons-react";
import { db } from "@/lib/db";
import { taskAssignees, tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { TASK_STATUSES } from "@/lib/permissions/tasks";
import { getTaskHistory } from "@/server/queries/task-history";
import { MANAGER_POSITIONS, fmtDdMm, type HistoryEvent, type HistoryKind } from "./task-edit-logic";

export type TaskHistoryCardProps = {
  taskId: string;
  taskCreatedAt: Date | string;
  locale: string;
};

const VISIBLE = 15;
const TASK_STATUS_KEYS = new Set<string>(TASK_STATUSES);

const KIND_STYLE: Record<HistoryKind, { icon: Icon; tone: string }> = {
  created: { icon: IconSparkles, tone: "text-[var(--primary)] bg-[var(--primary-soft)]" },
  updated: { icon: IconPencil, tone: "text-[var(--primary)] bg-[var(--primary-soft)]" },
  status_changed: { icon: IconArrowsExchange, tone: "text-[var(--muted)] bg-[var(--surface-2)]" },
  response_submitted: { icon: IconSend, tone: "text-[var(--primary)] bg-[var(--primary-soft)]" },
  approved: { icon: IconCircleCheck, tone: "text-[var(--success)] bg-[var(--success-soft)]" },
  rejected: { icon: IconCircleX, tone: "text-[var(--danger)] bg-[var(--danger-soft)]" },
  comment: { icon: IconMessage, tone: "text-[var(--muted)] bg-[var(--surface-2)]" },
  attachment: { icon: IconPaperclip, tone: "text-[var(--muted)] bg-[var(--surface-2)]" },
  assignees_added: { icon: IconUserPlus, tone: "text-[var(--primary)] bg-[var(--primary-soft)]" },
  assignee_removed: { icon: IconUserMinus, tone: "text-[var(--warning)] bg-[var(--warning-soft)]" },
  nudged: { icon: IconBell, tone: "text-[var(--warning)] bg-[var(--warning-soft)]" },
  deadline_requested: { icon: IconCalendarPlus, tone: "text-[var(--warning)] bg-[var(--warning-soft)]" },
  deadline_request_approved: { icon: IconCalendarCheck, tone: "text-[var(--success)] bg-[var(--success-soft)]" },
  deadline_request_rejected: { icon: IconCalendarX, tone: "text-[var(--danger)] bg-[var(--danger-soft)]" },
  deadline_request_cancelled: { icon: IconCalendarMinus, tone: "text-[var(--muted)] bg-[var(--surface-2)]" },
};

const FIELD_KEY: Record<string, string> = {
  title: "fieldTitle",
  description: "fieldDescription",
  priority: "fieldPriority",
  deadlineDate: "fieldDeadline",
};

/** Creator, any assignee, direktor and orinbosar may see the trail (defence in depth; the page gates too). */
async function canViewHistory(taskId: string): Promise<boolean> {
  const me = await requireUser();
  if ((MANAGER_POSITIONS as readonly string[]).includes(me.position)) return true;
  try {
    const [t] = await db.select({ creator: tasks.createdByUserId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!t) return false;
    if (t.creator === me.id) return true;
    const [a] = await db
      .select({ userId: taskAssignees.userId })
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, me.id)))
      .limit(1);
    return !!a;
  } catch {
    return false;
  }
}

export async function TaskHistoryCard({ taskId, taskCreatedAt, locale }: TaskHistoryCardProps) {
  if (!(await canViewHistory(taskId))) return null;
  const [events, t, tr] = await Promise.all([
    getTaskHistory(taskId, taskCreatedAt),
    getTranslations({ locale, namespace: "staffX.taskEdit" }),
    getTranslations({ locale }),
  ]);

  // Newest first: the latest 15 are always visible, older entries fold away.
  const ordered = [...events].reverse();
  const visible = ordered.slice(0, VISIBLE);
  const older = ordered.slice(VISIBLE);

  const sentence = (e: HistoryEvent) => {
    const actor = e.actorName ? localizeName(e.actorName, locale) : t("systemActor");
    const st = e.details.status;
    const status = st ? (TASK_STATUS_KEYS.has(st) ? tr(`tasks.status.${st}`) : st) : "";
    const target = e.details.target ? localizeName(e.details.target, locale) : "—";
    return t(`history.${e.kind}`, { actor, status, target });
  };

  const item = (e: HistoryEvent, last: boolean) => {
    const style = KIND_STYLE[e.kind];
    const KindIcon = style.icon;
    const d = e.details;
    const fields = (d.fields ?? []).map((f) => (FIELD_KEY[f] ? t(FIELD_KEY[f]) : f));
    const showDates = d.toDate !== undefined && (d.fromDate || d.toDate);
    const quote = d.feedback ?? d.note ?? d.reason ?? d.message ?? null;
    return (
      <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
        {!last && <span aria-hidden className="absolute left-[15px] top-9 bottom-0 w-px bg-[var(--border)]" />}
        <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-full", style.tone)}>
          <KindIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {e.actorName && (
                <UserAvatar name={e.actorName} avatarUrl={e.actorAvatar} size="xs" clickable={false} className="shrink-0" />
              )}
              <p className="min-w-0 break-words text-sm leading-snug [overflow-wrap:anywhere]">{sentence(e)}</p>
            </div>
            <time
              dateTime={new Date(e.at).toISOString()}
              className="shrink-0 whitespace-nowrap text-xs text-[var(--subtle)] tabular"
            >
              {formatDateTime(e.at, locale)}
            </time>
          </div>

          {(fields.length > 0 || showDates || (d.targets && d.targets.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
              {fields.map((f) => (
                <span key={f} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-semibold">
                  {f}
                </span>
              ))}
              {showDates && (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-semibold tabular">
                  {fmtDdMm(d.fromDate)} → {fmtDdMm(d.toDate)}
                </span>
              )}
              {d.targets?.map((n, i) => (
                <span key={`${n}-${i}`} className="max-w-full truncate rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-semibold">
                  {localizeName(n, locale)}
                </span>
              ))}
            </div>
          )}

          {quote && (
            <blockquote
              className={cn(
                "whitespace-pre-wrap break-words rounded-xl border-l-2 bg-[var(--surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)] [overflow-wrap:anywhere]",
                e.kind === "rejected" || e.kind === "deadline_request_rejected"
                  ? "border-[var(--danger)]"
                  : "border-[var(--border-strong)]"
              )}
            >
              {quote}
            </blockquote>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)]">
            <IconHistory className="size-5 text-[var(--primary)]" />
          </div>
          <h3 className="min-w-0 truncate text-lg font-bold tracking-tight">{t("historyTitle")}</h3>
        </div>
        <span className="text-sm text-[var(--muted)] tabular">{events.length}</span>
      </div>

      <div className="px-5 pb-6 sm:px-7">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">{t("historyEmpty")}</p>
        ) : (
          <>
            <ol>{visible.map((e, i) => item(e, i === visible.length - 1 && older.length === 0))}</ol>
            {older.length > 0 && (
              <details className="group mt-1">
                <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-[var(--primary)] hover:underline [&::-webkit-details-marker]:hidden">
                  {t("showAll")} ({older.length})
                </summary>
                <ol className="pt-3">{older.map((e, i) => item(e, i === older.length - 1))}</ol>
              </details>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
