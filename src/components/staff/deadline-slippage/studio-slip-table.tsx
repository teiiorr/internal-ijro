import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SlippageStudioRow } from "@/server/queries/slippage";

function fmtAvg(v: number | null): string {
  if (v == null) return "—";
  if (v > 0) return `+${v}`;
  if (v < 0) return `−${Math.abs(v)}`;
  return "0";
}

/** Studiyalar kesimi: bosqichga oʻrtacha surilish, koʻchirishlar va uzaytirish soʻrovlari natijalari. */
export function StudioSlipTable({ rows }: { rows: SlippageStudioRow[] }) {
  const t = useTranslations("staffX.deadlineSlippage");

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted)]">{t("studiosEmpty")}</p>;
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
            <th className="py-2.5 pr-3 font-semibold">{t("studio")}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t("avgSlip")}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t("reschedules")}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t("extApproved")}</th>
            <th className="py-2.5 pl-3 text-right font-semibold">{t("extRejected")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studioId} className="border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--surface-2)]">
              <td className="max-w-[240px] truncate py-3 pr-3 font-semibold" title={r.studioName}>
                {r.studioName || "—"}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-3 py-3 text-right font-bold tabular",
                  r.avgSlipPerStage != null && r.avgSlipPerStage > 0 && "text-[var(--danger)]",
                  r.avgSlipPerStage != null && r.avgSlipPerStage < 0 && "text-[var(--success)]"
                )}
              >
                {fmtAvg(r.avgSlipPerStage)}
              </td>
              <td className="px-3 py-3 text-right tabular">{r.reschedules}</td>
              <td className="px-3 py-3 text-right tabular">
                <span className={cn(r.extApproved > 0 && "font-semibold text-[var(--success)]")}>{r.extApproved}</span>
              </td>
              <td className="py-3 pl-3 text-right tabular">
                <span className={cn(r.extRejected > 0 && "font-semibold text-[var(--danger)]")}>{r.extRejected}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
