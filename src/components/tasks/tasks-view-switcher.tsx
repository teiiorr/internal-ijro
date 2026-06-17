"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskPriorityBadge, TaskStatusBadge } from "./task-status-badge";
import { CalendarView } from "./calendar-view";
import Link from "next/link";
import { List, Calendar as CalendarIcon, Inbox, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { deadlineRelative } from "@/lib/dates";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { EmptyState } from "@/components/empty-state";

type T = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | string | null;
  assignedToName: string | null;
  projectName: string | null;
};

function DeadlinePill({ deadline, completed }: { deadline: Date | string | null; completed: boolean }) {
  if (!deadline) return <span className="text-[var(--subtle)] text-sm">—</span>;
  return <DeadlineCountdown deadline={deadline} completed={completed} />;
}

export function TasksViewSwitcher({ tasks }: { tasks: T[] }) {
  const t = useTranslations();
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[var(--surface-3)] rounded-[10px] p-1 w-fit">
        {([
          ["list", List, t("tasks.view.list")],
          ["calendar", CalendarIcon, t("tasks.view.calendar")],
        ] as const).map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setView(v as typeof view)}
            className={cn(
              "px-3.5 py-1.5 rounded-[8px] text-sm font-semibold transition-all flex items-center gap-2",
              view === v
                ? "bg-[var(--surface)] shadow-[var(--shadow-1)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {view === "list" && (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {tasks.map((row) => {
              const completed = ["completed", "rejected"].includes(row.status);
              return (
                <Link
                  key={row.id}
                  href={`/tasks/${row.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--surface-2)] transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[15px] leading-snug flex-1">{row.title}</p>
                    <ChevronRight className="size-4 text-[var(--subtle)] shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <TaskStatusBadge status={row.status} />
                    <TaskPriorityBadge priority={row.priority} />
                    <DeadlinePill deadline={row.deadline} completed={completed} />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-[var(--muted)]">
                    <span>{row.assignedToName ?? "—"}</span>
                    {row.projectName && <span className="truncate ml-2">{row.projectName}</span>}
                  </div>
                </Link>
              );
            })}
            {tasks.length === 0 && (
              <EmptyState icon={Inbox} title={t("tasks.emptyList")} description={t("tasks.empty.description")} />
            )}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tasks.fields.title")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("tasks.fields.priority")}</TableHead>
                  <TableHead>{t("tasks.fields.assignee")}</TableHead>
                  <TableHead>{t("tasks.fields.project")}</TableHead>
                  <TableHead>{t("tasks.fields.deadline")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((row) => {
                  const completed = ["completed", "rejected"].includes(row.status);
                  const rel = deadlineRelative(row.deadline, { completed });
                  return (
                    <TableRow key={row.id} className={cn(rel.tone === "overdue" && "bg-[var(--danger-soft)]/40")}>
                      <TableCell><Link href={`/tasks/${row.id}`} className="font-medium hover:underline">{row.title}</Link></TableCell>
                      <TableCell><TaskStatusBadge status={row.status} /></TableCell>
                      <TableCell><TaskPriorityBadge priority={row.priority} /></TableCell>
                      <TableCell>{row.assignedToName ?? "—"}</TableCell>
                      <TableCell>{row.projectName ?? "—"}</TableCell>
                      <TableCell><DeadlinePill deadline={row.deadline} completed={completed} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {tasks.length === 0 && (
              <EmptyState icon={Inbox} title={t("tasks.emptyList")} description="Hozircha topshiriqlar yo'q." />
            )}
          </div>
        </>
      )}

      {view === "calendar" && <CalendarView tasks={tasks} />}
    </div>
  );
}
