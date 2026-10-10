import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listTasks } from "@/server/queries/tasks";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented, type SegmentedItem } from "@/components/ui-biib/Segmented";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";

export const dynamic = "force-dynamic";

type StatusTab = "all" | "in_progress" | "under_review" | "completed";

// Studiya uchun alohida «Vazifalar» boʻlimi — xodimlardagi koʻrinish bilan bir xil
// (roʻyxat yoki kalendar). Studiya faqat oʻziga tayinlangan vazifalarni koʻradi.
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

  const segLabel = (label: string, n: number) => (
    <>
      {label} <span className="tabular-nums text-[var(--ink-3)]">{n}</span>
    </>
  );
  const segments: Array<{ value: StatusTab; label: string }> = [
    { value: "all", label: t("common.all") },
    { value: "in_progress", label: t("status.in_progress") },
    { value: "under_review", label: t("status.under_review") },
    { value: "completed", label: t("status.completed") },
  ];
  const items: SegmentedItem[] = segments.map((s) => ({
    href: `/contractor/tasks?tab=${s.value}`,
    label: segLabel(s.label, counts[s.value]),
    active: tab === s.value,
  }));

  return (
    <div>
      <PageHeader title={t("nav.tasks")} tools={<Segmented items={items} className="max-w-full overflow-x-auto" />} />
      <Card solid bare className="p-3 sm:p-4">
        <TasksViewSwitcher tasks={filtered} hrefBase="/contractor/tasks" />
      </Card>
    </div>
  );
}
