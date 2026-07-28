import { cn } from "@/lib/utils";

/**
 * Full BKRM logo — emblem + "Bolalar Kontentini Rivojlantirish Markazi".
 * Height is set via className (e.g. "h-12"); width scales to the SVG's 220:81
 * ratio. Ships a light (blue) and a dark (white) variant; the `.dark` class
 * swaps them via CSS (see globals.css .brand-logo-*).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} role="img" aria-label="Bolalar Kontentini Rivojlantirish Markazi">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand-logo.svg" alt="" aria-hidden className="h-full w-auto select-none dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand-logo-white.svg" alt="" aria-hidden className="hidden h-full w-auto select-none dark:block" />
    </span>
  );
}
