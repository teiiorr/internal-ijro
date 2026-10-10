import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Xotirjam «Status» koʻrinishidagi belgi (A4.4.4): radius 6 (kapsula emas), tusli yengil
 * toʻldirish (`color-mix 14%`), tusning oʻz matni; uppercase va qattiq toʻldirish yoʻq,
 * `min-w-[7.5rem]` olib tashlangan — belgi matniga qarab oʻlchanadi. Variantlar API saqlangan.
 */
const badgeVariants = cva(
  "inline-flex min-h-6 items-center justify-center gap-1.5 rounded-[var(--radius-s)] px-2 text-[0.75rem] font-semibold leading-none whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        default:   "bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] text-[var(--tint)]",
        secondary: "bg-[var(--surface-2)] text-[var(--ink-2)]",
        outline:   "bg-[var(--surface-2)] text-[var(--ink-2)]",
        accent:    "bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] text-[var(--tint)]",
        success:   "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
        warning:   "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]",
        danger:    "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)]",
        solid:     "bg-[var(--ink-2)] text-[var(--surface)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...p
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...p} />;
}
