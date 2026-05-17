"use client";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { setWatcher } from "@/server/actions/tasks";

export function WatcherToggle({ taskId, watching }: { taskId: string; watching: boolean }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => { await setWatcher(taskId, !watching); })}
    >
      {watching ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      {watching ? t("tasks.sections.unwatch") : t("tasks.sections.watch")}
    </Button>
  );
}
