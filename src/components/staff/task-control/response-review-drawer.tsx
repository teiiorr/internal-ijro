"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconCircleCheck as CircleCheck,
  IconFileText as FileText,
  IconMessageCircleX as MessageX,
  IconListCheck as ListCheck,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDateTime } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { reviewAssigneeResponse } from "@/server/actions/tasks";

export type ReviewItem = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  departmentName: string | null;
  responseText: string | null;
  responseFileUrl: string | null;
  responseFileName: string | null;
  responseSubmittedAt: string | null;
};

/**
 * Right-side sheet (full screen on mobile) listing the answers that await review on
 * one task, with inline "Tasdiqlash" / "Rad etish". Both go through the existing
 * reviewAssigneeResponse action (which enforces creator / direktor / orinbosar and
 * auto-completes the parent task once every assignee is completed).
 */
export function ResponseReviewDrawer({
  taskId,
  taskTitle,
  items,
  trigger,
}: {
  taskId: string;
  taskTitle: string;
  items: ReviewItem[];
  trigger?: ReactNode;
}) {
  const t = useTranslations();
  const tc = useTranslations("staffX.taskControl");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  // Answers decided in this session disappear immediately, before router.refresh() lands.
  const [done, setDone] = useState<Set<string>>(() => new Set());

  const visible = items.filter((i) => !done.has(i.userId));

  function onOpenChange(next: boolean) {
    if (next) {
      setDone(new Set());
      setRejectingId(null);
    }
    setOpen(next);
  }

  function decide(userId: string, decision: "completed" | "rejected") {
    const text = (feedback[userId] ?? "").trim();
    if (decision === "rejected" && !text) {
      setRejectingId(userId);
      toast.error(tc("feedbackRequired"));
      return;
    }
    setBusyId(userId);
    start(async () => {
      try {
        await reviewAssigneeResponse(taskId, userId, decision, decision === "rejected" ? text : undefined);
        toast.success(decision === "completed" ? t("tasks.review.approvedToast") : t("tasks.review.rejectedToast"));
        const nextDone = new Set(done);
        nextDone.add(userId);
        setDone(nextDone);
        setRejectingId(null);
        if (items.every((i) => nextDone.has(i.userId))) setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(t("tasks.review.errorToast"), { description: (e as Error).message });
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="soft" size="sm">
            <ListCheck className="size-4" />
            {tc("review")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        style={{ animation: "slide-from-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="left-auto right-0 top-0 h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 content-start gap-4 rounded-none p-4 sm:max-w-lg sm:rounded-l-3xl sm:p-6"
      >
        <DialogHeader className="min-w-0 pr-10">
          <DialogTitle className="text-lg sm:text-xl">{tc("reviewTitle")}</DialogTitle>
          <DialogDescription className="break-words">
            <Link href={`/tasks/${taskId}`} className="hover:text-[var(--primary)] hover:underline">
              {taskTitle}
            </Link>
          </DialogDescription>
        </DialogHeader>

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted)]">
            {tc("reviewEmpty")}
          </p>
        ) : (
          <ul className="min-w-0 space-y-3">
            {visible.map((a) => {
              const busy = pending && busyId === a.userId;
              const rejecting = rejectingId === a.userId;
              return (
                <li key={a.userId} className="min-w-0 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={shortName(a.fullName)} avatarUrl={a.avatarUrl} size="sm" clickable={false} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{shortName(a.fullName)}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{a.departmentName ?? "—"}</p>
                    </div>
                    {a.responseSubmittedAt && (
                      <span className="shrink-0 text-right text-[11px] tabular-nums text-[var(--muted)]">
                        {formatDateTime(a.responseSubmittedAt, locale)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--muted)]">{t("tasks.review.responseLabel")}</p>
                    {a.responseText ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{a.responseText}</p>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">{t("tasks.review.noResponse")}</p>
                    )}
                    {a.responseFileUrl && (
                      <a
                        href={a.responseFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                      >
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">{a.responseFileName ?? t("common.file")}</span>
                      </a>
                    )}
                  </div>

                  {rejecting && (
                    <Textarea
                      autoFocus
                      value={feedback[a.userId] ?? ""}
                      maxLength={2000}
                      onChange={(e) => setFeedback((f) => ({ ...f, [a.userId]: e.target.value }))}
                      placeholder={tc("feedbackRequired")}
                      className="min-h-[80px]"
                      disabled={busy}
                    />
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    {rejecting ? (
                      <>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setRejectingId(null)} disabled={busy}>
                          {t("common.cancel")}
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => decide(a.userId, "rejected")} disabled={pending}>
                          <MessageX className="size-4" />
                          {tc("reject")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => setRejectingId(a.userId)} disabled={pending}>
                          <MessageX className="size-4" />
                          {tc("reject")}
                        </Button>
                        <Button type="button" size="sm" variant="success" onClick={() => decide(a.userId, "completed")} disabled={pending}>
                          <CircleCheck className="size-4" />
                          {tc("approve")}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
