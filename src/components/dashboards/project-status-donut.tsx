"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { GlassTooltip, CHART_ANIM } from "./chart-kit";

export type DonutSlice = { key: string; name: string; value: number; color: string };

/**
 * Loyihalar holati bo'yicha modern donut: ingichka halqa, yumaloq uchlar, markazda
 * jami, pastda ixcham legend. Halqa mount'da silliq animatsiya bilan chiziladi.
 */
export function ProjectStatusDonut({ data, centerLabel }: { data: DonutSlice[]; centerLabel: string }) {
  const rows = data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="relative" style={{ width: "100%", height: 200 }}>
        {rows.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-ink-3">—</div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <defs>
                {rows.map((r) => (
                  <linearGradient key={r.key} id={`donut-${r.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={r.color} stopOpacity={1} />
                    <stop offset="100%" stopColor={r.color} stopOpacity={0.72} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={3}
                cornerRadius={8}
                stroke="none"
                {...CHART_ANIM}
              >
                {rows.map((r) => (
                  <Cell key={r.key} fill={`url(#donut-${r.key})`} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-[2rem] font-extrabold tabular-nums leading-none text-ink">{total}</div>
            <div className="mt-1 text-xs font-medium text-ink-3">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{d.name}</span>
            <span className="shrink-0 font-bold tabular-nums text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
