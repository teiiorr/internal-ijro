"use client";
import { useMemo, useState } from "react";
import { addMonths, endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { CalendarDayOverflow, DayChip, type CalendarLeaveItem } from "@/components/leaves/calendar-day-overflow";

export function LeavesCalendar({ items }: { items: CalendarLeaveItem[] }) {
  const [cursor, setCursor] = useState(new Date());
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
    return out;
  }, [cursor]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="prev" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft className="size-4" /></Button>
        <h3 className="t-h4 tabular-nums text-[var(--ink)]">{format(cursor, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" aria-label="next" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-m)] bg-[var(--line)] text-sm">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-[var(--surface-2)] px-2 py-1 t-micro text-[var(--ink-3)]">{d}</div>
        ))}
        {days.map((d) => {
          const dayItems = items.filter((it) => {
            const s = parseISO(it.startDate);
            const e = parseISO(it.endDate);
            return isWithinInterval(d, { start: s, end: e });
          });
          // Kataqqa koʻpi bilan 3 ta chip sigʻadi; qolgani "+N" oynasida ochiladi.
          const shown = dayItems.slice(0, 3);
          const hidden = dayItems.slice(3);
          return (
            <div key={d.toISOString()} className="flex min-h-[80px] flex-col gap-0.5 bg-[var(--surface)] p-1.5">
              <div className="t-micro tabular-nums text-[var(--ink-3)]">{format(d, "d")}</div>
              {shown.map((it) => (
                <DayChip key={`${it.id}-${d.toISOString()}`} item={it} className="truncate" />
              ))}
              {hidden.length > 0 && <CalendarDayOverflow items={hidden} dayLabel={format(d, "d MMMM")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
