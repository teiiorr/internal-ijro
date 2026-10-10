import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "success" | "warning" | "danger";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-[var(--ink)]",
  primary: "text-[var(--tint)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
};
const FILL_TONE: Record<Tone, string> = {
  default: "bg-[var(--surface-2)] text-[var(--ink-2)]",
  primary: "bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] text-[var(--tint)]",
  success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]",
  danger: "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)]",
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  /** Butun kartani havolaga aylantiradi (bosiladigan son). */
  href?: string;
  /** Qoʻshimcha urgʻu: butun kartani tusning yengil aralashmasiga boʻyaydi. */
  filled?: boolean;
  className?: string;
}

/**
 * Son-karta. BIIB'ga xotirjamlashtirilgan: shovqinli KPI-plitka emas — yorliq oddiy
 * `--ink-2` matn (uppercase/ikonka-quti yoʻq), son yirik va tabular. `filled` butun
 * kartani tusning 14% aralashmasiga boʻyaydi (qattiq rang emas).
 */
export function StatCard({ label, value, hint, icon, tone = "default", href, filled, className }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="t-micro text-[var(--ink-2)]">{label}</p>
        {icon && <span className="shrink-0 text-[var(--ink-3)]">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-3xl font-bold leading-none tabular-nums sm:text-[2rem]", VALUE_TONE[tone])}>{value}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-[var(--ink-2)]">{hint}</p>}
    </>
  );

  const cls = cn(
    "block rounded-[var(--radius-card)] p-4 sm:p-5",
    filled ? FILL_TONE[tone] : "border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-1)]",
    href &&
      "transition-[transform,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--line-strong)] active:scale-[0.99]",
    className,
  );

  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
