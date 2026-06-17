import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-md border border-[var(--input)] bg-[var(--surface)] " +
        "px-3 py-2.5 text-[15px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--subtle)] " +
        "resize-y transition-colors duration-150 " +
        "focus-visible:outline-none focus-visible:border-[var(--foreground)] " +
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";
