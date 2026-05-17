import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listTasks } from "@/server/queries/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";
import { Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusTab = "all" | "in_progress" | "under_review" | "completed";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const me = session.user;
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const canCreate = !["mutaxassis", "hr", "kontragent"].includes(me.position);
  const tab = ((get("tab") as StatusTab | undefined) ?? "all") as StatusTab;

  const allTasks = await listTasks({
    actorId: me.id,
    actorPosition: me.position,
    actorDepartmentId: me.departmentId,
    scope: "all",
    search: get("q"),
  });

  const filtered =
    tab === "all"
      ? allTasks
      : tab === "in_progress"
        ? allTasks.filter((x) => x.status === "in_progress" || x.status === "todo" || x.status === "rejected")
        : tab === "under_review"
          ? allTasks.filter((x) => x.status === "under_review")
          : allTasks.filter((x) => x.status === "completed");

  const counts = {
    all: allTasks.length,
    in_progress: allTasks.filter((x) => ["in_progress", "todo", "rejected"].includes(x.status)).length,
    under_review: allTasks.filter((x) => x.status === "under_review").length,
    completed: allTasks.filter((x) => x.status === "completed").length,
  };

  const TabBtn = ({ value, label, color }: { value: StatusTab; label: string; color: string }) => (
    <Link
      href={`/tasks?tab=${value}`}
      replace
      className={cn(
        "px-4 py-2 rounded-[8px] text-[14px] font-semibold transition-all flex items-center gap-2",
        tab === value
          ? `bg-[var(--background-elevated)] shadow-soft ${color}`
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      <span>{label}</span>
      <span className={cn(
        "text-[11px] rounded-full px-1.5 py-0 tabular font-bold",
        tab === value ? "bg-[var(--surface-3)]" : "bg-[var(--surface-3)] text-[var(--muted)]"
      )}>
        {counts[value]}
      </span>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-2">Ichki ijro</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("tasks.pageTitle")}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg">
            <a href={`/api/export/tasks?scope=mine`}><Download className="size-4" /> XLSX</a>
          </Button>
          {canCreate && (
            <Button asChild size="lg">
              <Link href="/tasks/new"><Plus className="size-4" /> {t("tasks.new")}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-[var(--surface-3)] rounded-[10px] p-1 w-fit">
        <TabBtn value="all" label={t("common.all")} color="text-[var(--foreground)]" />
        <TabBtn value="in_progress" label={t("status.in_progress")} color="text-[var(--primary)]" />
        <TabBtn value="under_review" label={t("status.under_review")} color="text-[var(--warning)]" />
        <TabBtn value="completed" label={t("status.completed")} color="text-[var(--success)]" />
      </div>

      <Card>
        <CardContent className="p-4">
          <TasksViewSwitcher tasks={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
