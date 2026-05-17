import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listTasks } from "@/server/queries/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TasksViewSwitcher } from "@/components/tasks/tasks-view-switcher";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download } from "lucide-react";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = session.user;
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const canCreate = !["mutaxassis", "hr", "kontragent"].includes(me.position);
  const scope = (get("scope") as "mine" | "team" | "all" | undefined) ?? (me.position === "mutaxassis" ? "mine" : "all");

  const tasks = await listTasks({
    actorId: me.id,
    actorPosition: me.position,
    actorDepartmentId: me.departmentId,
    scope,
    search: get("q"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (get("status") as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    priority: (get("priority") as any) ?? null,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/api/export/tasks?scope=${scope}`}><Download className="size-4" /> XLSX</a>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/tasks/new"><Plus className="size-4" /> New task</Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={scope}>
        <TabsList>
          <TabsTrigger value="mine" asChild><Link href="/tasks?scope=mine" replace>Mine</Link></TabsTrigger>
          {!["mutaxassis"].includes(me.position) && <TabsTrigger value="team" asChild><Link href="/tasks?scope=team" replace>Team</Link></TabsTrigger>}
          {["direktor","orinbosar","koordinator","bolim_boshligi"].includes(me.position) && (
            <TabsTrigger value="all" asChild><Link href="/tasks?scope=all" replace>All</Link></TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <TasksViewSwitcher tasks={tasks} />
        </CardContent>
      </Card>
    </div>
  );
}
