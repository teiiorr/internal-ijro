import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-[3px] text-[11.5px] font-bold leading-[14px] whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        default:   "bg-[var(--primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
        secondary: "bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border-strong)]",
        outline:   "border-2 border-[var(--foreground)] text-[var(--foreground)]",
        accent:    "bg-[var(--accent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
        success:   "bg-[var(--success)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
        warning:   "bg-[var(--warning)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
        danger:    "bg-[var(--danger)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
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
