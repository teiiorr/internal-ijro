import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listTasks, countTasks } from "@/server/queries/tasks";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented, type SegmentedItem } from "@/components/ui-biib/Segmented";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";
import { TasksSearch } from "@/components/tasks/tasks-search";
import { TasksOverflowMenu } from "@/components/tasks/tasks-overflow-menu";
import { IconPlus as Plus } from "@tabler/icons-react";

type Scope = "mine" | "given";
type StatusTab = "all" | "in_progress" | "under_review" | "completed";

const SCROLL = "max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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
  const q = get("q");

  const base = { actorId: me.id, actorPosition: me.position, actorDepartmentId: me.departmentId, search: q };
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

  // Sarhisob — plita/kapsula emas, yorliq yonidagi xotirjam matn.
  const withCount = (label: string, n: number): SegmentedItem["label"] => (
    <>
      {label}
      <span className="t-micro tabular-nums text-[var(--ink-3)]">{n}</span>
    </>
  );

  const qSuffix = q ? `&q=${encodeURIComponent(q)}` : "";
  const scopeItems: SegmentedItem[] = [
    { href: `/tasks?scope=mine${qSuffix}`, active: scope === "mine", label: withCount(t("tasks.scope.mine"), mineCount) },
    { href: `/tasks?scope=given${qSuffix}`, active: scope === "given", label: withCount(t("tasks.scope.given"), givenCount) },
  ];
  const statusItems: SegmentedItem[] = [
    { href: `/tasks?scope=${scope}&tab=all${qSuffix}`, active: tab === "all", label: withCount(t("common.all"), counts.all) },
    { href: `/tasks?scope=${scope}&tab=in_progress${qSuffix}`, active: tab === "in_progress", label: withCount(t("status.in_progress"), counts.in_progress) },
    { href: `/tasks?scope=${scope}&tab=under_review${qSuffix}`, active: tab === "under_review", label: withCount(t("status.under_review"), counts.under_review) },
    { href: `/tasks?scope=${scope}&tab=completed${qSuffix}`, active: tab === "completed", label: withCount(t("status.completed"), counts.completed) },
  ];

  return (
    <div>
      <PageHeader
        title={t("tasks.pageTitle")}
        actions={
          <>
            {canCreate && (
              <Button asChild variant="primary" size="40" icon={Plus}>
                <Link href="/tasks/new">{t("tasks.newTitle")}</Link>
              </Button>
            )}
            <TasksOverflowMenu scope={scope} />
          </>
        }
        tools={
          <div className={SCROLL}>
            <Segmented items={scopeItems} />
          </div>
        }
      />

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={SCROLL}>
            <Segmented items={statusItems} />
          </div>
          <TasksSearch />
        </div>

        <TasksViewSwitcher tasks={filtered} />
      </div>
    </div>
  );
}
