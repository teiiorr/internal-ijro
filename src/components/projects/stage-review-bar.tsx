"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconCircleCheck as CheckCircle2, IconArrowBackUp as Revise, IconX as X } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { acceptStage, completeStage, requestStageChanges } from "@/server/actions/stages";

/**
 * FAOL bosqiç uçun xodimlar körib çiqiş boşqaruvlari. Studiya işni topşirgan bölsa,
 * panelda avval "Qabul qilib ötkazish" va "Özgartirish söraş" turadi; aks holda oddiy
 * "Yakunlash"ga qaytadi (xodimlar içki bosqiçlarni baribir ötkaza oladi).
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
        if (!res.ok) { toast.error(t(`common.actionErrors.${res.error}` as "common.actionErrors.not_found")); return; }
        toast.success(res.projectCompleted ? t("projects.stageActions.projectCompleted") : t("projects.stageActions.completed"));
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  function doRequestChanges() {
    if (note.trim().length < 2) { toast.error(t("review.notePlaceholder")); return; }
    start(async () => {
      try {
        const r = await requestStageChanges(stageId, note.trim());
        if (!r.ok) { toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.not_found")); return; }
        toast.success(t("review.changesSent"));
        setNote("");
        setNoteOpen(false);
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  return (
    <div className="space-y-3">
      {submitted && (
        <div className="rounded-[var(--radius-s)] border-l-2 border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--warning)]">
          {t("review.awaitingReview")}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
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
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("review.notePlaceholder")}
            rows={3}
            autoFocus
            className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] focus-visible:border-[var(--tint)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
          />
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => { setNoteOpen(false); setNote(""); }} disabled={pending} variant="ghost" size="sm">
              <X className="size-4" />
              {t("review.cancel")}
            </Button>
            <Button onClick={doRequestChanges} disabled={pending} variant="default" size="sm">
              <Revise className="size-4" />
              {t("review.requestChanges")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
