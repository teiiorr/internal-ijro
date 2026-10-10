import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listTasks, countTasks } from "@/server/queries/tasks";
import { Button } from "@/components/ui-biib/Button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";
import { IconPlus as Plus, IconDownload as Download, IconInbox as Inbox, IconSend as Send } from "@tabler/icons-react";
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

  const canCreate = me.position !== "kontragent"; // oçiq tayinlaş: har qanday içki xodim vazifa yaratişi mumkin
  const scope = ((get("scope") as Scope | undefined) ?? "mine") as Scope;
  const tab = ((get("tab") as StatusTab | undefined) ?? "all") as StatusTab;

  const base = { actorId: me.id, actorPosition: me.position, actorDepartmentId: me.departmentId, search: get("q") };
  const [scopedTasks, givenCount, mineCount] = await Promise.all([
    listTasks({ ...base, scope }),
    countTasks({ ...base, scope: "given" }),
    countTasks({ ...base, scope: "mine" }),
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
        "rounded-md px-1.5 py-0 text-[11px] font-bold tabular",
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
      aria-current={scope === value ? "page" : undefined}
      className={cn(
        "flex items-center justify-center gap-2 rounded-[9px] px-4 py-2 text-[14px] font-semibold transition-colors",
        scope === value
          ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-1)]"
          : "text-ink-2 hover:text-ink"
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      <span className={cn("rounded-md px-1.5 py-0 text-[11px] font-bold tabular", scope === value ? "bg-[var(--surface-3)] text-ink-2" : "bg-[var(--surface-2)] text-[var(--muted)]")}>
        {count}
      </span>
    </Link>
  );

  return (
    <div className="space-y-5 sm:space-y-6 stagger-children">
      <PageHeader
        title={t("tasks.pageTitle")}
        actions={
          <>
            <Button asChild variant="glass" size="40" icon={Download} className="max-sm:hidden">
              <a href={`/api/export/tasks?scope=${scope}`}>Excel</a>
            </Button>
            {canCreate && (
              <Button asChild variant="primary" size="40" icon={Plus}>
                <Link href="/tasks/new">{t("tasks.newTitle")}</Link>
              </Button>
            )}
          </>
        }
        tools={
          <div className="inline-flex items-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
            <ScopeTab value="mine" label={t("tasks.scope.mine")} icon={Inbox} count={mineCount} />
            <ScopeTab value="given" label={t("tasks.scope.given")} icon={Send} count={givenCount} />
          </div>
        }
      />

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
