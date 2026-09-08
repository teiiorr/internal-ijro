"use client";
import { useState } from "react";
import { EmployeeIdentity } from "./employee-identity";
import { localizeName } from "@/lib/names";

export type CuratorItem = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  position?: string | null;
  departmentName?: string | null;
};

/**
 * Bir yoki bir neçta kuratorni EmployeeIdentity qatorlaridan iborat izçil
 * röyxat körinişida körsatadi, `max` dan oşganlarini "+N" ga jamlaydi. Bir
 * neçta kuratorga tayyor; hozircha odatda unga bitta elementli massiv beriladi.
 */
export function CuratorList({
  curators,
  locale,
  max = 3,
  size = "sm",
}: {
  curators: CuratorItem[];
  locale: string;
  max?: number;
  size?: "sm" | "md";
}) {
  const [expanded, setExpanded] = useState(false);
  if (curators.length === 0) return null;

  const shown = expanded ? curators : curators.slice(0, max);
  const hidden = curators.length - shown.length;

  return (
    <div className="flex flex-col gap-2">
      {shown.map((c) => (
        <EmployeeIdentity
          key={c.id}
          name={localizeName(c.fullName, locale)}
          avatarUrl={c.avatarUrl}
          subtitle={[c.position, c.departmentName].filter(Boolean).join(" · ") || null}
          size={size}
        />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] active:scale-95"
        >
          +{hidden}
        </button>
      )}
    </div>
  );
}
