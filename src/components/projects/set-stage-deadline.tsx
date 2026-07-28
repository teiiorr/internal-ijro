"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { setStageDeadline } from "@/server/actions/stages";
import { formatDate } from "@/lib/dates";

/**
 * Shows the stage deadline + live countdown, and (for managers) an inline date
 * editor. `active` gates the countdown — only the current stage ticks.
 */
export function SetStageDeadline({
  stageId,
  deadline,
  canManage,
  active,
}: {
  stageId: string;
  deadline: string | null;
  canManage: boolean;
  active: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(deadline ?? "");

  function persist(next: string | null) {
    start(async () => {
      try {
        await setStageDeadline(stageId, next);
        toast.success(t("projects.stageDeadline.saved"));
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CalendarClock className="size-4 shrink-0 text-[var(--muted)]" />
        <span className={`font-semibold ${deadline ? "" : "text-[var(--muted)]"}`}>
          {deadline ? formatDate(deadline) : t("projects.stageDeadline.notSet")}
        </span>
        {active && deadline && <DeadlineCountdown deadline={deadline} />}
      </div>

      {canManage && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3 text-sm font-medium text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <Button onClick={() => persist(value || null)} disabled={pending || value === (deadline ?? "")} size="default">
              {t("common.save")}
            </Button>
            {deadline && (
              <Button
                onClick={() => {
                  setValue("");
                  persist(null);
                }}
                variant="ghost"
                size="default"
                disabled={pending}
              >
                {t("projects.stageDeadline.clear")}
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">{t("projects.stageDeadline.hint")}</p>
        </>
      )}
    </div>
  );
}
