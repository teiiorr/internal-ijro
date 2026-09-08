"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconCircleCheck as CheckCircle2, IconArrowBackUp as Revise, IconX as X } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { acceptStage, completeStage, requestStageChanges } from "@/server/actions/stages";

/**
 * Staff review controls for an ACTIVE stage. When the studio has submitted, the
 * bar leads with Accept & advance + Request changes; otherwise it falls back to
 * a plain Complete (staff can still advance internal stages).
 */
export function StageReviewBar({ stageId, reviewStatus }: { stageId: string; reviewStatus: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const submitted = reviewStatus === "submitted";

  function doAccept() {
    start(async () => {
      try {
        const res = await (submitted ? acceptStage(stageId) : completeStage(stageId));
        toast.success(res.projectCompleted ? t("projects.stageActions.projectCompleted") : t("projects.stageActions.completed"));
        router.refresh();
      } catch (e) {
        const msg = (e as Error).message;
        toast.error(msg === "stage_not_active" ? t("projects.stageActions.notActive") : msg);
      }
    });
  }

  function doRequestChanges() {
    if (note.trim().length < 2) { toast.error(t("review.notePlaceholder")); return; }
    start(async () => {
      try {
        await requestStageChanges(stageId, note.trim());
        toast.success(t("review.changesSent"));
        setNote("");
        setNoteOpen(false);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      {submitted && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3.5 py-2.5 text-sm font-semibold text-[var(--warning)]">
          <span className="relative flex size-2 shrink-0"><span className="absolute inline-flex size-full rounded-full bg-[var(--warning)] opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-[var(--warning)]" /></span>
          {t("review.awaitingReview")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={doAccept} disabled={pending} variant="success" size="default">
          <CheckCircle2 className="size-4" />
          {submitted ? t("review.accept") : t("projects.stageActions.complete")}
        </Button>
        {submitted && !noteOpen && (
          <Button onClick={() => setNoteOpen(true)} disabled={pending} variant="outline" size="default">
            <Revise className="size-4" />
            {t("review.requestChanges")}
          </Button>
        )}
      </div>

      {noteOpen && (
        <div className="space-y-2 rounded-2xl border border-[var(--border)] p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("review.notePlaceholder")}
            rows={3}
            autoFocus
            className="w-full resize-y rounded-xl border border-[var(--input)] bg-[var(--surface-1)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--subtle)] focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
          />
          <div className="flex items-center gap-2">
            <Button onClick={doRequestChanges} disabled={pending} variant="default" size="sm">
              <Revise className="size-4" />
              {t("review.requestChanges")}
            </Button>
            <Button onClick={() => { setNoteOpen(false); setNote(""); }} disabled={pending} variant="ghost" size="sm">
              <X className="size-4" />
              {t("review.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
