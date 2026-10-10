import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/cx";
import { INPUT_CLASS } from "./Input";

export interface TextareaProps extends Omit<ComponentPropsWithoutRef<"textarea">, "children" | "className"> {
  readonly className?: string;
}

export function Textarea({ className, rows = 4, ...rest }: TextareaProps) {
  return <textarea rows={rows} className={cx(INPUT_CLASS, "min-h-32 resize-y px-4 py-3", className)} {...rest} />;
}
