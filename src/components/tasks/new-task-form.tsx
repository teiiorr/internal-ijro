"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/server/actions/tasks";

type Person = { id: string; fullName: string; position: string };
type Project = { id: string; name: string };
type Task = { id: string; title: string };

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const RECUR = ["", "daily", "weekly", "monthly"] as const;

export function NewTaskForm({ assignees, projects, candidateDeps }: { assignees: Person[]; projects: Project[]; candidateDeps: Task[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deps, setDeps] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string>("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const deadlineStr = String(fd.get("deadline") ?? "");
    start(async () => {
      try {
        const res = await createTask({
          title: String(fd.get("title") ?? ""),
          description: (fd.get("description") as string) || null,
          assignedToUserId: String(fd.get("assignedToUserId") ?? ""),
          projectId: (fd.get("projectId") as string) || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          priority: (fd.get("priority") as any) ?? "medium",
          deadline: deadlineStr ? new Date(deadlineStr).toISOString() : null,
          dependsOnIds: deps.length > 0 ? deps : undefined,
          isRecurring,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recurrenceRule: isRecurring && recurrenceRule ? (recurrenceRule as any) : null,
        });
        router.push(`/tasks/${res.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="title">{t("tasks.fields.title")}</Label>
        <Input id="title" name="title" required minLength={2} maxLength={500} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("tasks.fields.description")}</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("tasks.fields.assignee")}</Label>
          <Select name="assignedToUserId" required>
            <SelectTrigger><SelectValue placeholder={t("tasks.fields.pickAssignee")} /></SelectTrigger>
            <SelectContent>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.fullName} ({a.position})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("tasks.fields.project")}</Label>
          <Select name="projectId">
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("tasks.fields.priority")}</Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline">{t("tasks.fields.deadline")}</Label>
          <Input id="deadline" name="deadline" type="datetime-local" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("tasks.fields.dependsOn")}</Label>
        <div className="max-h-48 overflow-y-auto rounded-lg border p-2 space-y-1">
          {candidateDeps.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("common.noResults")}</p>
          ) : (
            candidateDeps.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deps.includes(t.id)}
                  onChange={(e) => setDeps((d) => e.target.checked ? [...d, t.id] : d.filter((x) => x !== t.id))}
                />
                <span>{t.title}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2 border rounded-lg p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          <span>{t("tasks.fields.recurring")}</span>
        </label>
        {isRecurring && (
          <div className="space-y-1.5">
            <Label>{t("tasks.fields.repeat")}</Label>
            <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
              <SelectTrigger><SelectValue placeholder="Choose interval" /></SelectTrigger>
              <SelectContent>
                {RECUR.filter(Boolean).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <Button type="submit" disabled={pending}>{t("tasks.new")}</Button>
    </form>
  );
}
