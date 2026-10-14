"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";
import { completeStage } from "@/server/actions/stages";

export function CompleteStageButton({ stageId }: { stageId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      try {
        const res = await completeStage(stageId);
        if (!res.ok) { toast.error(t(`common.actionErrors.${res.error}` as "common.actionErrors.not_found")); return; }
        toast.success(res.projectCompleted ? t("projects.stageActions.projectCompleted") : t("projects.stageActions.completed"));
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending} variant="success" size="default">
      <CheckCircle2 className="size-4" />
      {t("projects.stageActions.complete")}
    </Button>
  );
}
