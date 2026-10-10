"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { IconList as List, IconCalendar as CalendarIcon, IconInbox as Inbox, IconFolder as Folder } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { CalendarView } from "./calendar-view";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";

type T = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | string | null;
  assignedToName: string | null;
  assignedToAvatarUrl?: string | null;
  projectName: string | null;
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

export function TasksViewSwitcher({ tasks, hrefBase = "/tasks" }: { tasks: T[]; hrefBase?: string }) {
  const t = useTranslations();
  const [view, setView] = useState<"list" | "calendar">("list");

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
          <Card bare className="px-5 sm:px-6">
            <Rows>
              {tasks.map((row) => (
                <Row key={row.id} href={`${hrefBase}/${row.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{row.title}</p>
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 t-small text-[var(--ink-3)]">
                      {row.assignedToName && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <UserAvatar name={row.assignedToName} avatarUrl={row.assignedToAvatarUrl} size="xs" clickable={false} />
                          <span className="truncate">{row.assignedToName}</span>
                        </span>
                      )}
                      {row.projectName && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Folder className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{row.projectName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <RowSignal row={row} t={t} />
                  </div>
                </Row>
              ))}
            </Rows>
          </Card>
        )
      ) : (
        <CalendarView tasks={tasks} hrefBase={hrefBase} />
      )}
    </div>
  );
}
