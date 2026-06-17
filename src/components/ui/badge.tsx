import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-[var(--foreground)] text-[var(--background)]",
        secondary: "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-strong)]",
        outline: "border-2 border-[var(--foreground)] text-[var(--foreground)]",
        accent: "bg-[var(--accent)] text-[var(--accent-foreground)]",
        success: "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/30",
        warning: "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)]/30",
        danger: "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/30",
        solid: "bg-[var(--foreground)] text-[var(--background)]",
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
