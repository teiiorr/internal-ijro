import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[112px] w-full rounded-2xl border border-[var(--border-strong)] " +
        "bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 " +
        "px-4 py-3 text-[15px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--subtle)] " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(15,17,28,0.03)] resize-y " +
        "transition-[border-color,box-shadow] duration-200 " +
        "focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] " +
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";
