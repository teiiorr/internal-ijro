import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  neutral: "var(--ink-2)",
};

/**
 * Bitta xotirjam holat belgisi. StatusTag/Badge/DeadlineChip/.process-dots oʻrnini bosadi.
 * Shakl: radius 6 (hech qachon kapsula yoki clip-path emas), ~24px balandlik, 12/600.
 * Toʻldirish: tone rangining 14% aralashmasi; matn — toneʼning oʻz rangi. Faqat qaror
 * talab qilganda koʻrsatiladi (kechikkan, koʻrik kutmoqda, bloklangan); oddiy metadata — matn.
 */
export function Status({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const c = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-s)] px-2 t-micro whitespace-nowrap",
        className,
      )}
      style={{ color: c, backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)` }}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ backgroundColor: c }} aria-hidden />}
      {children}
    </span>
  );
}
