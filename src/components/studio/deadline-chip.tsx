"use client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Muddatgacha qolgan kunlar belgisi. `days` serverda hisoblanadi (gidratsiya mos kelishi uchun). */
export function DeadlineChip({ days, className }: { days: number; className?: string }) {
  const t = useTranslations("studio.deadlines");
  const label =
    days < 0 ? t("overdue", { n: -days }) : days === 0 ? t("today") : days === 1 ? t("tomorrow") : t("daysLeft", { n: days });
  const tone =
    days < 0
      ? "bg-[#E02424]/12 text-[#E02424]"
      : days <= 3
        ? "bg-[#E08C10]/14 text-[#B26E00] dark:text-[#F0A43A]"
        : "bg-[var(--surface-2)] text-[var(--muted)]";
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums", tone, className)}>{label}</span>;
}
