"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export type DonutSlice = { key: string; name: string; value: number; color: string };

/**
 * Donut of projects by status with the total in the middle and a compact
 * legend below. Colours are passed in as hex (recharts doesn't resolve CSS
 * vars for SVG fills) to stay in sync with the traffic-light palette.
 */
export function ProjectStatusDonut({ data, centerLabel }: { data: DonutSlice[]; centerLabel: string }) {
  const rows = data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="relative" style={{ width: "100%", height: 220 }}>
        {rows.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-[var(--muted)]">—</div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.key} fill={r.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: "var(--foreground)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums leading-none">{total}</div>
            <div className="mt-1 text-xs font-medium text-[var(--muted)]">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{d.name}</span>
            <span className="shrink-0 font-bold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
