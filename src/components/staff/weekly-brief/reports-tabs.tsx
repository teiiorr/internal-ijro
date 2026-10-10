"use client";
import { usePathname } from "@/i18n/navigation";
import { IconCalendarStats as CalendarStats, IconTrendingUp as TrendingUp } from "@tabler/icons-react";
import { Segmented } from "@/components/ui-biib/Segmented";

const TABS = [
  { href: "/reports/weekly", key: "weekly", icon: CalendarStats },
  { href: "/reports/slippage", key: "slippage", icon: TrendingUp },
] as const;

/** /reports boʻlimining koʻrinish tanlagichi — bitta segmented control (kapsula emas). */
export function ReportsTabs({ labels }: { labels: { nav: string; weekly: string; slippage: string } }) {
  const pathname = usePathname();
  const items = TABS.map(({ href, key, icon: Icon }) => ({
    href,
    label: labels[key],
    active: pathname === href || pathname.startsWith(`${href}/`),
    icon: <Icon className="size-4 shrink-0" aria-hidden />,
  }));
  return (
    <nav aria-label={labels.nav} className="-mx-1 overflow-x-auto px-1">
      <Segmented items={items} />
    </nav>
  );
}
