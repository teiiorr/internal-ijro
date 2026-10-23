"use client";
import { useTranslations, useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { IconList as List, IconCalendar as CalendarIcon, IconInbox as Inbox, IconFolder as Folder, IconCalendarEvent, IconPaperclip as Paperclip, IconTag as Tag } from "@tabler/icons-react";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui-biib/Card";
import { Link } from "@/i18n/navigation";
import { Status } from "@/components/ui-biib/Status";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { CalendarView } from "./calendar-view";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { bulkSetTaskPriority } from "@/server/actions/tasks";
import { TASK_PRIORITIES } from "@/lib/permissions/tasks";

type T = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | string | null;
  assignedToName: string | null;
  assignedToAvatarUrl?: string | null;
  projectName: string | null;
  /** Topşiriq turi (ixtiyoriy). */
  taskType?: string | null;
  /** Biriktirilgan hujjatlar soni (röyxatda qoğoz qisqiç belgisi). */
  attachmentCount?: number | null;
};

/** Qatorning oʻng tomonidagi yagona belgi: faqat qaror talab qiladigan holat koʻrsatiladi. */
function RowSignal({ row, t }: { row: T; t: ReturnType<typeof useTranslations> }) {
  if (row.status === "under_review")
    return <Status tone="warning" dot>{t("tasks.status.under_review")}</Status>;
  if (row.status === "completed")
    return <Status tone="success" dot>{t("tasks.status.completed")}</Status>;
  if (row.status === "rejected")
    return <Status tone="danger" dot>{t("tasks.status.rejected")}</Status>;
  // todo / in_progress — muddat belgisi (muddati oʻtgan boʻlsa qizil, aks holda xotirjam).
  return <DeadlineCountdown deadline={row.deadline} completed={false} />;
}

export function TasksViewSwitcher({
  tasks,
  hrefBase = "/tasks",
  selectable = false,
}: {
  tasks: T[];
  hrefBase?: string;
  /** Ommaviy amallar (bir nechta vazifani tanlab ustuvorlik belgilash) — faqat ichki /tasks. */
  selectable?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply(priority: (typeof TASK_PRIORITIES)[number]) {
    start(async () => {
      const r = await bulkSetTaskPriority([...sel], priority);
      if (!r.ok) {
        toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.invalid"));
        return;
      }
      toast.success(t("tasks.bulk.applied", { n: r.affected }));
      setSel(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
          {(
            [
              ["list", List, t("tasks.view.list")],
              ["calendar", CalendarIcon, t("tasks.view.calendar")],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v as typeof view)}
              aria-current={view === v ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
                view === v
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        tasks.length === 0 ? (
          <EmptyState icon={Inbox} title={t("tasks.emptyList")} description={t("tasks.empty.description")} />
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((row) => (
              <div key={row.id} className="flex items-center gap-2.5">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={sel.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={t("tasks.bulk.select")}
                    className="size-4 shrink-0 cursor-pointer accent-[var(--tint)]"
                  />
                )}
                <Link href={`${hrefBase}/${row.id}`} className="block min-w-0 flex-1">
                  <Card bare interactive className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{row.title}</p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 t-small text-[var(--ink-3)]">
                        {row.assignedToName && (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <UserAvatar name={row.assignedToName} avatarUrl={row.assignedToAvatarUrl} size="xs" clickable={false} />
                            <span className="truncate">{row.assignedToName}</span>
                          </span>
                        )}
                        {row.taskType && (
                          <span className="inline-flex min-w-0 items-center gap-1" title={t("tasks.fields.taskType")}>
                            <Tag className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{row.taskType}</span>
                          </span>
                        )}
                        {row.projectName && (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Folder className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{row.projectName}</span>
                          </span>
                        )}
                        {row.deadline && (
                          <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                            <IconCalendarEvent className="size-3.5 shrink-0" aria-hidden />
                            {formatShortDate(row.deadline, locale)}
                          </span>
                        )}
                        {!!row.attachmentCount && row.attachmentCount > 0 && (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 tabular-nums"
                            title={t("tasks.attachments.count", { count: row.attachmentCount })}
                          >
                            <Paperclip className="size-3.5 shrink-0" aria-hidden />
                            <span className="sr-only">{t("tasks.attachments.count", { count: row.attachmentCount })}</span>
                            <span aria-hidden>{row.attachmentCount}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <RowSignal row={row} t={t} />
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        <CalendarView tasks={tasks} hrefBase={hrefBase} />
      )}

      {selectable && view === "list" && sel.size > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 shadow-[var(--shadow-2)]">
          <span className="t-small font-semibold text-[var(--ink)]">{t("tasks.bulk.selected", { n: sel.size })}</span>
          <span className="t-small text-[var(--ink-3)]">{t("tasks.bulk.setPriority")}:</span>
          {TASK_PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              onClick={() => apply(p)}
              className="rounded-[var(--radius-control)] border border-[var(--line)] px-2.5 py-1 t-small font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              {t(`tasks.priority.${p}` as "tasks.priority.low")}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSel(new Set())}
            className="ml-1 t-small text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
          >
            {t("tasks.bulk.clear")}
          </button>
        </div>
      )}
    </div>
  );
}
