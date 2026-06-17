import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => (
    <div
      ref={ref}
      className={cn("glass-card text-[var(--card-foreground)]", className)}
      {...p}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-7 pt-6 pb-4", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <h3 className={cn("text-xl font-bold tracking-tight", className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--muted)] font-medium", className)} {...p} />;
}
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-7 pb-7", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center px-7 pb-7", className)} {...p} />;
}
