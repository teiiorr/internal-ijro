"use client";
import type { ReactNode } from "react";

/** Modern "tech" uslubidagi stakan tooltip (recharts contentStyle o'rniga). */
export function GlassTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--glass-fill-strong)] px-3 py-2 text-xs shadow-[var(--shadow-floating)] backdrop-blur-xl">
      {label !== undefined && <p className="mb-1 font-bold text-ink">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-ink-2">
            <span className="size-2 rounded-[3px]" style={{ background: p.color }} />
            <span className="flex-1">{p.name}</span>
            <span className="font-bold tabular-nums text-ink">
              {typeof p.value === "number" ? p.value.toLocaleString("ru-RU") : p.value}
              {unit ? ` ${unit}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Градиент заливки для area/bar: id'ga ko'ra vertikal gradient (modern look). */
export function chartGradients(defs: { id: string; color: string; from?: number; to?: number }[]): ReactNode {
  return (
    <defs>
      {defs.map((d) => (
        <linearGradient key={d.id} id={d.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={d.color} stopOpacity={d.from ?? 0.9} />
          <stop offset="100%" stopColor={d.color} stopOpacity={d.to ?? 0.15} />
        </linearGradient>
      ))}
    </defs>
  );
}

export const CHART_ANIM = { isAnimationActive: true, animationDuration: 900, animationEasing: "ease-out" as const };
