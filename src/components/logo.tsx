import { cn } from "@/lib/utils";

/**
 * Ichki Ijro mark — bold "II" monogram on a dark indigo→violet gradient.
 * Works in both themes without depending on any external image file.
 */
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative shrink-0 grid place-items-center rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-[#0E1330] via-[#1B2050] to-[#3A2F7A]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_22px_-6px_rgba(14,19,48,0.45)]",
        "text-white font-extrabold tracking-[-0.04em] leading-none select-none",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-label="Ichki Ijro"
    >
      <span>II</span>
    </div>
  );
}
