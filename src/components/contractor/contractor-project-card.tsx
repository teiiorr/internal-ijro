import Link from "next/link";
import { IconStack2 as Layers, IconCalendarEvent as Calendar } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { Marquee } from "@/components/ui/marquee";

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
  /** "Whose turn" signal — the studio's most actionable cue. */
  turnLabel?: string | null;
  turnTone?: StatusTone;
}

/** Telegram-style project row for the studio portal: poster, two-line content,
 *  the actionable signal (your turn / overdue) promoted via a leading accent
 *  stripe + a loud pill; long text scrolls (Marquee) so rows keep even height. */
export function ContractorProjectCard(p: ContractorProjectCardProps) {
  // The one thing that matters most on this row, loudest.
  const accent = p.overdue ? "bg-[var(--danger)]" : p.turnTone === "amber" ? "bg-[var(--warning)]" : null;

  return (
    <Link
      href={p.href}
      className="group relative flex gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-1)] transition-colors hover:border-[var(--primary)] active:scale-[0.995]"
    >
      {accent && <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />}

      <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-2)]">
        {p.posterUrl ? (
          <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover object-[center_25%]" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
            <span className="select-none text-2xl font-black text-[var(--subtle)]">{p.name.trim().charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <Marquee className="min-w-0 flex-1 text-[15px] font-bold leading-snug tracking-tight">{p.name}</Marquee>
          {p.deadlineLabel && (
            <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium tabular-nums ${p.overdue ? "text-[var(--danger)]" : "text-[var(--subtle)]"}`}>
              <Calendar className="size-3.5" />{p.deadlineLabel}
            </span>
          )}
        </div>

        {/* Subtitle: where am I (stage) or type. */}
        {(p.stageLabel || p.typeName) && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
            {p.stageLabel && <Layers className="size-3.5 shrink-0" />}
            <Marquee className="min-w-0 flex-1">{p.stageLabel ?? p.typeName}</Marquee>
          </div>
        )}

        {/* Progress + the actionable pill. */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${p.progress}%` }} />
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--muted)]">{p.progress}%</span>
          {p.overdue && p.overdueLabel ? (
            <StatusTag tone="red" size="sm" className="shrink-0">{p.overdueLabel}</StatusTag>
          ) : p.turnLabel ? (
            <StatusTag tone={p.turnTone ?? "muted"} size="sm" className="shrink-0">{p.turnLabel}</StatusTag>
          ) : (
            <StatusTag tone={p.statusTone} size="sm" className="shrink-0">{p.statusLabel}</StatusTag>
          )}
        </div>
      </div>
    </Link>
  );
}
