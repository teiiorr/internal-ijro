import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type HeadingLevel = 1 | 2 | 3 | 4;
export type HeadingSize = "display-xl" | "display-l" | "h1" | "h2" | "h3" | "h4";
export type HeadingAlign = "start" | "center";

export interface HeadingProps {
  readonly level: HeadingLevel;
  readonly size?: HeadingSize;
  readonly trim?: boolean;
  readonly align?: HeadingAlign;
  readonly id?: string;
  readonly className?: string;
  readonly attrs?: Readonly<Record<`data-${string}`, string>>;
  readonly children: ReactNode;
}

const SIZE_CLASS: Record<HeadingSize, string> = {
  "display-xl": "t-display-xl",
  "display-l": "t-display-l",
  h1: "t-h1",
  h2: "t-h2",
  h3: "t-h3",
  h4: "t-h4",
};

const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = { 1: "display-l", 2: "h1", 3: "h3", 4: "h4" };
const DEFAULT_ALIGN: Record<HeadingLevel, HeadingAlign> = { 1: "center", 2: "center", 3: "start", 4: "start" };
/* Katta sarlavhalar doim oltin (ekranda shuningdek yaltiraydi — motion bosqichida). */
const GOLD_SIZES: ReadonlySet<HeadingSize> = new Set(["display-xl", "display-l", "h1", "h2"]);

export function headingClass(level: HeadingLevel, size?: HeadingSize, align?: HeadingAlign, trim = false): string {
  const resolved = size ?? DEFAULT_SIZE[level];
  return cx(
    SIZE_CLASS[resolved],
    "text-balance text-ink",
    GOLD_SIZES.has(resolved) && "gold-text",
    trim && "text-trim",
    (align ?? DEFAULT_ALIGN[level]) === "center" && "heading-center",
  );
}

export function Heading({ level, size, trim = false, align, id, className, attrs, children }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className={cx(headingClass(level, size, align, trim), className)} {...attrs}>
      {children}
    </Tag>
  );
}
