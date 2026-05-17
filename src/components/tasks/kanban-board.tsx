"use client";
import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { TaskPriorityBadge } from "./task-status-badge";
import { moveTaskOnKanban } from "@/server/actions/tasks";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | string | null;
  assignedToName: string | null;
};

const STATUSES = ["todo", "in_progress", "under_review", "completed", "rejected"] as const;

function TaskCard({ task }: { task: TaskRow }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: task.id });
  const overdue = task.deadline && new Date(task.deadline) < new Date() && !["completed", "rejected"].includes(task.status);
  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        overdue && "border-l-4 border-l-[var(--danger)]"
      )}
    >
      <CardContent className="p-3 space-y-2">
        <Link href={`/tasks/${task.id}`} className="block font-medium text-sm hover:underline" onClick={(e) => e.stopPropagation()}>
          {task.title}
        </Link>
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <TaskPriorityBadge priority={task.priority} />
          <span>{task.assignedToName ?? "—"}</span>
        </div>
        {task.deadline && (
          <div className={cn("text-xs", overdue ? "text-[var(--danger)] font-medium" : "text-[var(--muted)]")}>
            {new Date(task.deadline).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Column({ status, tasks }: { status: string; tasks: TaskRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const t = useTranslations();
  return (
    <div ref={setNodeRef} className={cn("flex-1 min-w-[260px] rounded-lg bg-[var(--secondary)] p-3 space-y-2", isOver && "ring-2 ring-[var(--primary)]")}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{t(`tasks.status.${status}` as `tasks.status.todo`)}</h3>
        <span className="text-xs text-[var(--muted)]">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialTasks }: { initialTasks: TaskRow[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [active, setActive] = useState<TaskRow | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onStart(e: DragStartEvent) {
    const t = tasks.find((x) => x.id === e.active.id);
    if (t) setActive(t);
  }
  function onEnd(e: DragEndEvent) {
    setActive(null);
    if (!e.over) return;
    const newStatus = e.over.id as string;
    const task = tasks.find((x) => x.id === e.active.id);
    if (!task || task.status === newStatus) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    start(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await moveTaskOnKanban(task.id, newStatus as any);
      } catch {
        // rollback
        setTasks((prev) => prev.map((x) => (x.id === task.id ? task : x)));
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUSES.map((s) => (
          <Column key={s} status={s} tasks={tasks.filter((t) => t.status === s)} />
        ))}
      </div>
      <DragOverlay>{active && <TaskCard task={active} />}</DragOverlay>
    </DndContext>
  );
}
