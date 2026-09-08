"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { IconPlayerPlay as PlayCircle, IconRotate as RotateCcw } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { setProjectInProgress } from "@/server/actions/projects";

/**
 * Bir bosqiçli loyihani qölda "jarayonda" holatiga ötkazadi — yoki bu holatni bekor qiladi.
 * Aks holda bir bosqiçli loyihalar "boşlanmagan" holatidan töğridan-töğri "yakunlangan" holatiga ötib ketadi.
 */
export function InProgressToggle({ projectId, active }: { projectId: string; active: boolean }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => start(() => setProjectInProgress(projectId, !active).catch(() => {}))}
    >
      {active ? <RotateCcw className="size-4" /> : <PlayCircle className="size-4" />}
      {active ? t("projects.clearInProgress") : t("projects.markInProgress")}
    </Button>
  );
}
