import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

// Tone drives both the text color and the glow: the animated shadow uses
// currentColor, so the chip lights up in its own tone with no per-tone CSS.
const TONE: Record<StatusTone, string> = {
  green: "text-[var(--success)] bg-[var(--success)]/12",
  amber: "text-[var(--warning)] bg-[var(--warning)]/12",
  red:   "text-[var(--danger)]  bg-[var(--danger)]/12",
  muted: "text-[var(--muted)]   bg-[var(--surface-3)]",
};

const SIZE: Record<StatusSize, string> = {
  sm: "px-2 py-[3px] text-[11px] rounded-[5px]",
  md: "px-2.5 py-1 text-xs rounded-md",
  lg: "px-3.5 py-1.5 text-sm rounded-[7px]",
};

/**
 * Rectangular status chip that breathes in its own tone (a "lit sign"). No dot.
 * `live` toggles the animated glow — on by default for every tone except the
 * neutral `muted` placeholder. The animation is defined in globals.css
 * (`.status-live` / `@keyframes status-blink`) and honors prefers-reduced-motion.
 */
export function StatusTag({
  tone,
  size = "md",
  live,
  children,
  className = "",
}: {
  tone: StatusTone;
  size?: StatusSize;
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const isLive = live ?? tone !== "muted";
  return (
    <span
      className={`inline-flex items-center justify-center font-bold leading-none whitespace-nowrap ${TONE[tone]} ${SIZE[size]} ${isLive ? "status-live" : "status-chip"} ${className}`}
    >
      {children}
    </span>
  );
}
