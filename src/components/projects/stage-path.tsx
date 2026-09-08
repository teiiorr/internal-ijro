"use client";
import Link from "next/link";
import { IconCheck as Check, IconLock as Lock, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { shortName } from "@/lib/names";

export type StagePathItem = {
  id: string;
  orderIndex: number;
  name: string;
  status: string; // 'locked' | 'active' | 'completed'
  plannedDeadline?: string | null;
  responsibleName?: string | null;
};

/**
 * Vertikal bosqiçlar zinapoyasi. Holat rangli punktir teg bilan körsatiladi (yaşil — bajarilgan,
 * sariq — faol, qizil — qulflangan). Tuzilma har qanday enda toza joylaşadi: nom butun
 * qatorni egallaydi, holat tegi va meta esa pastdagi qatorda — şunda uzun bosqiç nomlari
 * mobilda heç qaçon siqilib qolmaydi. Bajarilgan qism uçun töq yaşil ulagiç,
 * oldindagi qism uçun punktir.
 */
export function StagePath({ projectId, stages, basePath }: { projectId: string; stages: StagePathItem[]; basePath?: string }) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <ol>
      {stages.map((s, i) => {
        const isCompleted = s.status === "completed";
        const isActive = s.status === "active";
        const isLocked = !isCompleted && !isActive;
        const last = i === stages.length - 1;

        const tone: StatusTone = isCompleted ? "green" : isActive ? "amber" : "red";
        const label = isCompleted ? t("projects.stagePath.done") : isActive ? t("projects.stagePath.active") : t("projects.stagePath.locked");
        const meta = [s.responsibleName, s.plannedDeadline ? formatDate(s.plannedDeadline, locale) : null].filter(Boolean).join(" · ");

        return (
          <li key={s.id}>
            <Link
              href={`${basePath ?? "/projects"}/${projectId}/stages/${s.id}`}
              className="group flex gap-3 rounded-xl transition-colors hover:bg-[var(--surface-2)] sm:gap-4"
            >
              {/* holat doirasi va ulagiç (töq yaşil — bajarilgan / punktir — oldinda) */}
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

              {/* mazmun */}
              <div className="min-w-0 flex-1 py-2 pr-1">
                <div className="flex items-center gap-2">
                  <span className={`min-w-0 flex-1 font-semibold leading-6 truncate ${isLocked ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                    {i + 1}. {s.name}
                  </span>
                  <StatusTag tone={tone}>{label}</StatusTag>
                  {isActive && s.plannedDeadline && <DeadlineCountdown deadline={s.plannedDeadline} />}
                  <ChevronRight className="size-5 shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
                </div>
                {(s.responsibleName || s.plannedDeadline) && (
                  <p className="mt-1 text-sm text-[var(--muted)] truncate">
                    {[shortName(s.responsibleName), s.plannedDeadline ? formatDate(s.plannedDeadline, locale) : null].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
