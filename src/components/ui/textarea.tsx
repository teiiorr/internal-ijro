import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[112px] w-full rounded-xl border-2 border-[var(--input)] bg-[var(--surface)] " +
        "px-3.5 py-3 text-[15px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--subtle)] font-medium " +
        "resize-y transition-colors duration-150 " +
        "focus-visible:outline-none focus-visible:border-[var(--foreground)] focus-visible:ring-0 " +
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";
