import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/cx";

export interface InputProps extends Omit<ComponentPropsWithoutRef<"input">, "size" | "children" | "className"> {
  readonly className?: string;
}

/* Shrift 16px dan kichik emas (iOS fokusda kattalashtirmasin). Fokus halqasi global. */
export const INPUT_CLASS =
  "t-body w-full rounded-m border border-line-strong bg-surface text-ink placeholder:text-ink-3 aria-invalid:border-danger disabled:text-ink-3 disabled:bg-surface-2";

export function Input({ className, type = "text", ...rest }: InputProps) {
  return <input type={type} className={cx(INPUT_CLASS, "h-12 px-4", className)} {...rest} />;
}
