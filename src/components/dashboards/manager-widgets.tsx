import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCompanyTaskCounts,
  getOverdueAll,
  getProjectsActiveCount,
  getTaskActivityTimeline,
  getTopAssigneesByCompleted,
  getTopAssigneesByOverdue,
} from "@/server/queries/dashboards";
import { TaskStatusChart } from "./task-status-chart";
import { TaskTimelineChart } from "./task-timeline-chart";

export async function ManagerWidgets() {
  const t = await getTranslations();
  const [counts, overdue, projectsActive, top, slow, timeline] = await Promise.all([
    getCompanyTaskCounts("month"),
    getOverdueAll(),
    getProjectsActiveCount(),
    getTopAssigneesByCompleted(5),
    getTopAssigneesByOverdue(5),
    getTaskActivityTimeline(30),
  ]);
  const totalTasks = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.tasks30")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular">{totalTasks}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.inProgress")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular">{counts.in_progress}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.overdue")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular text-[var(--danger)]">{overdue}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.activeProjects")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular">{projectsActive}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.manager.byStatus")}</CardTitle></CardHeader>
          <CardContent><TaskStatusChart data={counts} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("dashboard.manager.activity30")}</CardTitle></CardHeader>
          <CardContent><TaskTimelineChart data={timeline} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.manager.topPerformers")}</CardTitle></CardHeader>
          <CardContent>
            {top.length === 0 ? <p className="text-sm text-[var(--muted)]">{t("dashboard.manager.noCompletions")}</p> : (
              <ul className="space-y-1 text-sm">
                {top.map((t) => (
                  <li key={t.userId} className="flex justify-between">
                    <Link href={`/employees/${t.userId}`} className="hover:underline">{t.fullName}</Link>
                    <span className="text-[var(--muted)]">{t.c}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("dashboard.manager.mostOverdue")}</CardTitle></CardHeader>
          <CardContent>
            {slow.length === 0 ? <p className="text-sm text-[var(--muted)]">{t("dashboard.manager.allOnTrack")}</p> : (
              <ul className="space-y-1 text-sm">
                {slow.map((t) => (
                  <li key={t.userId} className="flex justify-between">
                    <Link href={`/employees/${t.userId}`} className="hover:underline">{t.fullName}</Link>
                    <span className="text-[var(--danger)]">{t.c}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
