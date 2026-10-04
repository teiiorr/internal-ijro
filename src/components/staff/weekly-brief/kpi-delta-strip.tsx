import { useTranslations } from "next-intl";
import { IconInfoCircle as InfoCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
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
const SPARK_H = 28;

const DELTA_TONE: Record<MetricDelta["tone"], string> = {
  good: "text-[var(--success)]",
  bad: "text-[var(--danger)]",
  neutral: "text-[var(--muted)]",
};

const SPARK_TONE: Record<MetricDelta["tone"], { stroke: string; fill: string }> = {
  good: { stroke: "var(--success)", fill: "var(--success-soft)" },
  bad: { stroke: "var(--danger)", fill: "var(--danger-soft)" },
  neutral: { stroke: "var(--primary)", fill: "var(--primary-soft)" },
};

function Sparkline({ values, tone, label }: { values: number[]; tone: MetricDelta["tone"]; label: string }) {
  const path = sparklinePath(values, SPARK_W, SPARK_H, 2);
  if (!path) return null;
  const c = SPARK_TONE[tone];
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className="mt-3 block h-7 w-full overflow-visible"
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
 * 7 ta KPI plitkasi: qiymat, oʻtgan haftaga nisbatan ▲/▼ farq ("yaxshi yoʻnalish" boʻyicha
 * rangli) va 12 haftalik inline-SVG sparkline (recharts'siz). Delta oldingi hafta snapshot'i
 * boʻlsa, sparkline kamida 2 ta snapshot boʻlsa chiqadi. Snapshot yoʻq hafta uchun holat
 * koʻrsatkichlari "Taxminiy" belgisini oladi. Server komponenti (hook'siz holat).
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
    <section className="space-y-3" aria-label={t("title")}>
      {isEstimate && (
        <p className="flex items-start gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3.5 py-2.5 text-sm text-[var(--foreground)]">
          <InfoCircle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
          <span className="min-w-0 break-words">
            <span className="font-bold text-[var(--warning)]">{t("estimate")}.</span> {t("estimateHint")}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
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
              className={cn(
                "flex min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-1)] sm:p-4",
                tile.money && "col-span-2 sm:col-span-3 lg:col-span-1"
              )}
            >
              <p className="min-w-0 break-words text-[11px] font-bold uppercase leading-snug tracking-wide text-[var(--muted)]">
                {label}
              </p>
              {/* mt-auto: label qatorlar soni turlicha boʻlsa ham qiymatlar bir chiziqda turadi */}
              <p className="mt-auto break-words pt-2 text-2xl font-bold leading-none tabular-nums sm:text-[1.75rem]" title={full}>
                {shown}
              </p>
              <div className="mt-2 flex min-h-[18px] min-w-0 items-center gap-1.5 text-xs">
                {delta && (
                  <>
                    <span className={cn("shrink-0 font-bold tabular-nums", DELTA_TONE[delta.tone])}>
                      {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "="}{" "}
                      {delta.direction === "flat" ? "0" : fmt(tile.key, Math.abs(delta.diff))}
                    </span>
                    <span className="min-w-0 truncate text-[var(--subtle)]">{t("vsPrev")}</span>
                  </>
                )}
                {isEstimate && tile.pointInTime && (
                  <span
                    className="ml-auto shrink-0 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning)]"
                    title={t("estimateHint")}
                  >
                    {t("estimate")}
                  </span>
                )}
              </div>
              {values.length >= 2 && (
                <Sparkline values={values} tone={delta?.tone ?? "neutral"} label={`${label}: ${t("trend")}`} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
