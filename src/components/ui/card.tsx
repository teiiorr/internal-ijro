import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Eski karta oilasi (yangi ekranlar `@/components/ui-biib/Card` dan foydalanadi). BIIB'ga
 * yaqinlashtirilgan: qattiq `--surface` sirt, 1px `--line` qirra, radius 20 — statik kartada
 * hover koʻtarilishi yoʻq (oldin `.glass-card` dan kelardi). Padding API oʻzgarmagan.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-1)]",
        className,
      )}
      {...p}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-7 pt-6 pb-4", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <h3 className={cn("font-[family-name:var(--font-ui)] text-xl font-bold tracking-tight text-[var(--ink)]", className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("t-small text-[var(--ink-2)]", className)} {...p} />;
}
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-7 pb-7", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center px-7 pb-7", className)} {...p} />;
}
