"use client";
import Link from "next/link";
import { Check, Lock, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { formatDate } from "@/lib/dates";

export type StagePathItem = {
  id: string;
  orderIndex: number;
  name: string;
  status: string; // 'locked' | 'active' | 'completed'
  plannedDeadline?: string | null;
  responsibleName?: string | null;
};

/**
 * Vertical stage stepper. Status is a coloured dashed tag (green done, amber
 * active, red locked). Layout stacks cleanly at every width: the name gets the
 * full row, with the status tag + meta on the line below — so long stage names
 * never get squeezed on mobile. Solid green connector for the finished part,
 * dashed for what's ahead.
 */
export function StagePath({ projectId, stages }: { projectId: string; stages: StagePathItem[] }) {
  const t = useTranslations();

  return (
    <ol>
      {stages.map((s, i) => {
        const isCompleted = s.status === "completed";
        const isActive = s.status === "active";
        const isLocked = !isCompleted && !isActive;
        const last = i === stages.length - 1;

        const tone: StatusTone = isCompleted ? "green" : isActive ? "amber" : "red";
        const label = isCompleted ? t("projects.stagePath.done") : isActive ? t("projects.stagePath.active") : t("projects.stagePath.locked");
        const meta = [s.responsibleName, s.plannedDeadline ? formatDate(s.plannedDeadline) : null].filter(Boolean).join(" · ");

        return (
          <li key={s.id}>
            <Link
              href={`/projects/${projectId}/stages/${s.id}`}
              className="group flex gap-3 rounded-xl transition-colors hover:bg-[var(--surface-2)] sm:gap-4"
            >
              {/* status circle + connector (solid green done / dashed ahead) */}
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    isCompleted
                      ? "bg-[var(--success)] text-white"
                      : isActive
                        ? "border-2 border-[var(--warning)] text-[var(--warning)]"
                        : "border-2 border-dashed border-[var(--border-strong)] text-[var(--subtle)]"
                  }`}
                >
                  {isCompleted ? <Check className="size-5" /> : isActive ? i + 1 : <Lock className="size-4" />}
                </span>
                {!last &&
                  (isCompleted ? (
                    <span aria-hidden className="my-1 w-0.5 flex-1 rounded bg-[var(--success)]" />
                  ) : (
                    <span aria-hidden className="my-1 w-0 flex-1 border-l-2 border-dashed border-[var(--border-strong)]" />
                  ))}
              </div>

              {/* content */}
              <div className="min-w-0 flex-1 py-2 pr-1">
                <div className="flex items-start gap-2">
                  <span className={`min-w-0 flex-1 font-semibold leading-6 ${isLocked ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                    {i + 1}. {s.name}
                  </span>
                  <ChevronRight className="mt-0.5 size-5 shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusTag tone={tone}>{label}</StatusTag>
                  {meta && <span className="text-sm leading-5 text-[var(--muted)]">{meta}</span>}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
