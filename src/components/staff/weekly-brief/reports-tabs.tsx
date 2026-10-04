"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { IconCalendarStats as CalendarStats, IconTrendingUp as TrendingUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports/weekly", key: "weekly", icon: CalendarStats },
  { href: "/reports/slippage", key: "slippage", icon: TrendingUp },
] as const;

/** /reports boʻlimining tab paneli (tasks sahifasidagi status tablari uslubida). */
export function ReportsTabs({ labels }: { labels: { nav: string; weekly: string; slippage: string } }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={labels.nav}
      className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 px-1 sm:mx-0 sm:w-fit"
    >
      {TABS.map(({ href, key, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition-all sm:px-4 sm:text-[14px]",
              active
                ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-1)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{labels[key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
