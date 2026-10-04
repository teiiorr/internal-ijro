"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ThroughputRow = { label: string; created: number; completed: number };

/** recharts boʻlagi — faqat throughput-chart.tsx dagi dynamic() orqali yuklanadi. */
export function ThroughputChartInner({
  rows,
  labels,
}: {
  rows: ThroughputRow[];
  labels: { created: string; completed: string };
}) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--muted)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="created"
            name={labels.created}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name={labels.completed}
            stroke="var(--success)"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
