import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

// Toʻyingan ranglar: oq yorliq ikkala mavzuda ham oʻqiladi (eski "signal flag" uslubi).
const TONE: Record<StatusTone, string> = {
  success: "#16a34a",
  warning: "#e08c10",
  danger: "#e02424",
  info: "#2563eb",
  neutral: "#64748b",
};

/**
 * Holat plashkasi — ESKI "signal flag" shakli (burchaklari qiyilgan), Liquid Glass sirt
 * (.tag-plate). Dumaloq "pilula + nuqta" emas. StatusTag/Badge/DeadlineChip oʻrnini bosadi.
 * Faqat qaror talab qilganda koʻrsatiladi (kechikkan, koʻrik kutmoqda, bloklangan).
 */
export function Status({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  /** @deprecated plashkaning oʻzi signal — alohida nuqta chizilmaydi. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      style={{ ["--tone"]: TONE[tone], ["--ch"]: "6px" } as CSSProperties}
      className={cn(
        "tag-plate inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.04em]",
        className,
      )}
    >
      <span className="text-trim">{children}</span>
    </span>
  );
}
