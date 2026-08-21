import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tasks,
  users,
  projects,
  externalCompanies,
  projectStages,
  projectTypes,
  stagePayments,
  stageTemplateItems,
  type Position,
} from "@/lib/db/schema";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";

export type Period = "day" | "week" | "month" | "quarter" | "year";

function periodSqlInterval(period: Period) {
  return period === "day" ? sql`'1 day'` : period === "week" ? sql`'7 days'` : period === "month" ? sql`'30 days'` : period === "quarter" ? sql`'90 days'` : sql`'365 days'`;
}

export async function getCompanyTaskCounts(period: Period) {
  const interval = periodSqlInterval(period);
  const rows = await db
    .select({ status: tasks.status, c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(sql`${tasks.createdAt} >= now() - ${interval}::interval`)
    .groupBy(tasks.status);
  const out: Record<string, number> = { todo: 0, in_progress: 0, under_review: 0, completed: 0, rejected: 0 };
  for (const r of rows) out[r.status] = Number(r.c);
  return out;
}

export async function getOverdueAll(): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(sql`${tasks.deadline} < now() AND ${tasks.status} not in ('completed','rejected')`);
  return Number(rows[0]?.c ?? 0);
}

export async function getTopAssigneesByCompleted(limit = 5) {
  const rows = await db
    .select({
      userId: tasks.assignedToUserId,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      c: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToUserId))
    .where(sql`${tasks.completedAt} >= now() - interval '30 days'`)
    .groupBy(tasks.assignedToUserId, users.fullName, users.avatarUrl)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows;
}

export async function getTopAssigneesByOverdue(limit = 5) {
  const rows = await db
    .select({
      userId: tasks.assignedToUserId,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      c: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToUserId))
    .where(sql`${tasks.deadline} < now() AND ${tasks.status} not in ('completed','rejected')`)
    .groupBy(tasks.assignedToUserId, users.fullName, users.avatarUrl)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows;
}

export async function getTaskActivityTimeline(days = 30) {
  const rows = await db.execute<{ d: Date; created: number; completed: number }>(sql`
    SELECT
      gs::date AS d,
      coalesce(c1.created, 0) AS created,
      coalesce(c2.completed, 0) AS completed
    FROM generate_series((now() - interval '${sql.raw(String(days - 1))} days')::date, now()::date, '1 day') gs
    LEFT JOIN (
      SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS created
      FROM tasks
      WHERE created_at >= now() - interval '${sql.raw(String(days))} days'
      GROUP BY 1
    ) c1 ON c1.d = gs::date
    LEFT JOIN (
      SELECT date_trunc('day', completed_at)::date AS d, count(*)::int AS completed
      FROM tasks
      WHERE completed_at >= now() - interval '${sql.raw(String(days))} days'
      GROUP BY 1
    ) c2 ON c2.d = gs::date
    ORDER BY gs::date
  `);
  // postgres-js returns array of rows on .execute
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map((r) => ({
    date: typeof r.d === "string" ? r.d : new Date(r.d).toISOString().slice(0, 10),
    created: Number(r.created),
    completed: Number(r.completed),
  }));
}

export async function getMyTasks(actorId: string) {
  const row = await db.execute<{ today: number; week: number; soon: number; overdue: number }>(sql`
    SELECT
      count(*) FILTER (WHERE deadline::date = now()::date)::int AS today,
      count(*) FILTER (WHERE deadline BETWEEN now() AND now() + interval '7 days')::int AS week,
      count(*) FILTER (WHERE deadline BETWEEN now() AND now() + interval '24 hours' AND status NOT IN ('completed','rejected'))::int AS soon,
      count(*) FILTER (WHERE deadline < now() AND status NOT IN ('completed','rejected'))::int AS overdue
    FROM tasks WHERE assigned_to_user_id = ${actorId}
  `);
  const r = row[0];
  return {
    today: Number(r?.today ?? 0),
    week: Number(r?.week ?? 0),
    soon: Number(r?.soon ?? 0),
    overdue: Number(r?.overdue ?? 0),
  };
}

export async function getProjectsActiveCount(): Promise<number> {
  const rows = await db.select({ c: sql<number>`count(*)::int` }).from(projects).where(sql`${projects.status} not in ('completed','cancelled')`);
  return Number(rows[0]?.c ?? 0);
}

/**
 * Workload split per department for not-yet-finished tasks. Returns one row
 * per dept with three columns the UI stacks as a horizontal bar.
 */
export async function getDepartmentWorkload() {
  const rows = await db.execute<{
    department: string;
    in_progress: number;
    under_review: number;
    overdue: number;
  }>(sql`
    SELECT
      coalesce(d.name, '—') AS department,
      sum(case when t.status = 'in_progress' AND (t.deadline IS NULL OR t.deadline >= now()) then 1 else 0 end)::int AS in_progress,
      sum(case when t.status = 'under_review' then 1 else 0 end)::int AS under_review,
      sum(case when t.deadline < now() AND t.status not in ('completed','rejected') then 1 else 0 end)::int AS overdue
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to_user_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE t.status not in ('completed','rejected')
    GROUP BY d.name
    ORDER BY (sum(case when t.status='in_progress' then 1 else 0 end)
            + sum(case when t.status='under_review' then 1 else 0 end)
            + sum(case when t.deadline < now() AND t.status not in ('completed','rejected') then 1 else 0 end)) DESC
    LIMIT 8
  `);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map((r) => ({
    department: String(r.department),
    in_progress: Number(r.in_progress),
    under_review: Number(r.under_review),
    overdue: Number(r.overdue),
  }));
}

/** Tasks with a deadline within the next N days, soonest first. */
export async function getUpcomingDeadlines(days = 7, limit = 8) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
      status: tasks.status,
      priority: tasks.priority,
      assigneeName: users.fullName,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assignedToUserId))
    .where(sql`${tasks.deadline} between now() AND now() + interval '${sql.raw(String(days))} days' AND ${tasks.status} not in ('completed','rejected')`)
    .orderBy(asc(tasks.deadline))
    .limit(limit);
  return rows;
}

