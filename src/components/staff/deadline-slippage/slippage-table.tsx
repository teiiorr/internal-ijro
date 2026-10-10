import { useTranslations } from "next-intl";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { fmtDmy, sharePercent, slipTone, type SlipTone } from "@/lib/projects/slippage";
import type { SlippageProjectRow } from "@/server/queries/slippage";

const SLIP_STATUS: Record<SlipTone, StatusTone> = {
  green: "success",
  amber: "warning",
  red: "danger",
  muted: "neutral",
};

function SlipChip({ days }: { days: number | null }) {
  if (days == null) return <span className="t-small text-[var(--ink-3)]">—</span>;
  const label = days > 0 ? `+${days}` : days < 0 ? `−${Math.abs(days)}` : "0";
  return (
    <Status tone={SLIP_STATUS[slipTone(days)]} className="min-w-[2.75rem] justify-center tabular-nums">
      {label}
    </Status>
  );
}

function ShareBar({ share }: { share: number | null }) {
  const pct = sharePercent(share);
  if (pct == null) return <span className="t-small text-[var(--ink-3)]">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-[var(--radius-s)] bg-[var(--surface-3)]" aria-hidden>
        <span className="block h-full rounded-[var(--radius-s)] bg-[var(--warning)]" style={{ width: `${pct}%` }} />
      </span>
      <span className="t-small font-semibold tabular-nums text-[var(--ink-2)]">{pct}%</span>
    </span>
  );
}

/**
 * Loyihalar reytingi: surilish (kun) boʻyicha kamayish tartibida.
 * Mobil'da — ajratuvchi qatorlar (butun qator — havola), sm+ da gorizontal jadval.
 */
export function SlippageTable({ rows }: { rows: SlippageProjectRow[] }) {
  const t = useTranslations("staffX.deadlineSlippage");

  if (rows.length === 0) {
    return <p className="py-8 text-center t-small text-[var(--ink-3)]">{t("empty")}</p>;
  }

  return (
    <>
      {/* Mobil: ajratuvchi qatorlar */}
      <div className="sm:hidden">
        <Rows>
          {rows.map((r) => (
            <Row key={r.projectId} href={`/projects/${r.projectId}`}>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-[0.9375rem] font-medium text-[var(--ink)] [overflow-wrap:anywhere]">
                    {r.projectName}
                  </span>
                  <SlipChip days={r.slipDays} />
                </div>
                <p className="truncate t-small text-[var(--ink-3)]">
                  {[r.studioName, r.typeName].filter(Boolean).join(", ") || "—"}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 t-small tabular-nums text-[var(--ink-3)]">
                  <span className="inline-flex items-center gap-1">
                    {fmtDmy(r.baselineEnd)}
                    <IconArrowRight className="size-3 text-[var(--ink-3)]" aria-hidden />
                    <span className="font-semibold text-[var(--ink)]">{fmtDmy(r.currentEnd)}</span>
                  </span>
                  <span>
                    {t("reschedules")}: <span className="font-semibold text-[var(--ink)]">{r.reschedules}</span>
                  </span>
                  <ShareBar share={r.studioShare} />
                </div>
              </div>
            </Row>
          ))}
        </Rows>
      </div>

      {/* sm+: jadval */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left t-micro text-[var(--ink-3)]">
              <th className="py-2.5 pr-3 font-semibold">{t("project")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("studio")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("baselineEnd")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("currentEnd")}</th>
              <th className="px-3 py-2.5 text-center font-semibold">{t("slipDays")}</th>
              <th className="px-3 py-2.5 text-center font-semibold">{t("reschedules")}</th>
              <th className="py-2.5 pl-3 font-semibold">{t("studioShare")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.projectId} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)]">
                <td className="max-w-[280px] py-3 pr-3">
                  <Link href={`/projects/${r.projectId}`} className="block truncate font-semibold text-[var(--ink)] hover:underline" title={r.projectName}>
                    {r.projectName}
                  </Link>
                  {r.typeName && <span className="block truncate t-small text-[var(--ink-3)]">{r.typeName}</span>}
                </td>
                <td className="max-w-[200px] truncate px-3 py-3 text-[var(--ink-2)]" title={r.studioName ?? undefined}>
                  {r.studioName ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--ink-3)]">{fmtDmy(r.baselineEnd)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-[var(--ink)]">{fmtDmy(r.currentEnd)}</td>
                <td className="px-3 py-3 text-center">
                  <SlipChip days={r.slipDays} />
                </td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums text-[var(--ink)]">{r.reschedules}</td>
                <td className="py-3 pl-3">
                  <ShareBar share={r.studioShare} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
