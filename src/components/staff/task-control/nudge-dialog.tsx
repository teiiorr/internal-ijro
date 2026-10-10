"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconBellRinging as BellRinging, IconClockPause as ClockPause } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { shortName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { nudgeAssignees } from "@/server/actions/task-nudges";
import { isNudgeThrottled, isOpenStatus } from "./control-logic";

export type NudgeAssignee = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  lastNudgeAt: string | null;
};

/**
 * "Eslatish" dialog: pick assignees (open status, not nudged in the last 24h) and send
 * them a reminder notification. Server-side throttling is authoritative; the disabled
 * rows here are only a hint.
 */
export function NudgeDialog({
  taskId,
  assignees,
  preselect,
  trigger,
}: {
  taskId: string;
  assignees: NudgeAssignee[];
  preselect?: string[];
  trigger?: ReactNode;
}) {
  const t = useTranslations();
  const tc = useTranslations("staffX.taskControl");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [blocked, setBlocked] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");

  function onOpenChange(next: boolean) {
    if (next) {
      // "Now" is captured in the event handler (not during render) to keep rendering pure.
      const now = Date.now();
      const throttled = new Set(assignees.filter((a) => isNudgeThrottled(a.lastNudgeAt, now)).map((a) => a.userId));
      const selectable = assignees.filter((a) => isOpenStatus(a.status) && !throttled.has(a.userId)).map((a) => a.userId);
      const initial = preselect ? selectable.filter((id) => preselect.includes(id)) : selectable;
      setBlocked(throttled);
      setSelected(new Set(initial));
      setMessage("");
    }
    setOpen(next);
  }

  function toggle(userId: string, checked: boolean) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (checked) s.add(userId);
      else s.delete(userId);
      return s;
    });
  }

  function submit() {
    const userIds = Array.from(selected);
    if (userIds.length === 0) return;
    start(async () => {
      try {
        const res = await nudgeAssignees({ taskId, userIds, message: message.trim() || null });
        if (res.sent.length > 0) toast.success(tc("nudgeSent", { count: res.sent.length }));
        if (res.throttled.length > 0) toast.info(tc("nudgeThrottledToast", { count: res.throttled.length }));
        if (res.sent.length === 0 && res.throttled.length === 0) toast.info(tc("nudgeNobody"));
        setOpen(false);
        router.refresh();
      } catch (e) {
        const msg = (e as Error).message;
        toast.error(msg === "nudge_unavailable" ? tc("nudgeUnavailable") : t("common.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <BellRinging className="size-4" />
            {tc("nudge")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md p-5 sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg sm:text-xl">{tc("nudgeTitle")}</DialogTitle>
          <DialogDescription>{tc("nudgeDescription")}</DialogDescription>
        </DialogHeader>

        <ul className="max-h-[40dvh] space-y-1 overflow-y-auto overscroll-contain pr-1">
          {assignees.map((a) => {
            const throttled = blocked.has(a.userId);
            const nudgeable = isOpenStatus(a.status);
            const disabled = throttled || !nudgeable || pending;
            const checked = selected.has(a.userId);
            const inputId = `nudge-${taskId}-${a.userId}`;
            return (
              <li key={a.userId}>
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 transition-colors",
                    checked ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  )}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    className="size-4 shrink-0 accent-[var(--tint)]"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => toggle(a.userId, e.target.checked)}
                  />
                  <UserAvatar name={shortName(a.fullName)} avatarUrl={a.avatarUrl} size="xs" clickable={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">{shortName(a.fullName)}</span>
                    <span className="flex items-center gap-1 truncate t-micro text-[var(--ink-3)]">
                      {throttled ? (
                        <>
                          <ClockPause className="size-3.5 shrink-0" />
                          <span className="truncate">{tc("nudgeThrottled")}</span>
                        </>
                      ) : (
                        <span className="truncate">{t(`tasks.status.${statusKey(a.status)}`)}</span>
                      )}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2">
          <Label htmlFor={`nudge-msg-${taskId}`}>{tc("nudgeMessage")}</Label>
          <Textarea
            id={`nudge-msg-${taskId}`}
            value={message}
            maxLength={500}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={tc("nudgePlaceholder")}
            className="min-h-[84px]"
            disabled={pending}
          />
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={pending || selected.size === 0}>
            <BellRinging className="size-4" />
            {tc("nudgeSend", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const KNOWN = new Set(["todo", "in_progress", "under_review", "completed", "rejected"]);
function statusKey(s: string): string {
  return KNOWN.has(s) ? s : "todo";
}
