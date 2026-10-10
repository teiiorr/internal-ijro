import * as React from "react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

/**
 * Karta ichidagi roʻyxat — ajratuvchi qatorlar, qutilar emas (A4.4.1).
 * `divide-y --line`, radiussiz, oʻz foni yoʻq; hover = butun qator boʻylab `--surface-2`.
 * Qatorlar standart karta paddingiga (p-5 sm:p-6) «toʻkiladi», shuning uchun negativ margin.
 */
export function Rows({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ul className={cn("-my-1 divide-y divide-[var(--line)]", className)}>{children}</ul>;
}

export function Row({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const inner = (
    <div
      className={cn(
        "-mx-5 flex items-center gap-3 px-5 py-3 transition-colors sm:-mx-6 sm:px-6",
        (href || onClick) && "hover:bg-[var(--surface-2)]",
        className,
      )}
    >
      {children}
    </div>
  );
  if (href) {
    return (
      <li>
        <Link href={href} className="block">
          {inner}
        </Link>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className="block w-full text-left">
          {inner}
        </button>
      </li>
    );
  }
  return <li>{inner}</li>;
}
