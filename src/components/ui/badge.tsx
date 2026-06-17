import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold tracking-tight leading-5 whitespace-nowrap backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/15",
        secondary: "bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border)]",
        outline: "border border-[var(--border-strong)] text-[var(--foreground)] bg-[var(--glass-fill-soft)]",
        accent: "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20",
        success: "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20",
        warning: "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)]/20",
        danger: "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20",
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
