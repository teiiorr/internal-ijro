import { useTranslations } from "next-intl";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { StatusTag } from "@/components/ui/status-tag";
import { fmtDmy, sharePercent, slipTone } from "@/lib/projects/slippage";
import type { SlippageProjectRow } from "@/server/queries/slippage";

function SlipChip({ days }: { days: number | null }) {
  if (days == null) return <span className="text-[var(--subtle)]">—</span>;
  const label = days > 0 ? `+${days}` : days < 0 ? `−${Math.abs(days)}` : "0";
  return (
    <StatusTag tone={slipTone(days)} size="sm" className="tabular min-w-[2.75rem]">
      {label}
    </StatusTag>
  );
}

function ShareBar({ share }: { share: number | null }) {
  const pct = sharePercent(share);
  if (pct == null) return <span className="text-[var(--subtle)]">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden>
        <span className="block h-full rounded-full bg-[var(--warning)]" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs font-semibold tabular">{pct}%</span>
    </span>
  );
}

/**
 * Loyihalar reytingi: surilish (kun) boʻyicha kamayish tartibida.
 * Mobil'da — kartalar roʻyxati, sm+ — gorizontal aylantiriladigan jadval.
 */
export function SlippageTable({ rows }: { rows: SlippageProjectRow[] }) {
  const t = useTranslations("staffX.deadlineSlippage");

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted)]">{t("empty")}</p>;
  }

  return (
    <>
      {/* Mobil: kartalar */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={r.projectId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/projects/${r.projectId}`} className="block break-words text-sm font-semibold leading-snug hover:underline [overflow-wrap:anywhere]">
                  {r.projectName}
                </Link>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {[r.studioName, r.typeName].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <SlipChip days={r.slipDays} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular">
              <span className="text-[var(--muted)]">{fmtDmy(r.baselineEnd)}</span>
              <IconArrowRight className="size-3 text-[var(--subtle)]" aria-hidden />
              <span className="font-semibold">{fmtDmy(r.currentEnd)}</span>
            </div>
            <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
              <div className="min-w-0">
                <dt className="truncate text-[var(--muted)]">{t("reschedules")}</dt>
                <dd className="mt-0.5 font-bold tabular">{r.reschedules}</dd>
              </div>
              <div className="min-w-0">
                <dt className="truncate text-[var(--muted)]">{t("studioShare")}</dt>
                <dd className="mt-1">
                  <ShareBar share={r.studioShare} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* sm+: jadval */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
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
              <tr key={r.projectId} className="border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--surface-2)]">
                <td className="max-w-[280px] py-3 pr-3">
                  <Link href={`/projects/${r.projectId}`} className="block truncate font-semibold hover:underline" title={r.projectName}>
                    {r.projectName}
                  </Link>
                  {r.typeName && <span className="block truncate text-xs text-[var(--muted)]">{r.typeName}</span>}
                </td>
                <td className="max-w-[200px] truncate px-3 py-3 text-[var(--muted)]" title={r.studioName ?? undefined}>
                  {r.studioName ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular text-[var(--muted)]">{fmtDmy(r.baselineEnd)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold tabular">{fmtDmy(r.currentEnd)}</td>
                <td className="px-3 py-3 text-center">
                  <SlipChip days={r.slipDays} />
                </td>
                <td className="px-3 py-3 text-center font-semibold tabular">{r.reschedules}</td>
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
