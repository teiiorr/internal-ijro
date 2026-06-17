"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export function TaskTimelineChart({ data }: { data: { date: string; created: number; completed: number }[] }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" stroke="var(--muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          <Legend />
          <Line type="monotone" dataKey="created" stroke="var(--primary)" strokeWidth={2} />
          <Line type="monotone" dataKey="completed" stroke="var(--success)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
