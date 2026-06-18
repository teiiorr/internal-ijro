import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCompanyTaskCounts,
  getOverdueAll,
  getProjectsActiveCount,
  getTopAssigneesByCompleted,
  getTopAssigneesByOverdue,
  getDepartmentWorkload,
  getUpcomingDeadlines,
  getActiveProjectsHealth,
} from "@/server/queries/dashboards";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { derivedStatus } from "@/lib/projects/progress";
import { Trophy, AlertTriangle, Layers, Clock, FolderKanban, Pause } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export async function ManagerWidgets() {
  const t = await getTranslations();
  const [counts, overdue, projectsActive, top, slow, deptLoad, upcoming, projectsHealth] = await Promise.all([
    getCompanyTaskCounts("month"),
    getOverdueAll(),
    getProjectsActiveCount(),
    getTopAssigneesByCompleted(5),
    getTopAssigneesByOverdue(5),
    getDepartmentWorkload(),
    getUpcomingDeadlines(7, 6),
    getActiveProjectsHealth(6),
  ]);
  const totalTasks = Object.values(counts).reduce((s, n) => s + n, 0);
  const topMax = Math.max(...top.map((x) => x.c), 1);
  const slowMax = Math.max(...slow.map((x) => x.c), 1);
  const deptMax = Math.max(
    ...deptLoad.map((d) => d.in_progress + d.under_review + d.overdue),
    1
  );

  return (
    <div className="space-y-6">
      {/* Top KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.tasks30")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular">{totalTasks}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.inProgress")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular">{counts.in_progress}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.overdue")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular text-[var(--danger)]">{overdue}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold text-[var(--muted)]">{t("dashboard.manager.activeProjects")}</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold tabular">{projectsActive}</p></CardContent></Card>
      </div>

      {/* Row: Top performers + Top overdue with horizontal bars */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="size-10 rounded-xl bg-[var(--success-soft)] grid place-items-center">
              <Trophy className="size-5 text-[var(--success)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.topPerformers")}</CardTitle>
              <p className="text-sm text-[var(--muted)] mt-0.5">{t("dashboard.manager.topPerformersDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-6">{t("dashboard.manager.noCompletions")}</p>
            ) : (
              top.map((row, i) => (
                <div key={row.userId} className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-[var(--success-soft)] text-[var(--success)] grid place-items-center text-xs font-bold shrink-0">
                    {initials(row.fullName)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <Link href={`/employees/${row.userId}`} className="font-semibold truncate hover:text-[var(--success)] transition-colors">
                        {row.fullName}
                      </Link>
                      <span className="font-bold tabular text-[var(--success)] shrink-0">{row.c}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500"
                        style={{ width: `${(row.c / topMax) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--subtle)] tabular w-5 text-right shrink-0">#{i + 1}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="size-10 rounded-xl bg-[var(--danger-soft)] grid place-items-center">
              <AlertTriangle className="size-5 text-[var(--danger)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.mostOverdue")}</CardTitle>
              <p className="text-sm text-[var(--muted)] mt-0.5">{t("dashboard.manager.mostOverdueDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {slow.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-6">{t("dashboard.manager.allOnTrack")}</p>
            ) : (
              slow.map((row, i) => (
                <div key={row.userId} className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] grid place-items-center text-xs font-bold shrink-0">
                    {initials(row.fullName)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <Link href={`/employees/${row.userId}`} className="font-semibold truncate hover:text-[var(--danger)] transition-colors">
                        {row.fullName}
                      </Link>
                      <span className="font-bold tabular text-[var(--danger)] shrink-0">{row.c}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--danger)] transition-[width] duration-500"
                        style={{ width: `${(row.c / slowMax) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--subtle)] tabular w-5 text-right shrink-0">#{i + 1}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department workload — stacked bar full width */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 pb-4">
          <div className="size-10 rounded-xl bg-[var(--primary-soft)] grid place-items-center">
            <Layers className="size-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{t("dashboard.manager.deptLoad")}</CardTitle>
            <p className="text-sm text-[var(--muted)] mt-0.5">{t("dashboard.manager.deptLoadDesc")}</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--primary)]" /> {t("status.in_progress")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--warning)]" /> {t("status.under_review")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--danger)]" /> {t("dashboard.manager.overdue")}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {deptLoad.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-6">{t("dashboard.manager.deptEmpty")}</p>
          ) : (
            deptLoad.map((d) => {
              const total = d.in_progress + d.under_review + d.overdue;
              const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
              return (
                <div key={d.department} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{d.department}</span>
                    <span className="font-bold tabular text-[var(--muted)]">{total}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-[var(--surface-3)]">
                    {d.in_progress > 0 && (
                      <div title={`In progress: ${d.in_progress}`} className="bg-[var(--primary)] transition-all duration-500" style={{ width: `${pct(d.in_progress)}%` }} />
                    )}
                    {d.under_review > 0 && (
                      <div title={`Under review: ${d.under_review}`} className="bg-[var(--warning)] transition-all duration-500" style={{ width: `${pct(d.under_review)}%` }} />
                    )}
                    {d.overdue > 0 && (
                      <div title={`Overdue: ${d.overdue}`} className="bg-[var(--danger)] transition-all duration-500" style={{ width: `${pct(d.overdue)}%` }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Row: Upcoming deadlines + Projects health */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="size-10 rounded-xl bg-[var(--warning-soft)] grid place-items-center">
              <Clock className="size-5 text-[var(--warning)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.upcoming")}</CardTitle>
              <p className="text-sm text-[var(--muted)] mt-0.5">{t("dashboard.manager.upcomingDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-6">{t("dashboard.manager.upcomingEmpty")}</p>
            ) : (
              upcoming.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-3)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{task.title}</p>
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">{task.assigneeName ?? "—"}</p>
                  </div>
                  <DeadlineCountdown deadline={task.deadline} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="size-10 rounded-xl bg-[var(--primary-soft)] grid place-items-center">
              <FolderKanban className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.manager.projectsHealth")}</CardTitle>
              <p className="text-sm text-[var(--muted)] mt-0.5">{t("dashboard.manager.projectsHealthDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsHealth.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-6">{t("dashboard.manager.projectsEmpty")}</p>
            ) : (
              projectsHealth.map((p) => {
                const status = derivedStatus(p.progressPercentage, p.statusOverride);
                const barColor =
                  status === "on_hold" ? "bg-[var(--muted)]"
                  : p.atRisk ? "bg-[var(--danger)]"
                  : p.progressPercentage >= 100 ? "bg-[var(--success)]"
                  : "bg-[var(--primary)]";
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block space-y-1.5 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-3)] transition-colors">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold truncate flex items-center gap-1.5">
                        {status === "on_hold" && <Pause className="size-3.5 text-[var(--muted)] shrink-0" />}
                        {p.atRisk && status !== "on_hold" && <AlertTriangle className="size-3.5 text-[var(--danger)] shrink-0" />}
                        {p.name}
                      </span>
                      <span className={`font-bold tabular text-xs shrink-0 ${p.atRisk ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{p.progressPercentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-[width] duration-500`} style={{ width: `${p.progressPercentage}%` }} />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
