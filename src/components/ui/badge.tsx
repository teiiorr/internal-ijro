import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary-soft)] text-[var(--primary)]",
        secondary:
          "bg-[var(--surface-3)] text-[var(--foreground)]",
        outline:
          "border border-[var(--border-strong)] text-[var(--foreground)]",
        success:
          "bg-[var(--success-soft)] text-[var(--success)]",
        warning:
          "bg-[var(--warning-soft)] text-[var(--warning)]",
        danger:
          "bg-[var(--danger-soft)] text-[var(--danger)]",
        solid:
          "bg-[var(--foreground)] text-[var(--background)]",
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
