import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background-elevated)] " +
        "px-3.5 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] " +
        "shadow-[0_1px_0_rgba(15,17,28,0.02)] " +
        "transition-[border-color,box-shadow] duration-150 " +
        "focus-visible:outline-none focus-visible:border-[var(--primary)] " +
        "focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        "file:mr-3 file:h-full file:rounded-md file:border-0 file:bg-[var(--surface-3)] file:px-3 file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
