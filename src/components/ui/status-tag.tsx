import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

const TONE: Record<StatusTone, { bg: string; text: string; dot: string }> = {
  green: { bg: "bg-[var(--success)]/15", text: "text-[var(--success)]", dot: "bg-[var(--success)]" },
  amber: { bg: "bg-[var(--warning)]/15", text: "text-[var(--warning)]", dot: "bg-[var(--warning)]" },
  red:   { bg: "bg-[var(--danger)]/15",  text: "text-[var(--danger)]",  dot: "bg-[var(--danger)]" },
  muted: { bg: "bg-[var(--surface-3)]",  text: "text-[var(--muted)]",  dot: "bg-[var(--subtle)]" },
};

const SIZE: Record<StatusSize, { box: string; dot: string; text: string }> = {
  sm: { box: "gap-1 px-2 py-0.5 text-[11px]", dot: "size-1", text: "" },
  md: { box: "gap-1.5 px-2.5 py-1 text-xs", dot: "size-1.5", text: "" },
  lg: { box: "gap-2 px-3.5 py-1.5 text-sm", dot: "size-2", text: "" },
};

export function StatusTag({
  tone,
  size = "md",
  children,
  className = "",
}: {
  tone: StatusTone;
  size?: StatusSize;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  const s = SIZE[size];
  return (
    <span
      className={`inline-flex items-center rounded-full ${t.bg} ${t.text} ${s.box} font-bold leading-none whitespace-nowrap ${className}`}
    >
      <span className={`${s.dot} rounded-full ${t.dot} shrink-0 ${tone === "amber" ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
