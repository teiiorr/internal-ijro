"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GlassTooltip, CHART_ANIM } from "./chart-kit";

/** Topshiriqlar oqimi: yaratilgan vs yakunlangan — modern gradient area (animatsiyali). */
export function TaskTimelineChart({ data }: { data: { date: string; created: number; completed: number }[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="area-created" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="area-completed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis dataKey="date" stroke="var(--ink-3)" tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis stroke="var(--ink-3)" tick={{ fontSize: 11, fill: "var(--ink-3)" }} allowDecimals={false} tickLine={false} axisLine={false} width={34} />
          <Tooltip cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} content={<GlassTooltip />} />
          <Area type="monotone" dataKey="created" name="created" stroke="#2563eb" strokeWidth={2.5} fill="url(#area-created)" dot={false} activeDot={{ r: 4 }} {...CHART_ANIM} />
          <Area type="monotone" dataKey="completed" name="completed" stroke="#16a34a" strokeWidth={2.5} fill="url(#area-completed)" dot={false} activeDot={{ r: 4 }} {...CHART_ANIM} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
