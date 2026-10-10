import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type SegmentedItem = { href: string; label: ReactNode; active: boolean; icon?: ReactNode };

/** Bir ma'lumot to'plamining ko'rinishlari orasida o'tish (masalan Ro'yxat | Xronologiya). */
export function Segmented({ items, className }: { items: SegmentedItem[]; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-1", className)}>
      {items.map((it, i) => (
        <Link
          key={i}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
            it.active ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-1)]" : "text-ink-2 hover:text-ink",
          )}
        >
          {it.icon}
          {it.label}
        </Link>
      ))}
    </div>
  );
}
