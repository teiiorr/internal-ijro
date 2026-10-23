"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/server/actions/tasks";
import { EmployeePicker, type PickerPerson } from "@/components/ui/employee-picker";
import { shortName } from "@/lib/names";
import { AttachmentDropzone, QueuedFileList, useAttachmentQueue } from "@/components/tasks/attachment-queue";
import { IconFolder as Folder } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Person = PickerPerson;
type Project = { id: string; name: string };

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function NewTaskForm({ assignees, projects, maxBytes, taskTypes = [] }: { assignees: Person[]; projects: Project[]; maxBytes: number; taskTypes?: string[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Topşiriq loyihaga tegişli bölmasligi ham mumkin: tumbler yoqilgandagina loyiha tanlanadi.
  const [byProject, setByProject] = useState(false);
  const [projectId, setProjectId] = useState("");
  const switchId = useId();
  const typesListId = useId();
  const files = useAttachmentQueue({ maxBytes });
  // Yuklaş paytida foydalanuvçi boşqa sahifaga ötib ketsa, tugagandan keyin uni bu yerga qaytarmaymiz.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function toggle(id: string) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (selectedIds.length === 0) {
      setError(t("tasks.new.selectAssigneeError"));
      return;
    }
    if (byProject && !projectId) {
      setError(t("tasks.new.selectProjectError"));
      return;
    }
    const fd = new FormData(e.currentTarget);
    const deadlineStr = String(fd.get("deadline") ?? "");
    start(async () => {
      try {
        const [primary, ...rest] = selectedIds;
        const res = await createTask({
          title: String(fd.get("title") ?? ""),
          description: (fd.get("description") as string) || null,
          assignedToUserId: primary,
          additionalAssigneeIds: rest,
          projectId: byProject && projectId ? projectId : null,
          documentNumber: String(fd.get("documentNumber") ?? "").trim() || null,
          taskType: String(fd.get("taskType") ?? "").trim() || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          priority: (fd.get("priority") as any) ?? "medium",
          deadline: deadlineStr ? new Date(deadlineStr).toISOString() : null,
        });
        if (!res.ok) {
          setError(t(`common.actionErrors.${res.error}` as "common.actionErrors.not_found"));
          return;
        }
        // Topşiriq yaratildi: biriktirilgan hujjatlarni ketma-ket yuklaymiz (har biri progress bilan).
        if (files.items.length > 0) {
          const r = await files.uploadAll(res.id);
          if (r.failed > 0) toast.error(t("tasks.attachments.someFailed", { count: r.failed }));
        }
        if (mounted.current) router.push(`/tasks/${res.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid max-w-2xl grid-cols-1 gap-5">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="title">{t("tasks.fields.title")}</Label>
          <Input id="title" name="title" required minLength={2} maxLength={500} />
        </div>
        {/* Topşiriq turi va hujjat raqami: sarlavhadan keyin darhol, ikkalasi ham ixtiyoriy */}
        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="taskType">
              {t("tasks.fields.taskType")} <span className="font-normal text-[var(--ink-3)]">{t("tasks.fields.optional")}</span>
            </Label>
            <Input
              id="taskType"
              name="taskType"
              list={typesListId}
              maxLength={100}
              autoComplete="off"
              placeholder={t("tasks.fields.taskTypePlaceholder")}
            />
            <datalist id={typesListId}>
              {taskTypes.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="documentNumber">
              {t("tasks.fields.documentNumber")} <span className="font-normal text-[var(--ink-3)]">{t("tasks.fields.optional")}</span>
            </Label>
            <Input
              id="documentNumber"
              name="documentNumber"
              maxLength={100}
              autoComplete="off"
              placeholder={t("tasks.fields.documentNumberPlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("tasks.fields.description")}</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>

        {/* Hujjatlar: topşiriq bilan birga ijroçiga beriladigan PDF, Word va boşqa fayllar */}
        <div className="min-w-0 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="task-files">{t("tasks.attachments.title")}</Label>
            {files.items.length > 0 && (
              <span className="t-micro font-medium tabular-nums text-[var(--ink-3)]">
                {t("tasks.attachments.count", { count: files.items.length })}
              </span>
            )}
          </div>
          <QueuedFileList items={files.items} onRemove={files.busy || pending ? undefined : files.remove} />
          <AttachmentDropzone
            id="task-files"
            onFiles={files.add}
            maxBytes={maxBytes}
            disabled={files.busy || pending}
            compact={files.items.length > 0}
          />
          <p className="t-micro text-[var(--ink-3)]">{t("tasks.attachments.formHint")}</p>
        </div>
      </div>

      {/* Ijroçi tanlagiç — katta xodim kartalari */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label>{t("tasks.fields.assignees")}</Label>
        </div>
        <EmployeePicker
          people={assignees}
          selectedIds={selectedIds}
          onToggle={toggle}
          primaryFirst
          formatName={shortName}
          positionLabel={(pos) => t(`positions.${pos}` as "positions.direktor")}
        />
        <p className="t-micro text-[var(--ink-3)]">{t("tasks.new.primaryAssigneeHint")}</p>
      </div>

      {/* Loyiha: tumbler öçiq bölsa topşiriq heç qaysi loyihaga boğlanmaydi */}
      <div className="max-w-2xl space-y-3">
        <button
          type="button"
          role="switch"
          aria-checked={byProject}
          aria-labelledby={`${switchId}-label`}
          aria-describedby={`${switchId}-hint`}
          onClick={() => setByProject((v) => !v)}
          className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--tint)_6%,var(--surface-2))]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Folder className="size-5 shrink-0 text-[var(--tint)]" aria-hidden />
            <span className="min-w-0">
              <span id={`${switchId}-label`} className="block text-sm font-semibold text-[var(--ink)]">{t("tasks.new.byProject")}</span>
              <span id={`${switchId}-hint`} className="block t-micro text-[var(--ink-3)]">{byProject ? t("tasks.new.byProjectOn") : t("tasks.new.byProjectOff")}</span>
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-[var(--dur-ui)]",
              byProject ? "bg-[var(--tint)]" : "bg-[color-mix(in_oklab,var(--ink-3)_35%,transparent)]",
            )}
          >
            <span
              className={cn(
                "inline-block size-5 rounded-full bg-white shadow-[var(--shadow-raised)] transition-transform duration-[var(--dur-ui)]",
                byProject ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </span>
        </button>
        {byProject && (
          <div className="space-y-2">
            <Label>{t("tasks.fields.project")}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger aria-label={t("tasks.fields.project")}><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label>{t("tasks.fields.priority")}</Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(`tasks.priority.${p}` as "tasks.priority.low")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="deadline">{t("tasks.fields.deadline")}</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>

      {error && <p className="t-small text-[var(--danger)]">{error}</p>}

      {/* Submit — butun formadan keyin; mobil qurilmada pastda yopişib turadi (safe-area hisobga olingan) */}
      <div className="sticky bottom-0 -mx-5 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pb-0">
        <div className="flex justify-end">
          <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
            {files.busy
              ? t("tasks.attachments.uploadingCount", { done: files.done, total: files.items.length })
              : t("tasks.newTitle")}
          </Button>
        </div>
      </div>
    </form>
  );
}
