import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listTasks } from "@/server/queries/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";
import { Plus, Download, Inbox, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Scope = "mine" | "given";
type StatusTab = "all" | "in_progress" | "under_review" | "completed";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const me = session.user;
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const canCreate = !["mutaxassis", "hr", "kontragent"].includes(me.position);
  const scope = ((get("scope") as Scope | undefined) ?? "mine") as Scope;
  const tab = ((get("tab") as StatusTab | undefined) ?? "all") as StatusTab;

  const [scopedTasks, givenCount, mineCount] = await Promise.all([
    listTasks({ actorId: me.id, actorPosition: me.position, actorDepartmentId: me.departmentId, scope, search: get("q") }),
    listTasks({ actorId: me.id, actorPosition: me.position, actorDepartmentId: me.departmentId, scope: "given", search: get("q") }).then((r) => r.length),
    listTasks({ actorId: me.id, actorPosition: me.position, actorDepartmentId: me.departmentId, scope: "mine", search: get("q") }).then((r) => r.length),
  ]);

  const filtered =
    tab === "all"
      ? scopedTasks
      : tab === "in_progress"
        ? scopedTasks.filter((x) => x.status === "in_progress" || x.status === "todo" || x.status === "rejected")
        : tab === "under_review"
          ? scopedTasks.filter((x) => x.status === "under_review")
          : scopedTasks.filter((x) => x.status === "completed");

  const counts = {
    all: scopedTasks.length,
    in_progress: scopedTasks.filter((x) => ["in_progress", "todo", "rejected"].includes(x.status)).length,
    under_review: scopedTasks.filter((x) => x.status === "under_review").length,
    completed: scopedTasks.filter((x) => x.status === "completed").length,
  };

  const StatusTabBtn = ({ value, label, color }: { value: StatusTab; label: string; color: string }) => (
    <Link
      href={`/tasks?scope=${scope}&tab=${value}`}
      replace
      className={cn(
        "px-3 sm:px-4 py-2 rounded-[8px] text-[13px] sm:text-[14px] font-semibold transition-all flex items-center gap-2 shrink-0",
        tab === value
          ? `bg-[var(--surface)] shadow-[var(--shadow-1)] ${color}`
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      <span>{label}</span>
      <span className={cn(
        "text-[11px] rounded-full px-1.5 py-0 tabular font-bold",
        "bg-[var(--surface-3)]",
        tab !== value && "text-[var(--muted)]"
      )}>
        {counts[value]}
      </span>
    </Link>
  );

  const ScopeTab = ({ value, label, icon: Icon, count }: { value: Scope; label: string; icon: React.ComponentType<{ className?: string }>; count: number }) => (
    <Link
      href={`/tasks?scope=${value}`}
      replace
      className={cn(
        "flex-1 sm:flex-initial px-4 py-2.5 rounded-[10px] text-[14px] font-semibold transition-all flex items-center justify-center gap-2",
        scope === value
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-1)]"
          : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      <span className={cn(
        "text-[11px] rounded-full px-1.5 py-0 tabular font-bold",
        scope === value ? "bg-white/20 text-white" : "bg-[var(--surface)] text-[var(--muted)]"
      )}>
        {count}
      </span>
    </Link>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-1.5 sm:mb-2">{t("app.name")}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("tasks.pageTitle")}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg" className="hidden sm:inline-flex">
            <a href={`/api/export/tasks?scope=${scope}`}><Download className="size-4" /> XLSX</a>
          </Button>
          {canCreate && (
            <Button asChild size="lg">
              <Link href="/tasks/new"><Plus className="size-4" /> <span className="hidden sm:inline">{t("tasks.new")}</span><span className="sm:hidden">Yangi</span></Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <ScopeTab value="mine" label={t("tasks.scope.mine")} icon={Inbox} count={mineCount} />
        <ScopeTab value="given" label={t("tasks.scope.given")} icon={Send} count={givenCount} />
      </div>

      <div className="flex gap-1 bg-[var(--surface-3)] rounded-[10px] p-1 overflow-x-auto -mx-1 px-1 scrollbar-thin">
        <StatusTabBtn value="all" label={t("common.all")} color="text-[var(--foreground)]" />
        <StatusTabBtn value="in_progress" label={t("status.in_progress")} color="text-[var(--primary)]" />
        <StatusTabBtn value="under_review" label={t("status.under_review")} color="text-[var(--warning)]" />
        <StatusTabBtn value="completed" label={t("status.completed")} color="text-[var(--success)]" />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <TasksViewSwitcher tasks={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
