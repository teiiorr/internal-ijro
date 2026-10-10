"use client";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { shortDate } from "./kind-meta";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Mon–Sun hafta tasmasi: kun bosilganda ?day= oʻrnatiladi, qayta bosilganda olib tashlanadi. */
export function WeekStrip({
  days,
  counts,
  selected,
  today,
  kind,
}: {
  days: string[];
  counts: Record<string, number>;
  selected: string | null;
  today: string;
  kind?: string | null;
}) {
  const t = useTranslations("staffX.myWork");
  const locale = useLocale();
  const scroller = useRef<HTMLDivElement>(null);

  // Mobil tasmada tanlangan (yoki bugungi) kunni koʻrinadigan joyga suramiz — sahifa vertikal siljimaydi.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const target =
      el.querySelector<HTMLElement>("[data-selected='true']") ?? el.querySelector<HTMLElement>("[data-today='true']");
    if (!target) return;
    el.scrollLeft = target.offsetLeft - el.clientWidth / 2 + target.offsetWidth / 2;
  }, [selected]);

  const href = (day: string | null) => {
    const p = new URLSearchParams();
    if (kind) p.set("kind", kind);
    if (day) p.set("day", day);
    const q = p.toString();
    return q ? `/my-work?${q}` : "/my-work";
  };

  const year = today.slice(0, 4);

  return (
    <div className="space-y-2">
      <div
        ref={scroller}
        className="-mx-1 flex gap-2 overflow-x-auto pb-1 pl-1 pr-2.5 pt-2 scrollbar-thin sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-1"
      >
        {days.map((day, i) => {
          const isToday = day === today;
          const isSelected = day === selected;
          const isPast = day < today;
          const count = counts[day] ?? 0;
          return (
            <Link
              key={day}
              href={href(isSelected ? null : day)}
              scroll={false}
              replace
              data-today={isToday ? "true" : undefined}
              data-selected={isSelected ? "true" : undefined}
              aria-current={isSelected ? "true" : isToday ? "date" : undefined}
              aria-label={`${shortDate(day, locale, year)} — ${t("dayCount", { count })}`}
              className={cn(
                "relative flex min-w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-2 transition-colors sm:min-w-0",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-1)]"
                  : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
                isToday && !isSelected && "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--background)]",
                isPast && !isSelected && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  isSelected ? "text-[var(--primary-foreground)]" : isToday ? "text-[var(--primary)]" : "text-[var(--muted)]",
                )}
              >
                {t(`weekday.${WEEKDAY_KEYS[i] ?? "mon"}`)}
              </span>
              <span className="text-lg font-bold leading-none tabular">{Number(day.slice(8, 10))}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "absolute -right-1.5 -top-1.5 min-w-5 rounded-md px-1.5 text-center text-[11px] font-bold leading-5 tabular shadow-[var(--shadow-1)]",
                    isSelected
                      ? "bg-[var(--card)] text-[var(--primary)]"
                      : isPast
                        ? "bg-[var(--danger)] text-white"
                        : "bg-[var(--primary)] text-[var(--primary-foreground)]",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {selected && (
        <Link
          href={href(null)}
          scroll={false}
          replace
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-3)] px-3 py-1 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <IconX className="size-3.5" aria-hidden />
          {t("clearDay")}
          <span className="font-medium">· {shortDate(selected, locale, year)}</span>
        </Link>
      )}
    </div>
  );
}
