import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TagTone =
  | "neutral"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "art-1" | "art-2" | "art-3" | "art-4" | "art-5" | "art-6" | "art-7";

export interface TagProps {
  readonly tone?: TagTone;
  readonly as?: "span" | "li";
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Status/yorliq tegi — ataylab KAPSULA EMAS (6px radius). Ovoid plashka o'rniga
 * matnli teg; art ranglari ui.css faylida. Liquid Glass tusi `.material` beradi.
 */
export function Tag({ tone = "neutral", as: Component = "span", className, children }: TagProps) {
  return (
    <Component
      data-tone={tone}
      className={cn(
        "ui-tag t-micro inline-flex min-h-6 items-center gap-1 rounded-s px-2 py-1",
        tone === "neutral" && "border border-line bg-surface-2 text-ink-2",
        tone === "accent" && "bg-tint text-on-tint",
        tone === "success" && "border border-[color-mix(in_oklab,var(--success)_45%,transparent)] text-success",
        tone === "danger" && "border border-[color-mix(in_oklab,var(--danger)_45%,transparent)] text-danger",
        tone === "warning" && "border border-[color-mix(in_oklab,var(--warning)_45%,transparent)] text-warning",
        tone === "info" && "border border-[color-mix(in_oklab,var(--info)_45%,transparent)] text-info",
        className,
      )}
    >
      <span className="text-trim">{children}</span>
    </Component>
  );
}
