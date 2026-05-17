"use client";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2 } from "lucide-react";
import { attachFileToTask, removeAttachment } from "@/server/actions/tasks";

type A = { id: string; fileUrl: string; fileName: string; fileSize: number | null };

export function AttachmentsSection({ taskId, attachments, canEdit }: { taskId: string; attachments: A[]; canEdit: boolean }) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    start(async () => {
      await attachFileToTask(taskId, f);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm rounded border px-3 py-1.5">
            <span className="flex-1 truncate">{a.fileName}</span>
            <span className="text-xs text-[var(--muted)]">{a.fileSize ? `${Math.round(a.fileSize / 1024)} KB` : ""}</span>
            <Button asChild variant="ghost" size="icon"><a href={a.fileUrl}><Download className="size-4" /></a></Button>
            {canEdit && (
              <Button variant="ghost" size="icon" disabled={pending} onClick={() => start(async () => { await removeAttachment(a.id, taskId); })}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
        {attachments.length === 0 && <li className="text-sm text-[var(--muted)]">{t("tasks.sections.noAttachments")}</li>}
      </ul>
      {canEdit && (
        <Input type="file" ref={fileRef} onChange={onPick} disabled={pending} />
      )}
    </div>
  );
}
