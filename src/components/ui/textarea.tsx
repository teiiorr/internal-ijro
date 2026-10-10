import * as React from "react";
import { cn } from "@/lib/utils";

/** BIIB textarea: input bilan bir xil sirt — qattiq `--surface-2`, 1px `--line-strong`, radius 12, oynasiz. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full resize-y rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] " +
        "px-4 py-3 text-[16px] font-medium leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-3)] " +
        "transition-[border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] " +
        "focus:shadow-none aria-invalid:border-[var(--danger)] " +
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-3)]",
        className
      )}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";
