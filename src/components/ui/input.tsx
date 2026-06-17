import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-[var(--border-strong)] " +
        "bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 " +
        "px-4 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(15,17,28,0.03)] " +
        "transition-[border-color,box-shadow,background-color] duration-200 " +
        "focus-visible:outline-none focus-visible:border-[var(--primary)] " +
        "focus-visible:shadow-[0_0_0_4px_var(--primary-soft),inset_0_1px_0_rgba(255,255,255,0.7)] " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        "file:mr-3 file:h-full file:rounded-xl file:border-0 file:bg-[var(--surface-3)] file:px-4 file:text-sm file:font-semibold",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
