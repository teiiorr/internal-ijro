import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[112px] w-full rounded-2xl border border-[var(--input)] " +
        "bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 " +
        "px-4 py-3 text-[15px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--subtle)] font-medium " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] resize-y " +
        "transition-[border-color,box-shadow] duration-200 " +
        "focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-glow)] " +
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";
