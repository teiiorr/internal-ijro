import * as React from "react";

/**
 * Status tag — coloured text inside a DASHED outline, no solid fill.
 * The project's status language: green = done, amber = ongoing, red = blocked,
 * muted = neutral. Same dashed-border feel as the file dropzone.
 */
export type StatusTone = "green" | "amber" | "red" | "muted";

const TONE: Record<StatusTone, string> = {
  green: "border-[var(--success)] text-[var(--success)]",
  amber: "border-[var(--warning)] text-[var(--warning)]",
  red: "border-[var(--danger)] text-[var(--danger)]",
  muted: "border-[var(--border-strong)] text-[var(--muted)]",
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
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed bg-transparent px-2.5 py-1 text-xs font-bold leading-none whitespace-nowrap ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
