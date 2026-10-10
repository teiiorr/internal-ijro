import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Standart paddingni olib tashlaydi (masalan, karta roʻyxatni toʻliq oʻrab olganda). */
  bare?: boolean;
  /**
   * Oyna oʻrniga qattiq `--surface`. «Grani»: matn zich boʻlsa (jadval, uzun forma),
   * yoki karta boshqa oyna ichida boʻlsa (oyna-ustida-oyna boʻlmasin) — shu bilan.
   */
  solid?: boolean;
  /** Hover'da yengil koʻtarilish; faqat oʻzi havola boʻlgan kartalar uchun. */
  interactive?: boolean;
};

/**
 * BIIB kontent kartasi. Standart holatda — Liquid Glass (oyna): yarim shaffof toʻldirish,
 * blur + saturate, muz qirrasi. Radius 20. Bir darajali idish: karta ichida boshqa
 * oyna/ramka/karta boʻlmaydi — qatorlar boʻshliq va `--surface-2` qadam bilan ajraladi.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, bare, solid, interactive, ...p }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-card)] text-[var(--ink)]",
        solid
          ? "border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-1)]"
          : "border border-[var(--glass-border)] bg-[var(--glass-fill)] shadow-[0_1px_2px_var(--glass-shadow)] [-webkit-backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))] [backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))]",
        !bare && "p-5 sm:p-6",
        interactive &&
          "transition-[transform,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--line-strong)]",
        className,
      )}
      {...p}
    />
  ),
);
Card.displayName = "Card";
