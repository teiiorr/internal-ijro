"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";

/** Horizontal bar of typed-project counts per production type. */
export function ProjectTypeBar({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return <div className="grid h-[220px] place-items-center text-sm text-[var(--muted)]">—</div>;
  }
  const height = Math.max(180, data.length * 44);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            stroke="var(--muted)"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-3)" }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
            itemStyle={{ color: "var(--foreground)" }}
          />
          <Bar dataKey="count" fill="#6366F1" radius={[0, 8, 8, 0]} barSize={18} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" style={{ fill: "var(--muted)", fontSize: 12, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
