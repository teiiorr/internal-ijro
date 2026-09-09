"use client";
import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconClipboardList as ClipboardList, IconLoader2 as Loader, IconCircleCheck as CircleCheck, IconMessageCircle as MessageCircle } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { submitTaskResponse, shareTaskToChat } from "@/server/actions/tasks";

export type StudioTask = {
  id: string; title: string; description: string | null; priority: string;
  deadline: Date | string | null; status: string; stageName: string | null;
  myStatus: string; responseText: string | null; responseSubmittedAt: Date | string | null;
};

const statusTone = (s: string): StatusTone => (s === "completed" ? "green" : s === "under_review" ? "amber" : s === "rejected" ? "red" : "muted");
const prioTone = (p: string): StatusTone => (p === "urgent" || p === "high" ? "red" : p === "medium" ? "amber" : "muted");

function TaskRow({ task }: { task: StudioTask }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [openResp, setOpenResp] = useState(false);
  const [sharePending, startShare] = useTransition();
  // "Javob berilgan" holatini FAQAT status böyiça aniqlaymiz. Eski responseText'ga
  // qarab bölmaydi: xodim javobni rad etsa, status qayta in_progress böladi (lekin
  // eski matn qoladi) — studiya qayta javob yoza olishi kerak.
  const answered = task.myStatus === "under_review" || task.myStatus === "completed";
  // Rad etilgan/qayta soralgan: javob böyicha qaytarilgan, endi qayta yoziş kerak.
  const wasReturned = !answered && !!task.responseText;

  function send() {
    const val = text.trim();
    if (val.length < 1) return;
    start(async () => {
      try {
        await submitTaskResponse({ taskId: task.id, responseText: val });
        toast.success(t("contractor.tasks.responseSent"));
        setOpenResp(false);
        setText("");
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  function share() {
    startShare(async () => {
      try {
        await shareTaskToChat(task.id);
        toast.success(t("contractor.tasks.sharedToChat"));
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 break-words font-semibold">{task.title}</p>
        <StatusTag tone={prioTone(task.priority)} size="sm">{t(`tasks.priority.${task.priority}` as "tasks.priority.low")}</StatusTag>
        <StatusTag tone={statusTone(task.status)} size="sm">{t(`tasks.status.${task.status}` as "tasks.status.in_progress")}</StatusTag>
      </div>
      {task.stageName && <p className="mt-1 text-xs text-[var(--muted)]">{task.stageName}</p>}
      {task.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--foreground)]">{task.description}</p>}
      {task.deadline && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">{formatDate(task.deadline, locale)}</span>
          <DeadlineCountdown deadline={task.deadline} />
        </div>
      )}
      <div className="mt-2.5">
        <Button type="button" variant="ghost" size="sm" disabled={sharePending} onClick={share} className="h-8 px-2 text-[var(--primary)]">
          {sharePending ? <Loader className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
          {t("contractor.tasks.discussInChat")}
        </Button>
      </div>
      {answered ? (
        <div className="mt-2.5 rounded-lg bg-[var(--surface-2)] p-2.5 text-sm">
          <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-[var(--success)]"><CircleCheck className="size-3.5" />{t("contractor.tasks.answered")}</p>
          {task.responseText && <p className="whitespace-pre-wrap text-[var(--muted)]">{task.responseText}</p>}
        </div>
      ) : (
        <>
          {wasReturned && (
            <div className="mt-2.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/8 p-2.5 text-sm">
              <p className="text-xs font-semibold text-[var(--danger)]">{t("contractor.tasks.changesRequested")}</p>
              {task.responseText && <p className="mt-0.5 whitespace-pre-wrap text-[var(--muted)]">{task.responseText}</p>}
            </div>
          )}
          {openResp ? (
            <div className="mt-2.5 space-y-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("contractor.tasks.responsePlaceholder")} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenResp(false)}>{t("common.cancel")}</Button>
                <Button type="button" size="sm" disabled={pending || !text.trim()} onClick={send}>
                  {pending ? <Loader className="size-4 animate-spin" /> : t("contractor.tasks.respond")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenResp(true)}>{t("contractor.tasks.respond")}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function StudioTasksCard({ tasks }: { tasks: StudioTask[] }) {
  const t = useTranslations();
  if (tasks.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><ClipboardList className="size-4 text-[var(--muted)]" />{t("contractor.tasks.title")}</h3>
        <div className="space-y-2.5">
          {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      </CardContent>
    </Card>
  );
}
