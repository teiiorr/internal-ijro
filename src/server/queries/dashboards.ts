import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, users, projects, type Position } from "@/lib/db/schema";

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

void and; void asc;
type _ = Position;
