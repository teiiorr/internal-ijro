import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

// Burchakli "signal flag" Liquid Glass plashka (.tag-plate): toʻyingan tus, oq yorliq.
const TONE: Record<StatusTone, string> = {
  green: "#16a34a",
  amber: "#e08c10",
  red: "#e02424",
  muted: "#64748b",
};

const SIZE: Record<StatusSize, { box: string; ch: string }> = {
  sm: { box: "px-2 py-[3px] text-[10px] tracking-[0.04em]", ch: "4px" },
  md: { box: "px-2.5 py-1 text-[11px] tracking-[0.05em]", ch: "6px" },
  lg: { box: "px-3 py-1.5 text-[13px] tracking-[0.05em]", ch: "7px" },
};

/** Holat plashkasi — burchakli signal shakli (.tag-plate). `live` API mosligi uchun. */
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
      style={{ ["--tone"]: TONE[tone], ["--ch"]: s.ch } as React.CSSProperties}
      className={`tag-plate inline-flex items-center justify-center font-bold uppercase leading-none whitespace-nowrap ${s.box} ${className}`}
    >
      <span className="text-trim">{children}</span>
    </span>
  );
}
