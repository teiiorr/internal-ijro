"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { GlassTooltip, CHART_ANIM } from "./chart-kit";

/** Produksiya turi bo'yicha loyihalar soni — modern gorizontal bar (gradient, yumaloq, animatsiya). */
export function ProjectTypeBar({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return <div className="grid h-[200px] place-items-center text-sm text-ink-3">—</div>;
  }
  const height = Math.max(160, data.length * 42);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="typebar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            stroke="var(--ink-3)"
            tick={{ fontSize: 12, fill: "var(--ink-2)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "var(--surface-2)", radius: 8 }} content={<GlassTooltip />} />
          <Bar dataKey="count" fill="url(#typebar)" radius={[0, 8, 8, 0]} barSize={16} {...CHART_ANIM}>
            <LabelList dataKey="count" position="right" style={{ fill: "var(--ink-2)", fontSize: 12, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
