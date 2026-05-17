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

type Person = { id: string; fullName: string; position: string };
type Project = { id: string; name: string };

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function NewTaskForm({ assignees, projects }: { assignees: Person[]; projects: Project[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        });
        router.push(`/tasks/${res.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">{t("tasks.fields.title")}</Label>
        <Input id="title" name="title" required minLength={2} maxLength={500} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("tasks.fields.description")}</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label>{t("tasks.fields.project")}</Label>
          <Select name="projectId">
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
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
        <div className="space-y-2">
          <Label htmlFor="deadline">{t("tasks.fields.deadline")}</Label>
          <Input id="deadline" name="deadline" type="datetime-local" />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <Button type="submit" disabled={pending} size="lg">{t("tasks.new")}</Button>
    </form>
  );
}
