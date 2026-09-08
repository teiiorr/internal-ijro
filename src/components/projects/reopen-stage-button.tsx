"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconArrowBackUp as Undo2, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { reopenStage } from "@/server/actions/stages";

/** Tasodifan bosilgan "bosqiçni yakunlash"ni bekor qiladi: oxirgi yakunlangan bosqiçni yana
 *  faol holatga qaytaradi (va keyingisini qayta qulflaydi). Xato bosişlarning oldini olish uçun ikki bosqiçli. Barcha xodimlar uçun oçiq. */
export function ReopenStageButton({ stageId }: { stageId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onReopen() {
    start(async () => {
      try {
        await reopenStage(stageId);
        toast.success(t("projects.stageActions.reopened"));
        router.refresh();
      } catch (e) {
        const msg = (e as Error).message;
        toast.error(
          msg === "not_last_completed" ? t("projects.stageActions.reopenNotLast")
          : msg === "stage_not_completed" ? t("projects.stageActions.reopenNotCompleted")
          : msg
        );
      }
    });
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} variant="outline" size="default">
        <Undo2 className="size-4" />
        {t("projects.stageActions.reopen")}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-sm text-[var(--muted)]">{t("projects.stageActions.reopenConfirm")}</span>
      <Button onClick={onReopen} disabled={pending} variant="destructive" size="sm">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("projects.stageActions.reopenYes")}
      </Button>
      <Button onClick={() => setConfirming(false)} disabled={pending} variant="ghost" size="sm">
        {t("common.cancel")}
      </Button>
    </div>
  );
}
