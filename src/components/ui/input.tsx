import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BIIB input (A4.4.6): 48px, radius 12, qattiq `--surface-2` toʻldirish, 1px `--line-strong`
 * (3:1 UI-chegara kontrasti). Oyna/blur yoʻq. Fokus — global 2px `--focus` halqasi; eski
 * «porlash» soyasi oʻchirilgan. Shrift 16px (iOS fokusda kattalashtirmasin).
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] " +
        "px-4 text-[16px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-3)] " +
        "transition-[border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] " +
        "focus:shadow-none aria-invalid:border-[var(--danger)] " +
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-3)] " +
        "file:mr-3 file:h-full file:rounded-[var(--radius-m)] file:border-0 file:bg-[var(--surface-3)] file:px-4 file:text-sm file:font-semibold",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
