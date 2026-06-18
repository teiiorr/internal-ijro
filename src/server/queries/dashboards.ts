import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, users, projects, departments, externalCompanies, type Position } from "@/lib/db/schema";

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
      c: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToUserId))
    .where(sql`${tasks.completedAt} >= now() - interval '30 days'`)
    .groupBy(tasks.assignedToUserId, users.fullName)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows;
}

export async function getTopAssigneesByOverdue(limit = 5) {
  const rows = await db
    .select({
      userId: tasks.assignedToUserId,
      fullName: users.fullName,
      c: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToUserId))
    .where(sql`${tasks.deadline} < now() AND ${tasks.status} not in ('completed','rejected')`)
    .groupBy(tasks.assignedToUserId, users.fullName)
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
  const today = await db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.assignedToUserId} = ${actorId} AND ${tasks.deadline}::date = now()::date`);
  const week = await db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.assignedToUserId} = ${actorId} AND ${tasks.deadline} between now() AND now() + interval '7 days'`);
  const soon = await db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.assignedToUserId} = ${actorId} AND ${tasks.deadline} between now() AND now() + interval '24 hours' AND ${tasks.status} not in ('completed','rejected')`);
  const overdue = await db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.assignedToUserId} = ${actorId} AND ${tasks.deadline} < now() AND ${tasks.status} not in ('completed','rejected')`);
  return {
    today: Number(today[0]?.c ?? 0),
    week: Number(week[0]?.c ?? 0),
    soon: Number(soon[0]?.c ?? 0),
    overdue: Number(overdue[0]?.c ?? 0),
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

void and; void asc;
type _ = Position;
