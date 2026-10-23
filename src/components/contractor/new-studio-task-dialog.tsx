"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconClipboardPlus as ClipboardPlus, IconLoader2 as Loader } from "@tabler/icons-react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createStudioTask } from "@/server/actions/tasks";
import { AttachmentDropzone, QueuedFileList, useAttachmentQueue } from "@/components/tasks/attachment-queue";
import { TASK_TYPE_SEEDS } from "@/lib/tasks/task-types";

type Stage = { id: string; name: string; orderIndex: number; status: string };
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/**
 * "Studiyalar" bölimidan studiyaga vazifa (Vazifa) beriş dialogi. Ijroçi tanlanmaydi
 * — vazifa avtomatik şu loyiha studiyasiga tayinlanadi. Bosqiç tanlagichi standart
 * holda joriy (faol) bosqichni körsatadi.
 */
export function NewStudioTaskDialog({
  projectId,
  stages,
  defaultStageId,
  maxBytes,
}: {
  projectId: string;
  stages: Stage[];
  defaultStageId?: string | null;
  maxBytes: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const initialStage = defaultStageId ?? stages.find((s) => s.status === "active")?.id ?? stages[0]?.id ?? "";
  const [stageId, setStageId] = useState<string>(initialStage);
  const [priority, setPriority] = useState<string>("medium");
  const [error, setError] = useState<string | null>(null);
  const files = useAttachmentQueue({ maxBytes });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim() || null;
    const deadlineStr = String(fd.get("deadline") ?? "");
    if (title.length < 2) { setError(t("tasks.studioTask.titleRequired")); return; }
    start(async () => {
      try {
        const res = await createStudioTask({
          projectId,
          stageId: stageId || null,
          title,
          description,
          priority: priority as (typeof PRIORITIES)[number],
          deadline: deadlineStr ? new Date(deadlineStr).toISOString() : null,
          documentNumber: String(fd.get("documentNumber") ?? "").trim() || null,
          taskType: String(fd.get("taskType") ?? "").trim() || null,
        });
        if (!res.ok) {
          setError(t(`common.actionErrors.${res.error}` as "common.actionErrors.not_found"));
          return;
        }
        // Vazifa yaratildi: biriktirilgan hujjatlarni ketma-ket yuklaymiz.
        if (files.items.length > 0) {
          const r = await files.uploadAll(res.id);
          if (r.failed > 0) toast.error(t("tasks.attachments.someFailed", { count: r.failed }));
        }
        toast.success(t("tasks.studioTask.created"));
        files.reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Vazifa yaratilayotganda va yuklaş davomida dialog yopilmaydi; yopilganda tanlangan fayllar unutiladi.
        if (!next && (files.busy || pending)) return;
        if (!next) files.reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><ClipboardPlus className="size-4" />{t("tasks.studioTask.new")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{t("tasks.studioTask.dialogTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="min-w-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-title">{t("tasks.fields.title")}</Label>
            <Input id="st-title" name="title" required minLength={2} maxLength={500} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-docnum">
              {t("tasks.fields.documentNumber")} <span className="font-normal text-[var(--ink-3)]">{t("tasks.fields.optional")}</span>
            </Label>
            <Input id="st-docnum" name="documentNumber" maxLength={100} autoComplete="off" placeholder={t("tasks.fields.documentNumberPlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-type">
              {t("tasks.fields.taskType")} <span className="font-normal text-[var(--ink-3)]">{t("tasks.fields.optional")}</span>
            </Label>
            <Input id="st-type" name="taskType" list="st-type-list" maxLength={100} autoComplete="off" placeholder={t("tasks.fields.taskTypePlaceholder")} />
            <datalist id="st-type-list">
              {TASK_TYPE_SEEDS.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-desc">{t("tasks.fields.description")}</Label>
            <Textarea id="st-desc" name="description" rows={3} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="st-files">{t("tasks.attachments.title")}</Label>
            <QueuedFileList items={files.items} onRemove={files.busy || pending ? undefined : files.remove} />
            <AttachmentDropzone
              id="st-files"
              onFiles={files.add}
              maxBytes={maxBytes}
              disabled={files.busy || pending}
              compact={files.items.length > 0}
            />
          </div>
          {stages.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("tasks.studioTask.stage")}</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.orderIndex + 1}. {s.name}{s.status === "active" ? " •" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="t-micro text-[var(--ink-3)]">{t("tasks.studioTask.stageHint")}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label>{t("tasks.fields.priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{t(`tasks.priority.${p}` as "tasks.priority.low")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="st-deadline">{t("tasks.fields.deadline")}</Label>
              <Input id="st-deadline" name="deadline" type="date" />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost" disabled={files.busy || pending}>{t("common.cancel")}</Button></DialogClose>
            <Button type="submit" disabled={pending}>
              {files.busy ? (
                <>
                  <Loader className="size-4 animate-spin" />
                  {t("tasks.attachments.uploadingCount", { done: files.done, total: files.items.length })}
                </>
              ) : pending ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                t("common.create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
