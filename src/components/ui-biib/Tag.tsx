import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TagTone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";
export type TagSize = "sm" | "md" | "lg";

// To'yingan ranglar: oq yorliq ikkala mavzuda ham o'qiladi (eski "signal" uslubidek).
const TONE: Record<TagTone, string> = {
  neutral: "#64748b",
  accent: "#2563eb",
  success: "#16a34a",
  danger: "#e02424",
  warning: "#e08c10",
  info: "#2563eb",
};
const SIZE: Record<TagSize, { box: string; ch: string }> = {
  sm: { box: "px-2 py-[3px] text-[10px] tracking-[0.04em]", ch: "4px" },
  md: { box: "px-2.5 py-1 text-[11px] tracking-[0.05em]", ch: "6px" },
  lg: { box: "px-3 py-1.5 text-[13px] tracking-[0.05em]", ch: "7px" },
};

export interface TagProps {
  readonly tone?: TagTone;
  readonly size?: TagSize;
  readonly as?: "span" | "li";
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Status/yorliq plashkasi — ESKI "signal flag" shakli saqlangan (burchaklari qiyilgan),
 * endi Liquid Glass sirtda (.tag-plate). Shakl o'zgarmaydi.
 */
export function Tag({ tone = "neutral", size = "md", as: Component = "span", className, children }: TagProps) {
  const s = SIZE[size];
  return (
    <Component
      style={{ ["--tone"]: TONE[tone], ["--ch"]: s.ch } as CSSProperties}
      className={cn(
        "tag-plate inline-flex items-center justify-center font-bold uppercase leading-none whitespace-nowrap",
        s.box,
        className,
      )}
    >
      <span className="text-trim">{children}</span>
    </Component>
  );
}
