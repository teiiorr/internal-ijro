import Link from "next/link";
import { IconStack2 as Layers, IconCalendarEvent as Calendar } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";

export interface ContractorProjectCardProps {
  href: string;
  name: string;
  posterUrl?: string | null;
  progress: number;
  statusLabel: string;
  statusTone: StatusTone;
  typeName?: string | null;
  /** e.g. "3/5 · Montaj" — current stage. */
  stageLabel?: string | null;
  deadlineLabel?: string | null;
  overdue?: boolean;
  overdueLabel?: string;
}

/** Big, information-first project card for the studio portal — name leads, clear
 *  progress + status + "where am I" (stage) + deadline, no poster wall. */
export function ContractorProjectCard(p: ContractorProjectCardProps) {
  return (
    <Link
      href={p.href}
      className="group flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-1)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)] active:scale-[0.995] sm:p-4"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)] sm:size-24">
        {p.posterUrl ? (
          <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover object-[center_25%]" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
            <span className="select-none text-3xl font-black text-[var(--subtle)]">{p.name.trim().charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 text-base font-bold leading-snug tracking-tight break-words sm:text-lg">{p.name}</h3>
          <StatusTag tone={p.statusTone} className="mt-0.5 shrink-0">{p.statusLabel}</StatusTag>
        </div>
        {p.typeName && <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{p.typeName}</p>}

        <div className="mt-auto pt-3">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500" style={{ width: `${p.progress}%` }} />
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums">{p.progress}%</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {p.stageLabel && (
              <span className="inline-flex min-w-0 items-center gap-1 text-[var(--muted)]">
                <Layers className="size-3.5 shrink-0" />
                <span className="truncate">{p.stageLabel}</span>
              </span>
            )}
            {p.deadlineLabel && (
              <span className={`inline-flex items-center gap-1 font-medium ${p.overdue ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                <Calendar className="size-3.5 shrink-0" />
                {p.deadlineLabel}
                {p.overdue && p.overdueLabel ? ` · ${p.overdueLabel}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
