import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function FormMessage({
  id,
  tone = "error",
  children,
}: {
  id?: string;
  tone?: "error" | "hint";
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <p id={id} role={tone === "error" ? "alert" : undefined} className={cx("t-small", tone === "error" ? "text-danger" : "text-ink-3")}>
      {children}
    </p>
  );
}
