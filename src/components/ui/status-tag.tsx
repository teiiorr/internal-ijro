import * as React from "react";

export type StatusTone = "green" | "amber" | "red" | "muted";
export type StatusSize = "sm" | "md" | "lg";

// `tone` töliq töldirish rangini belgilaydi; chip'da oq matn böladi (globals.css'dagi
// .status-tag'ga qarang) — animatsiyasiz. Har birida oq rang öqişli qolişi uçun qat'iy,
// yorqin va bir-biridan aniq farqlanadigan ranglar tanlangan (yaşil / amber-oltin / qizil / slate).
const TONE: Record<StatusTone, string> = {
  green: "#16A34A",
  amber: "#E08C10",
  red:   "#E02424",
  muted: "#64748B",
};

const SIZE: Record<StatusSize, { box: string; ch: string }> = {
  sm: { box: "px-2 py-[3px] text-[10px] tracking-[0.05em]", ch: "4px" },
  md: { box: "px-2.5 py-1 text-[11px] tracking-[0.06em]", ch: "5px" },
  lg: { box: "px-3.5 py-1.5 text-[13px] tracking-[0.06em]", ch: "7px" },
};

/**
 * Burçakli status "signal yorliği": qirqilgan burçaklar, bosh harflar, töliq rang bilan
 * töldirilgan. Statik (animatsiyasiz). `live` API mosligi uçun qabul qilinadi, biroq e'tiborsiz qoldiriladi.
 */
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
      style={{ ["--tone" as string]: TONE[tone], ["--ch" as string]: s.ch }}
      className={`status-tag ${s.box} inline-flex items-center justify-center font-extrabold uppercase leading-none whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}
