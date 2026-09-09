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
}: {
  projectId: string;
  stages: Stage[];
  defaultStageId?: string | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const initialStage = defaultStageId ?? stages.find((s) => s.status === "active")?.id ?? stages[0]?.id ?? "";
  const [stageId, setStageId] = useState<string>(initialStage);
  const [priority, setPriority] = useState<string>("medium");
  const [error, setError] = useState<string | null>(null);

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
        await createStudioTask({
          projectId,
          stageId: stageId || null,
          title,
          description,
          priority: priority as (typeof PRIORITIES)[number],
          deadline: deadlineStr ? new Date(deadlineStr).toISOString() : null,
        });
        toast.success(t("tasks.studioTask.created"));
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><ClipboardPlus className="size-4" />{t("tasks.studioTask.new")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t("tasks.studioTask.dialogTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-title">{t("tasks.fields.title")}</Label>
            <Input id="st-title" name="title" required minLength={2} maxLength={500} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-desc">{t("tasks.fields.description")}</Label>
            <Textarea id="st-desc" name="description" rows={3} />
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
              <p className="text-xs text-[var(--muted)]">{t("tasks.studioTask.stageHint")}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="st-deadline">{t("tasks.fields.deadline")}</Label>
              <Input id="st-deadline" name="deadline" type="date" />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-[var(--danger)]">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">{t("common.cancel")}</Button></DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader className="size-4 animate-spin" /> : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
