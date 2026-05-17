"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { setWatcher } from "@/server/actions/tasks";

export function WatcherToggle({ taskId, watching }: { taskId: string; watching: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => { await setWatcher(taskId, !watching); })}
    >
      {watching ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      {watching ? "Unwatch" : "Watch"}
    </Button>
  );
}
