import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

// `tone` drives the fill color; the chip is a static solid fill with white
// text (see .status-tag in globals.css) — no animation.
const TONE: Record<StatusTone, string> = {
  green: "var(--success)",
  amber: "var(--warning)",
  red:   "var(--danger)",
  muted: "var(--muted)",
};

const SIZE: Record<StatusSize, { box: string; ch: string }> = {
  sm: { box: "px-2 py-[3px] text-[10px] tracking-[0.05em]", ch: "4px" },
  md: { box: "px-2.5 py-1 text-[11px] tracking-[0.06em]", ch: "5px" },
  lg: { box: "px-3.5 py-1.5 text-[13px] tracking-[0.06em]", ch: "7px" },
};

/**
 * Angular status "signal tag": chamfered corners, uppercase, solid color fill.
 * Static (no animation). `live` is accepted for API compatibility but ignored.
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
  const s = SIZE[size];
  return (
    <span
      style={{ ["--tone" as string]: TONE[tone], ["--ch" as string]: s.ch }}
      className={`status-tag ${s.box} inline-flex items-center justify-center font-extrabold uppercase leading-none whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}
