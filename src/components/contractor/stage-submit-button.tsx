"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconSend as Send, IconRefresh as Refresh, IconClockHour4 as Clock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { submitStageWork } from "@/server/actions/stages";

/**
 * Studiyaning "bu bosqiçni BKRM'ga topşiriş" böyiça ataylab bosiladigan amali —
 * fayl qöşişdan alohida. Topşirilgaç, öçirilgan "körikda" tasdiğiga aylanadi,
 * özgartiriş söralgandan keyin esa "qayta topşiriş"ga aylanadi.
 */
export function StageSubmitButton({
  stageId,
  reviewStatus,
  fullWidth = false,
  size = "lg",
}: {
  stageId: string;
  reviewStatus: string;
  fullWidth?: boolean;
  size?: "default" | "lg";
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
    <Button onClick={onClick} disabled={pending} size={size} className={fullWidth ? "w-full" : undefined}>
      {isResubmit ? <Refresh className="size-4" /> : <Send className="size-4" />}
      {isResubmit ? t("review.resubmit") : t("review.submit")}
    </Button>
  );
}
