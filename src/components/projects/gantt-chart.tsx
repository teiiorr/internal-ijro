"use client";
import { useMemo } from "react";
import { differenceInDays, format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type M = {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  weight: number;
};

type Props = {
  projectStart: string | null;
  projectDeadline: string | null;
  milestones: M[];
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[var(--muted)]/40",
  in_progress: "bg-[var(--primary)]/70",
  completed: "bg-[var(--success)]/70",
};

export function GanttChart({ projectStart, projectDeadline, milestones }: Props) {
  const data = useMemo(() => {
    const ms = milestones
      .map((m, idx) => ({ ...m, _idx: idx, _deadline: m.deadline ? parseISO(m.deadline) : null }))
      .filter((m) => m._deadline && isValid(m._deadline));
    if (ms.length === 0) return null;

    const startDate = projectStart ? parseISO(projectStart) : new Date(Math.min(...ms.map((m) => m._deadline!.getTime())) - 7 * 86400000);
    const endDate = projectDeadline
      ? parseISO(projectDeadline)
      : new Date(Math.max(...ms.map((m) => m._deadline!.getTime())));
    const totalDays = Math.max(1, differenceInDays(endDate, startDate));

    // Each milestone gets a band spanning from previous milestone's deadline (or projectStart) to its own deadline.
    let prev = startDate;
    const bands = ms.map((m) => {
      const start = prev;
      const end = m._deadline!;
      const offsetPct = Math.max(0, Math.min(100, (differenceInDays(start, startDate) / totalDays) * 100));
      const widthPct = Math.max(2, Math.min(100, (differenceInDays(end, start) / totalDays) * 100));
      prev = end;
      return { ...m, offsetPct, widthPct, start, end };
    });
    return { startDate, endDate, totalDays, bands };
  }, [projectStart, projectDeadline, milestones]);

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Add milestones with deadlines to see the Gantt chart.</p>;
  }

  const { startDate, endDate, bands } = data;
  return (
    <div className="space-y-3">
      <div className="text-xs text-[var(--muted)] flex justify-between">
        <span>{format(startDate, "yyyy-MM-dd")}</span>
        <span>{format(endDate, "yyyy-MM-dd")}</span>
      </div>
      <div className="space-y-2">
        {bands.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-sm">
            <span className="w-44 truncate" title={m.title}>{m.title}</span>
            <div className="flex-1 h-6 bg-[var(--secondary)] rounded relative overflow-hidden">
              <div
                className={cn("absolute top-0 h-full rounded", STATUS_COLOR[m.status] ?? STATUS_COLOR.pending)}
                style={{ left: `${m.offsetPct}%`, width: `${m.widthPct}%` }}
                title={`${format(m.start, "yyyy-MM-dd")} → ${format(m.end, "yyyy-MM-dd")}`}
              />
            </div>
            <span className="w-24 text-xs text-[var(--muted)] text-right">{format(m.end, "MMM d")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
