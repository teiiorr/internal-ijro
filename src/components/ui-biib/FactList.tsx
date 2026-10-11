import * as React from "react";
import { cn } from "@/lib/utils";

export type Fact = { term: React.ReactNode; value: React.ReactNode };

/**
 * BIIB fakt-roʻyxati. Ikki koʻrinish:
 *  - default (dl): dt mayda (--ink-3) | dd kattaroq (--ink), chapga tekis, yacheyka-ramkasiz.
 *  - table: jadval koʻrinishi — chegarali yacheykalar panjarasi (2 ustun), gorizontal joy,
 *    kam balandlik (foydalanuvchi soʻrovi).
 */
export function FactList({ items, table, className }: { items: Fact[]; table?: boolean; className?: string }) {
  if (table) {
    return (
      <dl className={cn("fact-table", className)}>
        {items.map((it, i) => (
          <div key={i}>
            <dt>{it.term}</dt>
            <dd>{it.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
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
