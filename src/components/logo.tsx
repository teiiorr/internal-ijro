import { cn } from "@/lib/utils";

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-2xl flex items-center justify-center text-white font-extrabold tracking-tight",
        "bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_8px_22px_-4px_var(--primary-glow),0_2px_6px_rgba(99,102,241,0.20)]",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label="Ichki Ijro"
    >
      II
    </div>
  );
}
