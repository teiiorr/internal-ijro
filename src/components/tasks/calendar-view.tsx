"use client";
import { useMemo, useState } from "react";
import { addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; deadline: Date | string | null; status: string };

export function CalendarView({ tasks }: { tasks: Item[] }) {
  const [cursor, setCursor] = useState(new Date());
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
    return out;
  }, [cursor]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft className="size-4" /></Button>
        <h2 className="font-medium">{format(cursor, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden text-sm">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="bg-[var(--secondary)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">{d}</div>
        ))}
        {days.map((d) => {
          const dayTasks = tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), d));
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "bg-[var(--surface)] min-h-[100px] p-2 space-y-1",
                !isSameMonth(d, cursor) && "opacity-50",
                isSameDay(d, new Date()) && "ring-2 ring-inset ring-[var(--primary)]"
              )}
            >
              <div className="text-xs text-[var(--muted)]">{format(d, "d")}</div>
              {dayTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className={cn(
                    "block truncate rounded px-1.5 py-0.5 text-xs",
                    t.status === "completed" ? "bg-[var(--success)]/20" : t.status === "rejected" ? "bg-[var(--danger)]/20" : "bg-[var(--primary)]/15"
                  )}
                >
                  {t.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
