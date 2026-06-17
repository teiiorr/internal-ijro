import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-semibold leading-[14px] whitespace-nowrap select-none " +
  "before:size-1.5 before:rounded-full before:bg-current before:opacity-70 before:shrink-0",
  {
    variants: {
      variant: {
        default:   "bg-[var(--primary-soft)] text-[var(--primary)]",
        secondary: "bg-[var(--surface-2)] text-[var(--muted)] before:hidden",
        outline:   "border border-[var(--border-strong)] text-[var(--foreground)] before:hidden",
        accent:    "bg-[var(--accent-soft)] text-[var(--accent)]",
        success:   "bg-[var(--success-soft)] text-[var(--success)]",
        warning:   "bg-[var(--warning-soft)] text-[var(--warning)]",
        danger:    "bg-[var(--danger-soft)] text-[var(--danger)]",
        solid:     "bg-[var(--foreground)] text-[var(--background)] before:hidden",
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
