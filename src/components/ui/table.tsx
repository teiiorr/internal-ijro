import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BIIB jadval oilasi (A4.4.3). Idish — oʻzini-oʻzi tutgan sirt: `--surface`,
 * radius 20, bitta 1px `--line` tashqi qirra, ichki yoritish; oʻz ichida oyna/blur
 * boʻlmaydi (oyna faqat chrome'da). Tor ekranda jadval idish ichida gorizontal
 * suriladi — sahifa boʻylab toshib ketmaydi.
 */
export function Table({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--inner-highlight)]">
      <div className="w-full overflow-x-auto">
        <table className={cn("w-full caption-bottom border-collapse t-small text-[var(--ink-2)]", className)} {...p} />
      </div>
    </div>
  );
}
export function TableHeader({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-[var(--surface-2)]", className)} {...p} />;
}
export function TableBody({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />;
}
export function TableRow({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--line-table)] transition-colors duration-[var(--dur-ui)] ease-[var(--ease-ui)] hover:bg-[var(--surface-2)]",
        className,
      )}
      {...p}
    />
  );
}
export function TableHead({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 text-left align-middle t-micro text-[var(--ink-3)]", className)} {...p} />;
}
export function TableCell({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...p} />;
}
