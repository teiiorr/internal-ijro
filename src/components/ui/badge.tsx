import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Fixed-height 24px chip. Uses inset box-shadow for "borders" so outlined
 * variants don't grow the box — every variant has identical outer dimensions.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 h-6 rounded-[6px] px-2.5 text-[11.5px] font-bold leading-none whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        default:   "bg-[var(--primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        secondary: "bg-[var(--surface-3)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--border-strong)]",
        outline:   "text-[var(--foreground)] shadow-[inset_0_0_0_1.5px_var(--foreground)]",
        accent:    "bg-[var(--accent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        success:   "bg-[var(--success)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        warning:   "bg-[var(--warning)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        danger:    "bg-[var(--danger)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        solid:     "bg-[var(--foreground)] text-[var(--background)]",
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
