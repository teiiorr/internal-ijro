import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-soft",
        className
      )}
      {...p}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-6 pt-6 pb-4", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <h3 className={cn("text-xl font-semibold tracking-tight", className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--muted)]", className)} {...p} />;
}
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center px-6 pb-6", className)} {...p} />;
}
