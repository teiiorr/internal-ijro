import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BKRM brand mark — the arabesque emblem from the official logo.
 * Rendered from /public/brand-mark.svg so we only ship the asset once.
 */
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid place-items-center shrink-0", className)}
      style={{ width: size, height: size }}
      aria-label="BKRM"
    >
      <Image
        src="/brand-mark.svg"
        alt=""
        width={size}
        height={size}
        priority
        unoptimized
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
