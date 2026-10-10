import { useTranslations } from "next-intl";
import { IconInfoCircle as InfoCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui-biib/Card";
import { Status } from "@/components/ui-biib/Status";
import { MONEY_MASK } from "@/lib/permissions/project-editors";
import {
  compactAmount,
  formatInt,
  KPI_TILES,
  metricDelta,
  sparklinePath,
  type KpiKey,
  type MetricDelta,
  type WeeklyMetrics,
} from "@/lib/reports/weekly-brief-core";

const SPARK_W = 100;
const SPARK_H = 24;

const DELTA_TONE: Record<MetricDelta["tone"], string> = {
  good: "text-[var(--success)]",
  bad: "text-[var(--danger)]",
  neutral: "text-[var(--ink-3)]",
};

const SPARK_TONE: Record<MetricDelta["tone"], { stroke: string; fill: string }> = {
  good: { stroke: "var(--success)", fill: "color-mix(in oklab, var(--success) 16%, transparent)" },
  bad: { stroke: "var(--danger)", fill: "color-mix(in oklab, var(--danger) 16%, transparent)" },
  neutral: { stroke: "var(--tint)", fill: "color-mix(in oklab, var(--tint) 16%, transparent)" },
};

function Sparkline({ values, tone, label }: { values: number[]; tone: MetricDelta["tone"]; label: string }) {
  const path = sparklinePath(values, SPARK_W, SPARK_H, 2);
  if (!path) return null;
  const c = SPARK_TONE[tone];
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className="mt-2.5 block h-6 w-full overflow-visible"
      role="img"
      aria-label={label}
    >
      <path d={path.area} fill={c.fill} stroke="none" />
      <path
        d={path.line}
        fill="none"
        stroke={c.stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Hafta koʻrsatkichlari — hisobotning ASOSIY mazmuni, shuning uchun saqlanadi, lekin plitka
 * EMAS: bitta oyna karta ichida ramkasiz, zich qator (qiymat + oʻtgan haftaga nisbatan
 * ▲/▼ farq + 12 haftalik inline sparkline). Snapshot yoʻq hafta "Taxminiy" holat belgisi
 * oladi. Server komponenti (hook'siz holat).
 */
export function KpiDeltaStrip({
  metrics,
  prev,
  series,
  isEstimate,
  canMoney,
}: {
  metrics: WeeklyMetrics;
  prev: WeeklyMetrics | null;
  series: { weekStart: string; metrics: WeeklyMetrics }[];
  isEstimate: boolean;
  canMoney: boolean;
}) {
  const t = useTranslations("staffX.weeklyBrief");

  const fmt = (key: KpiKey, n: number): string => {
    if (key !== "paidUzs") return formatInt(n);
    const c = compactAmount(n);
    if (c.unit === "billion") return t("compactBillion", { n: c.n });
    if (c.unit === "million") return t("compactMillion", { n: c.n });
    return c.n;
  };

  return (
    <section aria-label={t("title")}>
      <Card>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
          {KPI_TILES.map((tile) => {
            const masked = tile.money && !canMoney;
            const value = metrics[tile.key];
            const delta = masked ? null : metricDelta(value, prev ? prev[tile.key] : null, tile.good);
            const values = masked ? [] : series.map((s) => s.metrics[tile.key]);
            const label = t(`kpi.${tile.key}`);
            const shown = masked ? MONEY_MASK : fmt(tile.key, value);
            const full = masked ? MONEY_MASK : tile.money ? `${formatInt(value)} UZS` : formatInt(value);
            return (
              <div
                key={tile.key}
                className={cn("flex min-w-0 flex-col", tile.money && "col-span-2 sm:col-span-3 lg:col-span-1")}
              >
                <p
                  className="min-w-0 break-words text-[1.625rem] font-bold leading-none tabular-nums text-[var(--ink)]"
                  title={full}
                >
                  {shown}
                </p>
                <p className="mt-1.5 min-w-0 break-words t-small text-[var(--ink-3)]">{label}</p>
                <div className="mt-1.5 flex min-h-[20px] min-w-0 items-center gap-1.5">
                  {delta && (
                    <>
                      <span className={cn("shrink-0 font-semibold tabular-nums t-micro", DELTA_TONE[delta.tone])}>
                        {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "="}{" "}
                        {delta.direction === "flat" ? "0" : fmt(tile.key, Math.abs(delta.diff))}
                      </span>
                      <span className="min-w-0 truncate t-micro text-[var(--ink-3)]">{t("vsPrev")}</span>
                    </>
                  )}
                </div>
                {values.length >= 2 && (
                  <Sparkline values={values} tone={delta?.tone ?? "neutral"} label={`${label}: ${t("trend")}`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
