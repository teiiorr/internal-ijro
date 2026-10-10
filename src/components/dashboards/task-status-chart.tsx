"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { GlassTooltip, CHART_ANIM } from "./chart-kit";

const COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#2563eb",
  under_review: "#e08c10",
  completed: "#16a34a",
  rejected: "#e02424",
};

export function TaskStatusChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([status, count]) => ({ status, count }));
  return (
    <div style={{ width: "100%", height: 210 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <defs>
            {rows.map((r) => {
              const c = COLORS[r.status] ?? "#2563eb";
              return (
                <linearGradient key={r.status} id={`ts-${r.status}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={1} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.65} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis dataKey="status" stroke="var(--ink-3)" tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--ink-3)" tick={{ fontSize: 11, fill: "var(--ink-3)" }} allowDecimals={false} tickLine={false} axisLine={false} width={34} />
          <Tooltip cursor={{ fill: "var(--surface-2)", radius: 8 }} content={<GlassTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 2, 2]} barSize={34} {...CHART_ANIM}>
            {rows.map((r) => (
              <Cell key={r.status} fill={`url(#ts-${r.status})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
