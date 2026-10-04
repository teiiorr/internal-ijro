"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPencil, IconUserPlus, IconX, IconLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeePicker, type PickerPerson } from "@/components/ui/employee-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/permissions/tasks";
import { localizeName, shortName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { addTaskAssignees, removeTaskAssignee, updateTask } from "@/server/actions/task-edits";
import { errorMessageKey, type TaskEditResult } from "./task-edit-logic";

export type EditTaskButtonProps = {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    /** Tashkent calendar date 'YYYY-MM-DD' or null. */
    deadlineDate: string | null;
    status: string;
  };
  assignees: Array<{
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    status: string;
    hasResponse: boolean;
  }>;
  people: PickerPerson[];
};

const asPriority = (p: string): TaskPriority =>
  (TASK_PRIORITIES as readonly string[]).includes(p) ? (p as TaskPriority) : "medium";

export function EditTaskButton({ task, assignees, people }: EditTaskButtonProps) {
  const t = useTranslations("staffX.taskEdit");
  const tr = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(asPriority(task.priority));
  const [deadline, setDeadline] = useState(task.deadlineDate ?? "");
  const [picks, setPicks] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();

  const completed = task.status === "completed";
  const currentIds = useMemo(() => new Set(assignees.map((a) => a.userId)), [assignees]);
  const candidates = useMemo(() => people.filter((p) => !currentIds.has(p.id)), [people, currentIds]);

  function resetForm() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(asPriority(task.priority));
    setDeadline(task.deadlineDate ?? "");
    setPicks([]);
    setShowPicker(false);
  }

  function onOpenChange(next: boolean) {
    if (next) resetForm();
    setOpen(next);
  }

  function failMessage(res: Extract<TaskEditResult, { ok: false }>) {
    return t(errorMessageKey(res.error), { name: res.detail ?? "" });
  }

  function togglePick(id: string) {
    setPicks((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    startSave(async () => {
      try {
        const res = await updateTask({
          taskId: task.id,
          title: title.trim(),
          description: description.trim() ? description : null,
          priority,
          deadlineDate: deadline || null,
        });
        if (!res.ok) {
          toast.error(failMessage(res));
          return;
        }
        if (picks.length > 0 && !completed) {
          const added = await addTaskAssignees(task.id, picks);
          if (!added.ok) {
            toast.error(failMessage(added));
            router.refresh();
            return;
          }
        }
        toast.success(t("saved"));
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(t("errors.generic"), { description: (err as Error).message });
      }
    });
  }

  function onRemove(userId: string) {
    if (!window.confirm(t("removeConfirm"))) return;
    setRemovingId(userId);
    startRemove(async () => {
      try {
        const res = await removeTaskAssignee(task.id, userId);
        if (!res.ok) {
          toast.error(failMessage(res));
          return;
        }
        toast.success(t("saved"));
        router.refresh();
      } catch (err) {
        toast.error(t("errors.generic"), { description: (err as Error).message });
      } finally {
        setRemovingId(null);
      }
    });
  }

  const busy = saving || removing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">
          <IconPencil className="size-4" /> {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl p-5 sm:p-7">
        <DialogHeader className="pr-10">
          <DialogTitle>{t("editTitle")}</DialogTitle>
          {completed && (
            <DialogDescription className="flex items-start gap-1.5">
              <IconLock className="mt-0.5 size-4 shrink-0" /> <span className="min-w-0">{t("completedOnlyDescription")}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={onSave} className="min-w-0 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="te-title">{t("fieldTitle")}</Label>
            <Input
              id="te-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={2}
              maxLength={500}
              required
              disabled={completed}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="te-desc">{t("fieldDescription")}</Label>
            <Textarea
              id="te-desc"
              rows={5}
              maxLength={20000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label>{t("fieldPriority")}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(asPriority(v))} disabled={completed}>
                <SelectTrigger aria-label={t("fieldPriority")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tr(`tasks.priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="te-deadline">{t("fieldDeadline")}</Label>
              <Input
                id="te-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={completed}
              />
            </div>
          </div>

          {!completed && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>{t("assignees")}</Label>
                <span className="text-xs font-semibold tabular text-[var(--muted)]">{assignees.length}</span>
              </div>

              <ul className="flex flex-wrap gap-2">
                {assignees.map((a) => {
                  const locked = a.hasResponse || a.status === "under_review" || a.status === "completed";
                  const lastOne = assignees.length <= 1;
                  const blocked = locked || lastOne;
                  const hint = locked ? t("cannotRemoveResponded") : lastOne ? t("lastAssignee") : t("removeAssignee");
                  return (
                    <li
                      key={a.userId}
                      className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] py-1 pl-1 pr-1.5"
                    >
                      <UserAvatar name={a.fullName} avatarUrl={a.avatarUrl} size="xs" clickable={false} />
                      <span className="min-w-0 truncate text-sm font-semibold">{localizeName(a.fullName, locale)}</span>
                      <span title={hint} className="shrink-0">
                        <button
                          type="button"
                          aria-label={`${t("removeAssignee")}: ${shortName(a.fullName)}`}
                          disabled={blocked || busy}
                          onClick={() => onRemove(a.userId)}
                          className={cn(
                            "grid size-7 place-items-center rounded-full text-[var(--muted)] transition-colors",
                            "hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]",
                            "disabled:pointer-events-none disabled:opacity-40",
                            removingId === a.userId && "animate-pulse"
                          )}
                        >
                          <IconX className="size-4" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>

              {picks.length > 0 && (
                <p className="text-xs font-semibold text-[var(--primary)]">{t("selectedNew", { count: picks.length })}</p>
              )}

              <Button
                type="button"
                variant={showPicker ? "secondary" : "soft"}
                size="sm"
                onClick={() => setShowPicker((v) => !v)}
                disabled={candidates.length === 0}
              >
                <IconUserPlus className="size-4" /> {showPicker ? tr("common.close") : t("addAssignee")}
              </Button>

              {showPicker && (
                <div className="max-h-[45vh] overflow-y-auto overscroll-contain rounded-2xl pr-1">
                  <EmployeePicker
                    people={candidates}
                    selectedIds={picks}
                    onToggle={togglePick}
                    formatName={shortName}
                    positionLabel={(pos) => tr(`positions.${pos}`)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {tr("common.cancel")}
            </Button>
            <Button type="submit" disabled={busy || title.trim().length < 2}>
              {tr("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
