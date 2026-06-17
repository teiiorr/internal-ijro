import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BKRM logo on a dark gradient backdrop so the white logo stays visible
 * regardless of theme. Drop the source file at `public/bkrm-logo.png`
 * (PNG with transparent background, white artwork).
 */
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  const padding = Math.round(size * 0.14);
  return (
    <div
      className={cn(
        "relative shrink-0 grid place-items-center rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-[#0E1330] via-[#1B2050] to-[#3A2F7A]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_18px_-4px_rgba(14,19,48,0.35)]",
        className
      )}
      style={{ width: size, height: size, padding }}
      aria-label="Bolalar Kontentini Rivojlantirish Markazi"
    >
      <Image
        src="/bkrm-logo.png"
        alt="BKRM"
        width={size}
        height={size}
        priority
        sizes={`${size}px`}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
