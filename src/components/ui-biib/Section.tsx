import * as React from "react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { IconArrowRight } from "@tabler/icons-react";

/**
 * BIIB kontent seksiyasi. Yuqori darajadagi bloklar `--section-gap` (48/64/96) ritmida
 * ajraladi (ota elementga `section-gap` beriladi). Sarlavha chapga tekis, jiddiy,
 * OLTIN EMAS (foydalanuvchi override'i). «Barchasi» — призрач tugma, kartalardan KEYIN,
 * oʻngga tekis.
 */
export function Section({
  title,
  meta,
  action,
  seeAllHref,
  seeAllLabel,
  headingLevel = 2,
  className,
  children,
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  seeAllHref?: string;
  seeAllLabel?: React.ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  const H = (headingLevel === 3 ? "h3" : "h2") as "h2" | "h3";
  return (
    <section className={cn("min-w-0", className)}>
      {(title || action) && (
        <div className="section-header flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {title && (
              <H className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-balance text-[var(--ink)] sm:text-[1.1875rem]">
                {title}
              </H>
            )}
            {meta != null && <span className="t-micro tabular-nums text-[var(--ink-3)]">{meta}</span>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
      {seeAllHref && (
        <div className="mt-4 flex justify-end">
          <Link
            href={seeAllHref}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 t-label text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {seeAllLabel}
            <IconArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
