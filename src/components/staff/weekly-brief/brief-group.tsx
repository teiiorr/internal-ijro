import * as React from "react";
import { cn } from "@/lib/utils";

export type GroupTone = "default" | "success" | "warning" | "danger";

const BOX: Record<GroupTone, string> = {
  default: "border-[var(--border)] bg-[var(--surface-2)]",
  success: "border-[var(--border)] bg-[var(--surface-2)]",
  warning: "border-[var(--warning)]/30 bg-[var(--warning-soft)]",
  danger: "border-[var(--danger)]/30 bg-[var(--danger-soft)]",
};

const CHIP: Record<GroupTone, string> = {
  default: "bg-[var(--surface-3)] text-[var(--muted)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning)]/20 text-[var(--warning)]",
  danger: "bg-[var(--danger)]/15 text-[var(--danger)]",
};

/** Karta sarlavhasi: ikonka + nom (+ ixtiyoriy oʻng tomondagi element). */
export function BriefSectionTitle({
  icon,
  title,
  aside,
}: {
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </div>
        <h2 className="min-w-0 break-words text-base font-bold tracking-tight sm:text-lg">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

/**
 * Guruh: sarlavha + son chipi + roʻyxat. Birinchi `visible` ta element koʻrinadi,
 * qolganlari JS'siz <details> ichida ("Yana N ta").
 */
export function BriefGroup<T>({
  title,
  icon,
  tone = "default",
  items,
  render,
  getKey,
  moreLabel,
  visible = 6,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: GroupTone;
  items: T[];
  render: (item: T) => React.ReactNode;
  getKey: (item: T, i: number) => string;
  moreLabel: (count: number) => string;
  visible?: number;
}) {
  const head = items.slice(0, visible);
  const rest = items.slice(visible);
  return (
    <div className={cn("min-w-0 rounded-xl border px-3 py-2.5 sm:px-4", BOX[tone])}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
          {icon && <span className="shrink-0 text-[var(--muted)]">{icon}</span>}
          <span className="min-w-0 break-words">{title}</span>
        </h3>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums", CHIP[tone])}>
          {items.length}
        </span>
      </div>
      <ul className="mt-1 divide-y divide-[var(--border)]">
        {head.map((it, i) => (
          <li key={getKey(it, i)} className="min-w-0 py-2">
            {render(it)}
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-1.5 text-xs font-semibold text-[var(--primary)] hover:underline group-open:hidden">
            {moreLabel(rest.length)}
          </summary>
          <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {rest.map((it, i) => (
              <li key={getKey(it, i + visible)} className="min-w-0 py-2">
                {render(it)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Roʻyxat qatori: chapda nom/izoh (qisqartiriladi), oʻngda meta (mobil — pastda). */
export function BriefRow({
  primary,
  secondary,
  meta,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <div className="min-w-0 truncate text-sm font-semibold">{primary}</div>
        {secondary && <div className="min-w-0 truncate text-xs text-[var(--muted)]">{secondary}</div>}
      </div>
      {meta && <div className="shrink-0 text-xs tabular-nums text-[var(--muted)] sm:pt-0.5 sm:text-right">{meta}</div>}
    </div>
  );
}
