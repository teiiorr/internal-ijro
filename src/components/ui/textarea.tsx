import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background-elevated)] " +
        "px-3.5 py-2.5 text-[15px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--subtle)] " +
        "shadow-[0_1px_0_rgba(15,17,28,0.02)] resize-y " +
        "transition-[border-color,box-shadow] duration-150 " +
        "focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] " +
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";
