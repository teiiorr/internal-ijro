import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

// Xotirjam «Status» koʻrinishi (A4.4.4): tusning oʻz rangi matnda, 14% aralashma toʻldirishda.
// Burchak qiymati 6px (radius-s), kapsula/clip-path yoki uppercase yoʻq.
const TONE: Record<StatusTone, string> = {
  green: "var(--success)",
  amber: "var(--warning)",
  red:   "var(--danger)",
  muted: "var(--ink-2)",
};

const SIZE: Record<StatusSize, string> = {
  sm: "min-h-5 px-1.5 text-[11px]",
  md: "min-h-6 px-2 text-[0.75rem]",
  lg: "min-h-7 px-2.5 text-[13px]",
};

/**
 * Xotirjam holat belgisi. Avval burchakli «signal yorligʻi» edi; endi BIIB `Status`
 * koʻrinishida. `live` API mosligi uchun qabul qilinadi, biroq eʼtiborsiz qoldiriladi.
 */
export function StatusTag({
  tone,
  size = "md",
  live: _live,
  children,
  className = "",
}: {
  tone: StatusTone;
  size?: StatusSize;
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const c = TONE[tone];
  return (
    <span
      style={{ color: c, backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)` }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] font-semibold leading-none whitespace-nowrap ${SIZE[size]} ${className}`}
    >
      {children}
    </span>
  );
}
