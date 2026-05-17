"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskPriorityBadge, TaskStatusBadge } from "./task-status-badge";
import { CalendarView } from "./calendar-view";
import Link from "next/link";
import { List, Calendar as CalendarIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { deadlineRelative } from "@/lib/dates";
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
                ? "bg-[var(--background-elevated)] shadow-soft text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {view === "list" && (
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
              const rel = deadlineRelative(row.deadline, { completed: ["completed", "rejected"].includes(row.status) });
              return (
                <TableRow key={row.id} className={cn(rel.tone === "overdue" && "bg-[var(--danger-soft)]/40")}>
                  <TableCell><Link href={`/tasks/${row.id}`} className="font-medium hover:underline">{row.title}</Link></TableCell>
                  <TableCell><TaskStatusBadge status={row.status} /></TableCell>
                  <TableCell><TaskPriorityBadge priority={row.priority} /></TableCell>
                  <TableCell>{row.assignedToName ?? "—"}</TableCell>
                  <TableCell>{row.projectName ?? "—"}</TableCell>
                  <TableCell className="tabular">
                    {row.deadline ? (
                      <span className={cn(
                        "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                        rel.tone === "overdue" ? "bg-[var(--danger-soft)] text-[var(--danger)]" :
                        rel.tone === "soon" || rel.tone === "today" ? "bg-[var(--warning-soft)] text-[var(--warning)]" :
                        "bg-[var(--surface-3)] text-[var(--muted)]"
                      )}>
                        {rel.text}
                      </span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {view === "list" && tasks.length === 0 && (
        <EmptyState icon={Inbox} title={t("tasks.emptyList")} description="Hozircha sizga topshiriqlar yo'q. Yangi topshiriqlar paydo bo'lganda bu yerda ko'rinadi." />
      )}

      {view === "calendar" && <CalendarView tasks={tasks} />}
    </div>
  );
}
