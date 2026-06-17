"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProjectOnHold } from "@/server/actions/projects";

export function OnHoldToggle({ projectId, onHold }: { projectId: string; onHold: boolean }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={onHold ? "default" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => start(() => setProjectOnHold(projectId, !onHold).catch(() => {}))}
    >
      {onHold ? <Play className="size-4" /> : <Pause className="size-4" />}
      {onHold ? t("projects.resume") : t("projects.pause")}
    </Button>
  );
}
