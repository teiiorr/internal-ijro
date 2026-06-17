import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...p} />
    </div>
  );
}
export function TableHeader({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-[var(--border)] bg-[var(--surface-2)]", className)} {...p} />;
}
export function TableBody({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />;
}
export function TableRow({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]", className)} {...p} />;
}
export function TableHead({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-10 px-4 text-left align-middle text-xs font-semibold text-[var(--muted)] uppercase tracking-wider", className)} {...p} />;
}
export function TableCell({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...p} />;
}
