"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconSend as Send, IconRefresh as Refresh, IconClockHour4 as Clock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { submitStageWork } from "@/server/actions/stages";

/**
 * Studio's deliberate "hand this stage to BKRM" action — separate from adding
 * files. Becomes a disabled "under review" confirmation once submitted, and a
 * "resubmit" after changes were requested.
 */
export function StageSubmitButton({
  stageId,
  reviewStatus,
  fullWidth = false,
}: {
  stageId: string;
  reviewStatus: string;
  fullWidth?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();

  if (reviewStatus === "submitted") {
    return (
      <div className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--muted)] ${fullWidth ? "w-full" : ""}`}>
        <Clock className="size-4 shrink-0" />
        {t("review.submittedWait")}
      </div>
    );
  }

  const isResubmit = reviewStatus === "changes_requested";

  function onClick() {
    start(async () => {
      try {
        await submitStageWork(stageId);
        toast.success(t("review.submitSuccess"));
        router.refresh();
      } catch (e) {
        const msg = (e as Error).message;
        toast.error(msg === "nothing_to_submit" ? t("review.nothingToSubmit") : msg);
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending} size="lg" className={fullWidth ? "w-full" : undefined}>
      {isResubmit ? <Refresh className="size-4" /> : <Send className="size-4" />}
      {isResubmit ? t("review.resubmit") : t("review.submit")}
    </Button>
  );
}
