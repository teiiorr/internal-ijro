"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const COLORS: Record<string, string> = {
  todo: "#94A3B8",
  in_progress: "#3B82F6",
  under_review: "#F59E0B",
  completed: "#10B981",
  rejected: "#EF4444",
};

export function TaskStatusChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([status, count]) => ({ status, count }));
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={rows}>
          <XAxis dataKey="status" stroke="var(--muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "var(--background-elevated)", border: "1px solid var(--border)" }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.status} fill={COLORS[r.status] ?? "#3B82F6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
