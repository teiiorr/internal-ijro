"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { IconChevronDown as Chevron, IconFolder as Folder, IconClockHour4 as Clock } from "@tabler/icons-react";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StageDocuments } from "@/components/projects/stage-documents";
import { StageReviewBar } from "@/components/projects/stage-review-bar";
import { StageRequirementsEditor } from "./stage-requirements-editor";
import { NewStudioTaskDialog } from "./new-studio-task-dialog";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Doc = { id: string; fileUrl: string; fileName: string; fileSize: number | null; category: string | null; uploadedAt: Date | string; uploaderName: string | null };
type ActiveStage = {
  id: string; name: string; orderIndex: number;
  reviewStatus: string; reviewNote: string | null; reviewedAt: Date | string | null;
  submittedAt: Date | string | null; requirements: string | null; plannedDeadline: string | null;
  submittedByName: string | null;
};
export type ReviewProject = {
  id: string; name: string; status: string; progressPercentage: number | null;
  deadline: string | Date | null; posterUrl: string | null; curatorName: string | null;
  totalStages: number; activeStage: ActiveStage | null; docs: Doc[]; suggestions: string[];
  stages: { id: string; name: string; orderIndex: number; status: string }[];
  turn: "studio" | "bkrm" | "nobody";
};

export function StudioProjectsList({
  projects,
  isEditor,
  autoExpandProjectId,
  maxBytes,
}: {
  projects: ReviewProject[];
  isEditor: boolean;
  autoExpandProjectId?: string;
  maxBytes: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState<Set<string>>(new Set(autoExpandProjectId ? [autoExpandProjectId] : []));
  const toggle = (id: string) => setOpen((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (projects.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--muted)]">{t("contractors.detail.noProjects")}</p>;
  }

  // Avval sizni kutayotganlari (bkrm).
  const sorted = [...projects].sort((a, b) => (a.turn === "bkrm" ? 0 : 1) - (b.turn === "bkrm" ? 0 : 1));

  return (
    <div className="space-y-3">
      {sorted.map((p) => {
        const isOpen = open.has(p.id);
        const a = p.activeStage;
        const done = p.status === "completed" || !a;
        const turnTone: StatusTone = p.turn === "bkrm" ? "amber" : done ? "green" : "muted";
        const turnLabel = p.turn === "bkrm" ? t("review.turn.bkrmStaff") : done ? t("review.status.accepted") : t("review.turn.studioStaff");
        return (
          <div key={p.id} className={cn("overflow-hidden rounded-2xl border bg-[var(--card)] shadow-[var(--shadow-1)]", p.turn === "bkrm" ? "border-[var(--warning)]/55" : "border-[var(--border)]")}>
            <button onClick={() => toggle(p.id)} className="flex w-full items-center gap-3 p-3 text-left sm:p-4">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)]">
                {p.posterUrl ? (
                  <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover object-[center_25%]" />
                ) : (
                  <div className="grid size-full place-items-center"><span className="text-lg font-black text-[var(--subtle)]">{p.name.trim().charAt(0).toUpperCase()}</span></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                {a ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{a.orderIndex + 1}/{p.totalStages} · {a.name}</p>
                ) : (
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{p.progressPercentage ?? 0}%</p>
                )}
              </div>
              {a?.submittedAt && p.turn === "bkrm" && (
                <span className="hidden items-center gap-1 text-[11px] text-[var(--muted)] sm:inline-flex"><Clock className="size-3.5" />{formatDate(a.submittedAt, locale)}</span>
              )}
              <StatusTag tone={turnTone} size="sm" className="shrink-0">{turnLabel}</StatusTag>
              <Chevron className={cn("size-4 shrink-0 text-[var(--subtle)] transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-[var(--border)] p-4">
                {a ? (
                  <>
                    {/* özgartiriş sörovi izohi (xodim oxirgi marta nimani söraganini körsatadi) */}
                    {a.reviewStatus === "changes_requested" && a.reviewNote && (
                      <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/8 p-3 text-sm">
                        <p className="mb-1 font-semibold text-[var(--danger)]">{t("review.changesRequestedTitle")}</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{a.reviewNote}</p>
                      </div>
                    )}

                    {isEditor ? (
                      <StageRequirementsEditor stageId={a.id} initial={a.requirements} />
                    ) : a.requirements ? (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{t("review.requirements")}</h4>
                        <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{a.requirements}</p>
                      </div>
                    ) : null}

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Folder className="size-4 text-[var(--muted)]" />{t("projects.stageDocs.title")}</h4>
                      <StageDocuments stageId={a.id} documents={p.docs} canManage={isEditor} suggestions={p.suggestions} maxBytes={maxBytes} />
                    </div>

                    {isEditor && <StageReviewBar stageId={a.id} reviewStatus={a.reviewStatus} />}
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted)]">{t("review.status.accepted")}</p>
                )}

                {/* Studiyaga vazifa beriş (bosqiç böyiça) — faqat muharrirlar uçun */}
                {isEditor && (
                  <div className="flex justify-end border-t border-[var(--border)] pt-3">
                    <NewStudioTaskDialog projectId={p.id} stages={p.stages} defaultStageId={a?.id ?? null} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
