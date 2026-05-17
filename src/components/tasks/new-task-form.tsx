"use client";
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

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function NewTaskForm({ assignees, projects }: { assignees: Person[]; projects: Project[] }) {
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
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required minLength={2} maxLength={500} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Assignee</Label>
          <Select name="assignedToUserId" required>
            <SelectTrigger><SelectValue placeholder="Pick assignee" /></SelectTrigger>
            <SelectContent>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.fullName} ({a.position})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select name="projectId">
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" name="deadline" type="datetime-local" />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <Button type="submit" disabled={pending}>Create task</Button>
    </form>
  );
}
