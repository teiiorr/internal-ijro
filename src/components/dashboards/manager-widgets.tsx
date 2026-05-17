import Link from "next/link";
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">Tasks (30d)</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{totalTasks}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">In progress</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{counts.in_progress}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">Overdue</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-[var(--danger)]">{overdue}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">Active projects</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{projectsActive}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tasks by status</CardTitle></CardHeader>
          <CardContent><TaskStatusChart data={counts} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Created vs completed (30d)</CardTitle></CardHeader>
          <CardContent><TaskTimelineChart data={timeline} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top performers (30d)</CardTitle></CardHeader>
          <CardContent>
            {top.length === 0 ? <p className="text-sm text-[var(--muted)]">No completions yet.</p> : (
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
          <CardHeader><CardTitle>Most overdue</CardTitle></CardHeader>
          <CardContent>
            {slow.length === 0 ? <p className="text-sm text-[var(--muted)]">All on track.</p> : (
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
