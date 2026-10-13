import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

// Fon tuslari — WCAG AA uchun chuqurlashtirilgan (oq matn ≥4.5:1).
const TONE: Record<StatusTone, string> = {
  success: "#15803d",
  warning: "#e08c10",
  danger: "#c81e1e",
  info: "#2563eb",
  neutral: "#475569",
};

// Matn rangi: amber yorug' bo'lgani uchun unda qora matn (oq amberda AA'dan o'tmaydi).
const TONE_INK: Record<StatusTone, string> = {
  success: "#ffffff",
  warning: "#1c1917",
  danger: "#ffffff",
  info: "#ffffff",
  neutral: "#ffffff",
};

/**
 * Holat plashkasi — ESKI "signal flag" shakli (burchaklari qiyilgan), Liquid Glass sirt
 * (.tag-plate). Dumaloq "pilula + nuqta" emas — eski status plashkalarining oʻrnini bosadi.
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
      style={{ ["--tone"]: TONE[tone], ["--tone-ink"]: TONE_INK[tone], ["--ch"]: "6px" } as CSSProperties}
      className={cn(
        "tag-plate inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.04em]",
        className,
      )}
    >
      <span className="text-trim">{children}</span>
    </span>
  );
}
