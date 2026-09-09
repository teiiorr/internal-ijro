import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listTasks } from "@/server/queries/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StatusTab = "all" | "in_progress" | "under_review" | "completed";

// Studiya uçun alohida "Vazifalar" bölimi — xodimlardagi Vazifalar körinişi bilan
// bir xil (Röyxat/Kalendar + jadval). Studiya faqat öziga tayinlangan vazifalarni
// köradi (scope="mine").
export default async function ContractorTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const me = session.user;
  const sp = await searchParams;
  const tab = ((typeof sp.tab === "string" ? sp.tab : undefined) as StatusTab | undefined) ?? "all";

  const tasks = await listTasks({
    actorId: me.id,
    actorPosition: me.position,
    actorDepartmentId: me.departmentId,
    scope: "mine",
    search: typeof sp.q === "string" ? sp.q : undefined,
  });

  const filtered =
    tab === "all"
      ? tasks
      : tab === "in_progress"
        ? tasks.filter((x) => x.status === "in_progress" || x.status === "todo" || x.status === "rejected")
        : tab === "under_review"
          ? tasks.filter((x) => x.status === "under_review")
          : tasks.filter((x) => x.status === "completed");

  const counts = {
    all: tasks.length,
    in_progress: tasks.filter((x) => ["in_progress", "todo", "rejected"].includes(x.status)).length,
    under_review: tasks.filter((x) => x.status === "under_review").length,
    completed: tasks.filter((x) => x.status === "completed").length,
  };

  const TabBtn = ({ value, label, color }: { value: StatusTab; label: string; color: string }) => (
    <Link
      href={`/contractor/tasks?tab=${value}`}
      replace
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition-all sm:px-4 sm:text-[14px]",
        tab === value ? `bg-[var(--surface)] shadow-[var(--shadow-1)] ${color}` : "text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      <span>{label}</span>
      <span className={cn("rounded-full bg-[var(--surface-3)] px-1.5 py-0 text-[11px] font-bold tabular-nums", tab !== value && "text-[var(--muted)]")}>
        {counts[value]}
      </span>
    </Link>
  );

  return (
    <div className="space-y-5 stagger-children sm:space-y-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("nav.tasks")}</h1>

      <div className="-mx-1 flex gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 px-1 scrollbar-thin">
        <TabBtn value="all" label={t("common.all")} color="text-[var(--foreground)]" />
        <TabBtn value="in_progress" label={t("status.in_progress")} color="text-[var(--primary)]" />
        <TabBtn value="under_review" label={t("status.under_review")} color="text-[var(--warning)]" />
        <TabBtn value="completed" label={t("status.completed")} color="text-[var(--success)]" />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <TasksViewSwitcher tasks={filtered} hrefBase="/contractor/tasks" />
        </CardContent>
      </Card>
    </div>
  );
}
