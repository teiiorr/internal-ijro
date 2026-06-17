import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold tracking-tight whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary-soft)] text-[var(--primary)] backdrop-blur-md",
        secondary:
          "bg-[var(--surface-3)] text-[var(--foreground)] backdrop-blur-md",
        outline:
          "border border-[var(--border-strong)] text-[var(--foreground)] backdrop-blur-md",
        success:
          "bg-[var(--success-soft)] text-[var(--success)] backdrop-blur-md",
        warning:
          "bg-[var(--warning-soft)] text-[var(--warning)] backdrop-blur-md",
        danger:
          "bg-[var(--danger-soft)] text-[var(--danger)] backdrop-blur-md",
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
