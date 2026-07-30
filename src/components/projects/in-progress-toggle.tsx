"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProjectInProgress } from "@/server/actions/projects";

/**
 * Manually mark a (single-stage) project as "in progress" — or clear it back.
 * Single-stage projects otherwise jump straight from "not started" to "completed".
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
