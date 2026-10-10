import * as React from "react";
import { cn } from "@/lib/utils";

export type Fact = { term: React.ReactNode; value: React.ReactNode };

/**
 * BIIB fakt-roʻyxati. `.detail-grid` yacheyka-ramkalari oʻrnini bosadi: dt mayda (--ink-3),
 * dd kattaroq (--ink), chapga tekis, ustun 24 / qator 16, yacheyka-ramkalarsiz.
 */
export function FactList({ items, className }: { items: Fact[]; className?: string }) {
  return (
    <dl className={cn("fact-list", className)}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt>{it.term}</dt>
          <dd>{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
