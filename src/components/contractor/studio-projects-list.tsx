"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { IconChevronDown as Chevron, IconFolder as Folder, IconClockHour4 as Clock } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { Card } from "@/components/ui-biib/Card";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
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
    return <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("contractors.detail.noProjects")}</p>;
  }

  // Avval sizni kutayotganlari (bkrm).
  const sorted = [...projects].sort((a, b) => (a.turn === "bkrm" ? 0 : 1) - (b.turn === "bkrm" ? 0 : 1));

  return (
    <Card bare className="px-5 sm:px-6">
      <ul className="-my-1 divide-y divide-[var(--line)]">
        {sorted.map((p) => {
          const isOpen = open.has(p.id);
          const a = p.activeStage;
          const done = p.status === "completed" || !a;
          const turnTone: StatusTone = p.turn === "bkrm" ? "warning" : done ? "success" : "neutral";
          const turnLabel = p.turn === "bkrm" ? t("review.turn.bkrmStaff") : done ? t("review.status.accepted") : t("review.turn.studioStaff");
          return (
            <li key={p.id}>
              <button
                onClick={() => toggle(p.id)}
                className="-mx-5 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-2)] sm:-mx-6 sm:px-6"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-m)] bg-[var(--surface-2)]">
                  {p.posterUrl ? (
                    <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover object-[center_25%]" />
                  ) : (
                    <div className="grid size-full place-items-center"><span className="text-lg font-black text-[var(--ink-3)]">{p.name.trim().charAt(0).toUpperCase()}</span></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-semibold text-[var(--ink)]">{p.name}</p>
                  {a ? (
                    <p className="mt-0.5 truncate t-micro text-[var(--ink-3)]">{a.orderIndex + 1}/{p.totalStages}, {a.name}</p>
                  ) : (
                    <p className="mt-0.5 truncate t-micro text-[var(--ink-3)]">{p.progressPercentage ?? 0}%</p>
                  )}
                </div>
                {a?.submittedAt && p.turn === "bkrm" && (
                  <span className="hidden items-center gap-1 t-micro text-[var(--ink-3)] sm:inline-flex"><Clock className="size-3.5" aria-hidden />{formatDate(a.submittedAt, locale)}</span>
                )}
                <Status tone={turnTone} dot={p.turn === "bkrm"} className="shrink-0">{turnLabel}</Status>
                <Chevron className={cn("size-4 shrink-0 text-[var(--ink-3)] transition-transform", isOpen && "rotate-180")} aria-hidden />
              </button>

              {isOpen && (
                <div className="space-y-4 pb-4 pt-1">
                  {/* Studiyaga vazifa berish — eng ustda, bosqich boʻyicha (standart joriy bosqich) */}
                  {isEditor && (
                    <div className="flex justify-end">
                      <NewStudioTaskDialog projectId={p.id} stages={p.stages} defaultStageId={a?.id ?? null} />
                    </div>
                  )}
                  {a ? (
                    <>
                      {/* oʻzgartirish soʻrovi izohi (xodim oxirgi marta nimani soʻraganini koʻrsatadi) */}
                      {a.reviewStatus === "changes_requested" && a.reviewNote && (
                        <div className="space-y-1">
                          <p className="t-label text-[var(--danger)]">{t("review.changesRequestedTitle")}</p>
                          <p className="whitespace-pre-wrap t-small leading-relaxed text-[var(--ink-2)]">{a.reviewNote}</p>
                        </div>
                      )}

                      {isEditor ? (
                        <StageRequirementsEditor stageId={a.id} initial={a.requirements} />
                      ) : a.requirements ? (
                        <div className="space-y-1">
                          <h4 className="t-label text-[var(--ink)]">{t("review.requirements")}</h4>
                          <p className="whitespace-pre-wrap t-small text-[var(--ink-2)]">{a.requirements}</p>
                        </div>
                      ) : null}

                      <div>
                        <h4 className="mb-2 flex items-center gap-1.5 t-label text-[var(--ink)]"><Folder className="size-4 text-[var(--ink-3)]" aria-hidden />{t("projects.stageDocs.title")}</h4>
                        <StageDocuments stageId={a.id} documents={p.docs} canManage={isEditor} suggestions={p.suggestions} maxBytes={maxBytes} />
                      </div>

                      {isEditor && <StageReviewBar stageId={a.id} reviewStatus={a.reviewStatus} />}
                    </>
                  ) : (
                    <p className="t-small text-[var(--ink-3)]">{t("review.status.accepted")}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