/** Active projects with computed progress + overdue flag for the manager dashboard. */
export async function getActiveProjectsHealth(limit = 6) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      statusOverride: projects.statusOverride,
      companyName: externalCompanies.name,
    })
    .from(projects)
    .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .where(sql`${projects.status} not in ('completed','cancelled')`)
    .orderBy(asc(projects.deadline))
    .limit(limit);
  return rows.map((p) => {
    const atRisk = !!p.deadline && new Date(p.deadline) < today && p.statusOverride !== "on_hold";
    return { ...p, atRisk };
  });
}

// ---------------------------------------------------------------------------
// Projects & stages analytics (manager dashboard)
// ---------------------------------------------------------------------------

/** Headline counters for the projects dashboard — every one is a clickable KPI. */
export async function getProjectStageKpis() {
  const [active, overdueStages, dueSoonStages, overdueTasks] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(projects).where(sql`${projects.status} not in ('completed','cancelled')`),
    db.select({ c: sql<number>`count(*)::int` }).from(projectStages).where(sql`${projectStages.status} = 'active' AND ${projectStages.plannedDeadline} < now()::date`),
    db.select({ c: sql<number>`count(*)::int` }).from(projectStages).where(sql`${projectStages.status} = 'active' AND ${projectStages.plannedDeadline} between now()::date AND (now() + interval '7 days')::date`),
    db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.deadline} < now() AND ${tasks.status} not in ('completed','rejected')`),
  ]);
  return {
    activeProjects: Number(active[0]?.c ?? 0),
    overdueStages: Number(overdueStages[0]?.c ?? 0),
    dueSoonStages: Number(dueSoonStages[0]?.c ?? 0),
    overdueTasks: Number(overdueTasks[0]?.c ?? 0),
  };
}

/** Project counts by derived status (progress + on-hold override) — powers the donut. */
export async function getProjectStatusBreakdown() {
  const rows = await db
    .select({ progressPercentage: projects.progressPercentage, statusOverride: projects.statusOverride })
    .from(projects);
  const out: Record<DerivedStatus, number> = { not_started: 0, in_progress: 0, completed: 0, on_hold: 0 };
  for (const r of rows) out[derivedStatus(r.progressPercentage, r.statusOverride)] += 1;
  return out;
}

/** Typed-project counts per production type — powers the horizontal bar. */
export async function getProjectTypeBreakdown(locale: string) {
  const rows = await db
    .select({
      uz: projectTypes.nameUzLatn,
      cy: projectTypes.nameUzCyrl,
      ru: projectTypes.nameRu,
      order: projectTypes.orderIndex,
      c: sql<number>`count(${projects.id})::int`,
    })
    .from(projectTypes)
    .leftJoin(projects, eq(projects.projectTypeId, projectTypes.id))
    .groupBy(projectTypes.id, projectTypes.nameUzLatn, projectTypes.nameUzCyrl, projectTypes.nameRu, projectTypes.orderIndex)
    .orderBy(desc(sql`count(${projects.id})`));
  return rows
    .map((r) => ({ name: locale === "ru" ? r.ru : locale === "uz-cyrl" ? r.cy : r.uz, count: Number(r.c) }))
    .filter((r) => r.count > 0);
}

/** Active stages that have a deadline, most urgent first (overdue → soonest). */
export async function getStageDeadlineBoard(locale: string, limit = 8) {
  const rows = await db
    .select({
      stageId: projectStages.id,
      projectId: projectStages.projectId,
      projectName: projects.name,
      snapshot: projectStages.name,
      plannedDeadline: projectStages.plannedDeadline,
      tiUz: stageTemplateItems.nameUzLatn,
      tiCy: stageTemplateItems.nameUzCyrl,
      tiRu: stageTemplateItems.nameRu,
      responsibleName: users.fullName,
    })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
    .leftJoin(users, eq(users.id, projectStages.responsibleUserId))
    .where(sql`${projectStages.status} = 'active' AND ${projectStages.plannedDeadline} is not null`)
    .orderBy(asc(projectStages.plannedDeadline))
    .limit(limit);
  return rows.map((r) => ({
    stageId: r.stageId,
    projectId: r.projectId,
    projectName: r.projectName,
    stageName: (locale === "ru" ? r.tiRu : locale === "uz-cyrl" ? r.tiCy : r.tiUz) ?? r.snapshot,
    plannedDeadline: r.plannedDeadline,
    responsibleName: r.responsibleName,
  }));
}

/** Money rollup across every stage: planned target vs paid vs pending. */
export async function getProjectPaymentsSummary() {
  const [plannedRow, payRow] = await Promise.all([
    db.select({ s: sql<string>`coalesce(sum(${projectStages.plannedAmount}),0)` }).from(projectStages),
    db
      .select({
        paid: sql<string>`coalesce(sum(case when ${stagePayments.status}='paid' then ${stagePayments.amount} else 0 end),0)`,
        pending: sql<string>`coalesce(sum(case when ${stagePayments.status}<>'paid' then ${stagePayments.amount} else 0 end),0)`,
      })
      .from(stagePayments),
  ]);
  return {
    planned: Number(plannedRow[0]?.s ?? 0),
    paid: Number(payRow[0]?.paid ?? 0),
    pending: Number(payRow[0]?.pending ?? 0),
  };
}

void and; void asc;
type _ = Position;
