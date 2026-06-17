"use client";
import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/server/actions/tasks";
import { X, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Person = { id: string; fullName: string; position: string };
type Project = { id: string; name: string };

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function NewTaskForm({ assignees, projects }: { assignees: Person[]; projects: Project[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedPeople = useMemo(
    () => selectedIds.map((id) => assignees.find((a) => a.id === id)).filter(Boolean) as Person[],
    [selectedIds, assignees]
  );

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assignees.filter((a) =>
      !selectedIds.includes(a.id) &&
      (term === "" || a.fullName.toLowerCase().includes(term))
    );
  }, [assignees, selectedIds, search]);

  function toggle(id: string) {
    setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
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
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">{t("tasks.fields.title")}</Label>
        <Input id="title" name="title" required minLength={2} maxLength={500} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("tasks.fields.description")}</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>

      <div className="space-y-2">
        <Label>{t("tasks.fields.assignees")}</Label>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          {selectedPeople.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedPeople.map((p, i) => (
                <div key={p.id} className={cn(
                  "inline-flex items-center gap-2 rounded-sm px-2.5 py-1 text-sm font-medium",
                  i === 0
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]"
                )}>
                  {p.fullName}
                  <button type="button" onClick={() => toggle(p.id)} className="opacity-70 hover:opacity-100">
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("tasks.new.noAssignees")}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen((v) => !v)}>
              <Plus className="size-4" /> {t("tasks.new.addAssigneeBtn")}
            </Button>
          </div>
          {pickerOpen && (
            <div className="mt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
                <input
                  placeholder={t("common.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] pl-10 pr-3 text-[15px] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:ring-4 focus-visible:ring-[var(--primary)]/15"
                />
              </div>
              <div className="max-h-56 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)]/70 divide-y divide-[var(--border)]/60">
                {filteredCandidates.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { toggle(p.id); setSearch(""); }}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--surface-3)] text-sm transition-colors"
                  >
                    <span className="font-semibold">{p.fullName}</span>
                    <span className="text-[var(--muted)] ml-2 text-xs">{t(`positions.${p.position}` as "positions.direktor")}</span>
                  </button>
                ))}
                {filteredCandidates.length === 0 && (
                  <p className="text-center text-[var(--muted)] text-sm py-4">{t("common.noResults")}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--muted)]">{t("tasks.new.primaryAssigneeHint")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
      <Button type="submit" disabled={pending} size="lg">{t("tasks.new")}</Button>
    </form>
  );
}
