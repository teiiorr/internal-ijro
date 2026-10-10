"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList, Cell } from "recharts";

export type PollChartDatum = { id: string; label: string; votes: number; pct: number; mine: boolean };

// BIIB: amal rangi — koʻk (A4.5 bo'yicha token-mos hex, recharts SVG fill uchun);
// koʻruvchining oʻz tanlovi — yashil. manager-widgets bilan bir xil qiymatlar.
const BAR = "#2563eb";
const MINE = "#16a34a";
const MAX_LABEL = 42;

const shorten = (s: string) => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s);

type Box = { x: number; y: number; width: number; height: number };

/**
 * Soʻrovnoma natijalari — gorizontal bar (recharts). Variant matni har bir bar
 * ustida (chap tomonda) yoziladi, shuning uchun tor (375px) ekranda ham oʻqiladi;
 * oʻngda foiz va ovozlar soni. Koʻruvchining oʻz tanlovi yashil rangda.
 * poll-block.tsx uni next/dynamic (ssr:false) orqali yuklaydi.
 */
export function PollChart({ data }: { data: PollChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.votes));
  const rows = data.map((d) => ({ ...d, short: shorten(d.label), display: `${d.pct}%, ${d.votes}` }));
  const height = rows.length * 52 + 12;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 20, right: 64, bottom: 0, left: 0 }} barCategoryGap={18}>
          <XAxis type="number" hide domain={[0, max]} allowDecimals={false} />
          <YAxis type="category" dataKey="id" hide />
          <Bar
            dataKey="votes"
            radius={[0, 8, 8, 0]}
            barSize={14}
            minPointSize={3}
            isAnimationActive={false}
            background={{ fill: "var(--surface-3)", radius: 8 }}
          >
            {rows.map((d) => (
              <Cell key={d.id} fill={d.mine ? MINE : BAR} />
            ))}
            <LabelList
              dataKey="short"
              content={(props) => {
                const vb = (props.viewBox ?? {}) as Partial<Box>;
                const x = Number(vb.x ?? props.x ?? 0);
                const y = Number(vb.y ?? props.y ?? 0);
                const full = typeof props.index === "number" ? rows[props.index]?.label : undefined;
                return (
                  <text x={x} y={y - 6} style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}>
                    {full && <title>{full}</title>}
                    {String(props.value ?? "")}
                  </text>
                );
              }}
            />
            <LabelList
              dataKey="display"
              position="right"
              style={{ fill: "var(--muted)", fontSize: 12, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
