"use client";
import { useMemo, useState } from "react";
import { addMonths, endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { id: string; userName: string; startDate: string; endDate: string; type: string; status: string };

const STATUS_BG: Record<string, string> = {
  approved: "bg-[var(--success)]/20",
  pending: "bg-[var(--warning)]/20",
  rejected: "bg-[var(--danger)]/15",
};

export function LeavesCalendar({ items }: { items: Item[] }) {
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
        <h3 className="font-medium">{format(cursor, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden text-sm">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="bg-[var(--secondary)] px-2 py-1 text-xs uppercase text-[var(--muted)]">{d}</div>
        ))}
        {days.map((d) => {
          const dayItems = items.filter((it) => {
            const s = parseISO(it.startDate);
            const e = parseISO(it.endDate);
            return isWithinInterval(d, { start: s, end: e });
          });
          return (
            <div key={d.toISOString()} className="bg-[var(--surface)] min-h-[80px] p-1.5 space-y-0.5">
              <div className="text-xs text-[var(--muted)]">{format(d, "d")}</div>
              {dayItems.slice(0, 3).map((it) => (
                <div key={`${it.id}-${d.toISOString()}`} className={cn("truncate text-xs rounded px-1.5 py-0.5", STATUS_BG[it.status] ?? "bg-[var(--accent)]")}>
                  {it.userName} · {it.type}
                </div>
              ))}
              {dayItems.length > 3 && <div className="text-xs text-[var(--muted)]">+{dayItems.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
