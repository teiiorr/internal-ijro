import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "success" | "warning" | "danger";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-[var(--foreground)]",
  primary: "text-[var(--primary)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
};
const CHIP_TONE: Record<Tone, string> = {
  default: "bg-[var(--surface-3)] text-[var(--muted)]",
  primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
  success: "bg-[var(--success)]/15 text-[var(--success)]",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
  danger: "bg-[var(--danger)]/15 text-[var(--danger)]",
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  /** Makes the whole tile a link (clickable KPI). */
  href?: string;
  /** Extra emphasis: tint the whole tile in the tone. */
  filled?: boolean;
  className?: string;
}

/**
 * Big KPI tile — the "large clear display" building block. A prominent number
 * with a label, optional icon, tone color and click target. Used across the
 * studios dashboards, studio hub and project facts.
 */
export function StatCard({ label, value, hint, icon, tone = "default", href, filled, className }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
        {icon && (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", CHIP_TONE[tone])}>{icon}</span>
        )}
      </div>
      <p className={cn("mt-2 text-3xl font-bold leading-none tabular-nums sm:text-[2rem]", VALUE_TONE[tone])}>{value}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-[var(--muted)]">{hint}</p>}
    </>
  );

  const cls = cn(
    "block rounded-2xl border p-4 shadow-[var(--shadow-1)] sm:p-5",
    filled
      ? cn("border-transparent", CHIP_TONE[tone])
      : "border-[var(--border)] bg-[var(--card)]",
    href && "transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)] active:scale-[0.99]",
    className,
  );

  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
