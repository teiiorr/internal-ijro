import * as React from "react";
import { cn } from "@/lib/utils";

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/** BIIB tokenli native <select> (dialoglar ichida tekis boshqaruv). */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "t-body h-12 w-full min-w-0 appearance-none truncate rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-4 pr-9 text-[var(--ink)] transition-colors focus:border-[var(--focus)] focus:outline-none disabled:text-[var(--ink-3)]",
        className
      )}
      style={{ backgroundImage: CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", ...style }}
      {...props}
    />
  )
);
NativeSelect.displayName = "NativeSelect";
