import { cn } from "@/lib/utils";

/**
 * Töliq BKRM logotipi — emblema + "Bolalar Kontentini Rivojlantirish Markazi".
 * Balandlik className orqali beriladi (masalan, "h-12"); kenglik SVG'ning 220:81
 * nisbatiga moslaşadi. Yoruğ (kök) va töq (oq) variantlari bor; `.dark` klassi
 * ularni CSS orqali almaştiradi (qarang: globals.css .brand-logo-*).
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
