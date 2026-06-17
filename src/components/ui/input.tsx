import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--surface)] " +
        "px-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] " +
        "transition-colors duration-150 " +
        "focus-visible:outline-none focus-visible:border-[var(--foreground)] " +
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        "file:mr-3 file:h-full file:rounded-sm file:border-0 file:bg-[var(--surface-2)] file:px-3 file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
