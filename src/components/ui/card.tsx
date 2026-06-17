import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => (
    <div
      ref={ref}
      className={cn(
        // iOS Liquid Glass card
        "rounded-[20px] border border-[var(--glass-border)] " +
        "bg-[var(--glass-fill)] backdrop-blur-2xl backdrop-saturate-180 " +
        "text-[var(--card-foreground)] " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_28px_-6px_rgba(31,38,135,0.08),0_2px_8px_-2px_rgba(31,38,135,0.04)] " +
        "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_12px_36px_-8px_rgba(0,0,0,0.55),0_2px_8px_-2px_rgba(0,0,0,0.25)]",
        className
      )}
      {...p}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-7 pt-7 pb-5", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <h3 className={cn("text-xl font-bold tracking-tight", className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--muted)]", className)} {...p} />;
}
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-7 pb-7", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center px-7 pb-7", className)} {...p} />;
}
