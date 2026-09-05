import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

// `tone` drives a solid color + its high-contrast on-color. The chip hard-flips
// between an outline state and a solid fill (see .status-flash in globals.css),
// so it snaps on/off like an alarm rather than glowing.
const TONE: Record<StatusTone, { tone: string; on: string }> = {
  green: { tone: "var(--success)", on: "#04231a" },
  amber: { tone: "var(--warning)", on: "#241a02" },
  red:   { tone: "var(--danger)",  on: "#ffffff" },
  muted: { tone: "var(--muted)",   on: "var(--foreground)" },
};

const SIZE: Record<StatusSize, { box: string; ch: string }> = {
  sm: { box: "px-2 py-[3px] text-[10px] tracking-[0.05em]", ch: "4px" },
  md: { box: "px-2.5 py-1 text-[11px] tracking-[0.06em]", ch: "5px" },
  lg: { box: "px-3.5 py-1.5 text-[13px] tracking-[0.06em]", ch: "7px" },
};

/**
 * Angular status "signal tag": chamfered corners, uppercase, and a hard
 * on/off flash between an outline and a solid fill. `live` toggles the flash
 * (on by default for every tone except the neutral `muted`). Animation lives
 * in globals.css (.status-tag / .status-flash) and honors reduced-motion.
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
  const t = TONE[tone];
  const s = SIZE[size];
  const isLive = live ?? tone !== "muted";
  return (
    <span
      style={{ ["--tone" as string]: t.tone, ["--on" as string]: t.on, ["--ch" as string]: s.ch }}
      className={`status-tag ${isLive ? "status-flash" : ""} ${s.box} inline-flex items-center justify-center font-extrabold uppercase leading-none whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}
