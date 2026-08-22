"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/server/actions/tasks";
import { EmployeePicker, type PickerPerson } from "@/components/ui/employee-picker";
import { shortName } from "@/lib/names";

type Person = PickerPerson;
type Project = { id: string; name: string };

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function NewTaskForm({ assignees, projects }: { assignees: Person[]; projects: Project[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
          projectId: (fd.get("projectId") as string) || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          priority: (fd.get("priority") as any) ?? "medium",
          deadline: deadlineStr ? new Date(deadlineStr).toISOString() : null,
        });
        router.push(`/tasks/${res.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid max-w-2xl grid-cols-1 gap-5">
        <div className="space-y-2">
          <Label htmlFor="title">{t("tasks.fields.title")}</Label>
          <Input id="title" name="title" required minLength={2} maxLength={500} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("tasks.fields.description")}</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>
      </div>

      {/* Assignee picker — large employee cards */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label>{t("tasks.fields.assignees")}</Label>
          {selectedIds.length > 0 && (
            <span className="text-xs font-medium text-[var(--muted)]">
              {t("tasks.new.selectedCount", { n: selectedIds.length })}
            </span>
          )}
        </div>
        <EmployeePicker
          people={assignees}
          selectedIds={selectedIds}
          onToggle={toggle}
          primaryFirst
          formatName={shortName}
          positionLabel={(pos) => t(`positions.${pos}` as "positions.direktor")}
        />
        <p className="text-xs text-[var(--muted)]">{t("tasks.new.primaryAssigneeHint")}</p>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("tasks.fields.project")}</Label>
          <Select name="projectId">
            <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("tasks.fields.priority")}</Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(`tasks.priority.${p}` as "tasks.priority.low")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="deadline">{t("tasks.fields.deadline")}</Label>
          <Input id="deadline" name="deadline" type="datetime-local" />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

      {/* Submit — after the whole form; sticky at the bottom on mobile (safe-area aware) */}
      <div className="sticky bottom-0 -mx-5 border-t border-[var(--border)] bg-[var(--card)]/85 px-5 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pb-0 sm:backdrop-blur-none">
        <div className="flex justify-end">
          <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
            {t("tasks.newTitle")}
          </Button>
        </div>
      </div>
    </form>
  );
}
