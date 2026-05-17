"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TaskPriorityBadge, TaskStatusBadge } from "./task-status-badge";
import { KanbanBoard } from "./kanban-board";
import { CalendarView } from "./calendar-view";
import Link from "next/link";
import { List, KanbanSquare, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [view, setView] = useState<"list" | "kanban" | "calendar">("list");

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {([
          ["list", List, t("tasks.view.list")], ["kanban", KanbanSquare, t("tasks.view.kanban")], ["calendar", CalendarIcon, t("tasks.view.calendar")],
        ] as const).map(([v, Icon, label]) => (
          <Button
            key={v}
            size="sm"
            variant={view === v ? "default" : "outline"}
            onClick={() => setView(v as typeof view)}
            className={cn(view === v && "shadow")}
          >
            <Icon className="size-4" /> {label}
          </Button>
        ))}
      </div>
      {view === "list" && (
        <Table>
          <TableHeader>
            <TableRow><TableHead>{t("tasks.fields.title")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead>{t("tasks.fields.priority")}</TableHead><TableHead>{t("tasks.fields.assignee")}</TableHead><TableHead>{t("tasks.fields.project")}</TableHead><TableHead>{t("tasks.fields.deadline")}</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => {
              const overdue = t.deadline && new Date(t.deadline) < new Date() && !["completed", "rejected"].includes(t.status);
              return (
                <TableRow key={t.id} className={overdue ? "bg-[var(--danger)]/5" : undefined}>
                  <TableCell><Link href={`/tasks/${t.id}`} className="font-medium hover:underline">{t.title}</Link></TableCell>
                  <TableCell><TaskStatusBadge status={t.status} /></TableCell>
                  <TableCell><TaskPriorityBadge priority={t.priority} /></TableCell>
                  <TableCell>{t.assignedToName ?? "—"}</TableCell>
                  <TableCell>{t.projectName ?? "—"}</TableCell>
                  <TableCell>{t.deadline ? new Date(t.deadline).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              );
            })}
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-[var(--muted)]">{t("tasks.emptyList")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
      {view === "kanban" && <KanbanBoard initialTasks={tasks} />}
      {view === "calendar" && <CalendarView tasks={tasks} />}
    </div>
  );
}
