import { useTranslations } from "next-intl";
import { IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { isUnrealisticNorm, type BenchmarkRow } from "@/lib/projects/slippage";

const pct = (v: number, max: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;

/** Meʼyor / mediana / P80 ni bitta shkalada koʻrsatadigan ixcham chiziq. */
function DurationBar({ row, max, label }: { row: BenchmarkRow; max: number; label: string }) {
  return (
    <div className="relative h-3 w-full min-w-[140px] overflow-hidden rounded-[var(--radius-s)] bg-[var(--surface-3)]" role="img" aria-label={label}>
      {row.p80 != null && (
        <span className="absolute inset-y-0 left-0 rounded-[var(--radius-s)] bg-[color-mix(in_oklab,var(--tint)_26%,transparent)]" style={{ width: pct(row.p80, max) }} />
      )}
      {row.median != null && (
        <span className="absolute inset-y-0 left-0 rounded-[var(--radius-s)] bg-[var(--tint)]" style={{ width: pct(row.median, max) }} />
      )}
      {row.defaultDays != null && row.defaultDays > 0 && (
        <span
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-[var(--ink)]"
          style={{ left: pct(row.defaultDays, max) }}
        />
      )}
    </div>
  );
}

/**
 * Rejalashtirish aniqligi: shablon meʼyori (default_duration_days) va yakunlangan bosqichlarning
 * haqiqiy davomiyligi (mediana, P80). Mediana meʼyordan 25% dan oshsa, meʼyor katagi qizil.
 */
export function StageDurationBenchmark({ rows }: { rows: BenchmarkRow[] }) {
  const t = useTranslations("staffX.deadlineSlippage");

  if (rows.length === 0) {
    return <p className="py-8 text-center t-small text-[var(--ink-3)]">{t("benchmarkEmpty")}</p>;
  }

  const max = Math.max(1, ...rows.map((r) => Math.max(r.p80 ?? 0, r.median ?? 0, r.defaultDays ?? 0)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 t-micro text-[var(--ink-3)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 rounded-full bg-[var(--ink)]" aria-hidden />
          {t("legendNorm")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[var(--tint)]" aria-hidden />
          {t("legendMedian")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[color-mix(in_oklab,var(--tint)_26%,transparent)]" aria-hidden />
          {t("legendP80")}
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left t-micro font-semibold text-[var(--ink-3)]">
              <th className="py-2.5 pr-3 font-semibold">{t("stage")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("type")}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{t("norm")}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{t("median")}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{t("p80")}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{t("sample")}</th>
              <th className="w-[28%] py-2.5 pl-3 font-semibold" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const bad = isUnrealisticNorm(r.median, r.defaultDays);
              return (
                <tr key={r.templateItemId} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="max-w-[240px] py-3 pr-3">
                    <span className="block truncate font-semibold" title={r.stageName}>
                      {r.stageName}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-3 text-[var(--ink-3)]" title={r.typeName}>
                    {r.typeName || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold",
                        bad && "bg-[var(--danger-soft)] text-[var(--danger)]"
                      )}
                      title={bad ? t("unrealisticNorm") : undefined}
                    >
                      {bad && <IconAlertTriangle className="size-3.5" aria-label={t("unrealisticNorm")} />}
                      {r.defaultDays ?? "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums">{r.median ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-[var(--ink-3)]">{r.p80 ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-[var(--ink-3)]">{r.n}</td>
                  <td className="py-3 pl-3">
                    <DurationBar
                      row={r}
                      max={max}
                      label={`${t("legendNorm")}: ${r.defaultDays ?? "—"}, ${t("legendMedian")}: ${r.median ?? "—"}, ${t("legendP80")}: ${r.p80 ?? "—"}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
