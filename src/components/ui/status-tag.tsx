import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";

const TONE: Record<StatusTone, { bg: string; text: string; dot: string }> = {
  green: { bg: "bg-[var(--success)]/15", text: "text-[var(--success)]", dot: "bg-[var(--success)]" },
  amber: { bg: "bg-[var(--warning)]/15", text: "text-[var(--warning)]", dot: "bg-[var(--warning)]" },
  red:   { bg: "bg-[var(--danger)]/15",  text: "text-[var(--danger)]",  dot: "bg-[var(--danger)]" },
  muted: { bg: "bg-[var(--surface-3)]",  text: "text-[var(--muted)]",  dot: "bg-[var(--subtle)]" },
};

export function StatusTag({
  tone,
  children,
  className = "",
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${t.bg} ${t.text} px-2.5 py-1 text-xs font-bold leading-none whitespace-nowrap ${className}`}
    >
      <span className={`size-1.5 rounded-full ${t.dot} shrink-0 ${tone === "amber" ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
