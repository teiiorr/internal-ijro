"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CashflowChartRow = { month: string; label: string; paid: number; forecast: number };

/**
 * recharts ustunli grafigi: har oy uchun "Toʻlangan" (haqiqiy) + "Prognoz" bitta stekda.
 * Joriy oy vertikal punktir chiziq bilan belgilanadi. Faqat next/dynamic (ssr:false) orqali yuklanadi.
 */
export function CashflowChartInner({
  rows,
  currentMonth,
  labels,
  formatAxis,
  formatValue,
}: {
  rows: CashflowChartRow[];
  currentMonth: string;
  labels: { paid: string; forecast: string; currentMonth: string };
  formatAxis: (n: number) => string;
  formatValue: (n: number) => string;
}) {
  const labelOf = new Map(rows.map((r) => [r.month, r.label]));
  const monthLabel = (m: unknown) => labelOf.get(String(m)) ?? String(m);

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            stroke="var(--muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => formatAxis(Number(v))}
            stroke="var(--muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-3)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 700 }}
            itemStyle={{ color: "var(--foreground)" }}
            labelFormatter={monthLabel}
            formatter={(value) => formatValue(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <ReferenceLine
            x={currentMonth}
            stroke="var(--primary)"
            strokeDasharray="4 4"
            label={{ value: labels.currentMonth, position: "top", fill: "var(--primary)", fontSize: 11, fontWeight: 700 }}
          />
          <Bar dataKey="paid" name={labels.paid} stackId="cashflow" fill="var(--success)" isAnimationActive={false} />
          <Bar
            dataKey="forecast"
            name={labels.forecast}
            stackId="cashflow"
            fill="var(--primary)"
            fillOpacity={0.5}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
