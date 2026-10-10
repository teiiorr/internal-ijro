"use client";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { shortDate } from "./kind-meta";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Mon–Sun hafta tasmasi: kun bosilganda ?day= oʻrnatiladi, qayta bosilganda olib tashlanadi.
 * BIIB: kapsulasiz, xotirjam kataklar — tanlangan kun tint-fonda, bugun tint qirrada,
 * sanoq esa oddiy raqam (suzuvchi nishoncha emas).
 */
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
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 sm:grid sm:grid-cols-7 sm:overflow-visible"
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
                "flex min-h-[3.25rem] min-w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] border px-2 py-2 transition-colors sm:min-w-0",
                isSelected
                  ? "border-[var(--tint)] bg-[color-mix(in_oklab,var(--tint)_12%,transparent)]"
                  : isToday
                    ? "border-[var(--tint)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                    : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]",
                isPast && !isSelected && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  isSelected || isToday ? "text-[var(--tint)]" : "text-[var(--ink-3)]",
                )}
              >
                {t(`weekday.${WEEKDAY_KEYS[i] ?? "mon"}`)}
              </span>
              <span
                className={cn(
                  "text-lg font-bold leading-none tabular-nums",
                  isSelected || isToday ? "text-[var(--tint)]" : "text-[var(--ink)]",
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
              <span className="min-h-4 leading-4">
                {count > 0 && (
                  <span
                    className={cn(
                      "t-micro tabular-nums",
                      isPast && !isSelected ? "text-[var(--danger)]" : "text-[var(--tint)]",
                    )}
                  >
                    {count}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      {selected && (
        <Link
          href={href(null)}
          scroll={false}
          replace
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1.5 t-label text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >
          <IconX className="size-3.5" aria-hidden />
          {t("clearDay")}
          <span className="text-[var(--ink-3)]">, {shortDate(selected, locale, year)}</span>
        </Link>
      )}
    </div>
  );
}
