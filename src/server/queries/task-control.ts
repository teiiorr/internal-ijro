import "server-only";
import { eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { taskNudges } from "@/lib/db/tables/task-control";
import type { SessionUser } from "@/lib/session";
import type { TaskPriority } from "@/lib/permissions/tasks";
import {
  allowedScopesFor,
  resolveScope,
  tashkentDate,
  lateDays,
  CONTROL_PAGE_SIZE,
  EXPORT_MAX_ROWS,
  type AssigneeStatus,
  type ControlAssignee,
  type ControlExportRow,
  type ControlFilter,
  type ControlKpis,
  type ControlRow,
  type ControlScope,
} from "@/components/staff/task-control/control-logic";

export type { ControlScope, ControlRow, ControlKpis, ControlExportRow, ControlAssignee, ControlFilter };
export type ExportRow = ControlExportRow;

/** Board scopes this user may request ('mine' always; 'department' for heads/coordinators; 'all' for the leadership). */
export function allowedScopes(me: Pick<SessionUser, "position" | "departmentId">): ControlScope[] {
  return allowedScopesFor(me.position, me.departmentId);
}

// ---------------- SQL fragments (aliases: t = tasks, c = creator, ta = task_assignees) ----------------

const OPEN = sql`ta.status IN ('todo','in_progress','rejected')`;
const LATE = sql`(t.deadline IS NOT NULL AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date < (now() AT TIME ZONE 'Asia/Tashkent')::date)`;
/** timestamptz → "YYYY-MM-DDTHH:MM:SS.mmmZ" (UTC, ms precision) so every browser parses it; NULL stays NULL. */
const iso = (expr: SQL): SQL => sql`to_char((${expr}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
/** Studio (kontragent) tasks live in the contractor portal and are excluded from the board. */
const NOT_STUDIO = sql`NOT EXISTS (SELECT 1 FROM users k WHERE k.id = t.assigned_to_user_id AND k.position = 'kontragent')`;

function scopeCond(me: SessionUser, requested: ControlScope): SQL {
  const scope = resolveScope(requested, allowedScopes(me));
  if (scope === "all") return sql`true`;
  if (scope === "department") {
    if (me.position === "koordinator") {
      return sql`(t.created_by_user_id = ${me.id} OR c.department_id IN (SELECT ca.department_id FROM coordinator_assignments ca WHERE ca.coordinator_user_id = ${me.id}))`;
    }
    if (me.departmentId) {
      return sql`(t.created_by_user_id = ${me.id} OR c.department_id = ${me.departmentId})`;
    }
  }
  return sql`t.created_by_user_id = ${me.id}`;
}

/**
 * Tasks whose answers the viewer may approve/reject or nudge on: own tasks, or any task
 * for direktor/orinbosar (mirrors reviewAssigneeResponse / nudgeAssignees).
 */
function manageCond(me: SessionUser): SQL {
  if (me.position === "direktor" || me.position === "orinbosar") return sql`true`;
  return sql`t.created_by_user_id = ${me.id}`;
}

/** Per-(task, assignee) nudge counters; the fallback variant is used before migration 0031 is applied. */
function nudgeLateral(withNudges: boolean): SQL {
  return withNudges
    ? sql`LEFT JOIN LATERAL (
        SELECT count(*)::int AS n, max(tn.created_at) AS last
        FROM task_nudges tn
        WHERE tn.task_id = t.id AND tn.to_user_id = ta.user_id
      ) nz ON true`
    : sql`LEFT JOIN LATERAL (SELECT 0::int AS n, NULL::timestamptz AS last) nz ON true`;
}

/** Runs `build(true)`; if that fails (task_nudges missing), reruns `build(false)` without nudge counts. */
async function withNudgeFallback<T>(build: (withNudges: boolean) => SQL): Promise<T[]> {
  try {
    return (await db.execute(build(true))) as unknown as T[];
  } catch {
    return (await db.execute(build(false))) as unknown as T[];
  }
}

const toDate = (v: string | Date | null | undefined): Date | null => (v ? new Date(v) : null);

// ---------------- board ----------------

type RawBoardRow = {
  id: string;
  registrationNumber: string | null;
  title: string;
  deadline: string | null;
  priority: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  createdByUserId: string;
  creatorName: string;
  answered: number;
  underReview: number;
  assigneeCount: number;
  lastResponseAt: string | null;
  assignees: Array<Omit<ControlAssignee, "nudgeCount"> & { nudgeCount: number | null }> | null;
  totalRows: string | number;
};

export async function getControlBoard(
  me: SessionUser,
  o: {
    scope: ControlScope;
    filter?: ControlFilter;
    projectId?: string;
    priority?: TaskPriority;
    from?: string;
    to?: string;
    page?: number;
  }
): Promise<{ rows: ControlRow[]; total: number }> {
  const page = Math.max(1, Math.floor(o.page ?? 1));
  const scope = scopeCond(me, o.scope);
  // Response payloads only reach viewers who can act on them (department-scope heads see status only).
  const manage = manageCond(me);
  const extra: SQL[] = [];
  if (o.projectId) extra.push(sql`t.project_id = ${o.projectId}`);
  if (o.priority) extra.push(sql`t.priority = ${o.priority}`);
  if (o.from) extra.push(sql`(t.deadline AT TIME ZONE 'Asia/Tashkent')::date >= ${o.from}::date`);
  if (o.to) extra.push(sql`(t.deadline AT TIME ZONE 'Asia/Tashkent')::date <= ${o.to}::date`);
  const extraSql = extra.length ? sql` AND ${sql.join(extra, sql` AND `)}` : sql``;

  const having =
    o.filter === "no_response"
      ? sql`HAVING bool_or(${OPEN})`
      : o.filter === "late"
        ? sql`HAVING bool_or(${OPEN} AND ${LATE})`
        : o.filter === "to_review"
          ? sql`HAVING bool_or(ta.status = 'under_review') AND bool_and(${manage})`
          : sql``;

  const build = (withNudges: boolean) => sql`
    SELECT
      t.id,
      t.registration_number AS "registrationNumber",
      t.title,
      ${iso(sql`t.deadline`)} AS "deadline",
      t.priority,
      t.status,
      t.project_id AS "projectId",
      p.name AS "projectName",
      t.created_by_user_id AS "createdByUserId",
      c.full_name AS "creatorName",
      count(*) FILTER (WHERE ta.status = 'completed')::int AS "answered",
      count(*) FILTER (WHERE ta.status = 'under_review')::int AS "underReview",
      count(*)::int AS "assigneeCount",
      ${iso(sql`max(ta.response_submitted_at)`)} AS "lastResponseAt",
      json_agg(
        json_build_object(
          'userId', ta.user_id,
          'fullName', u.full_name,
          'avatarUrl', u.avatar_url,
          'departmentName', d.name,
          'status', ta.status,
          'responseSubmittedAt', ${iso(sql`ta.response_submitted_at`)},
          'responseText', CASE WHEN ta.status = 'under_review' AND ${manage} THEN left(ta.response_text, 5000) END,
          'responseFileUrl', CASE WHEN ta.status = 'under_review' AND ${manage} THEN ta.response_file_url END,
          'responseFileName', CASE WHEN ta.status = 'under_review' AND ${manage} THEN ta.response_file_name END,
          'kontragent', (u.position = 'kontragent'),
          'overdue', (${OPEN} AND ${LATE}),
          'nudgeCount', coalesce(nz.n, 0),
          'lastNudgeAt', ${iso(sql`nz.last`)}
        ) ORDER BY ta.created_at, u.full_name
      ) AS "assignees",
      bool_or(${OPEN} AND ${LATE}) AS "anyLate",
      count(*) OVER() AS "totalRows"
    FROM tasks t
    JOIN users c ON c.id = t.created_by_user_id
    JOIN task_assignees ta ON ta.task_id = t.id
    JOIN users u ON u.id = ta.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN projects p ON p.id = t.project_id
    ${nudgeLateral(withNudges)}
    WHERE t.status <> 'completed'
      AND ${scope}
      AND ${NOT_STUDIO}${extraSql}
    GROUP BY t.id, p.name, c.full_name
    ${having}
    ORDER BY "anyLate" DESC, t.deadline ASC NULLS LAST, t.created_at DESC
    LIMIT ${CONTROL_PAGE_SIZE} OFFSET ${(page - 1) * CONTROL_PAGE_SIZE}
  `;

  const raw = await withNudgeFallback<RawBoardRow>(build);
  const rows: ControlRow[] = raw.map((r) => ({
    id: r.id,
    registrationNumber: r.registrationNumber,
    title: r.title,
    deadline: toDate(r.deadline),
    priority: r.priority,
    status: r.status,
    projectId: r.projectId,
    projectName: r.projectName,
    createdByUserId: r.createdByUserId,
    creatorName: r.creatorName,
    answered: Number(r.answered),
    total: Number(r.assigneeCount),
    underReview: Number(r.underReview),
    lastResponseAt: toDate(r.lastResponseAt),
    assignees: (r.assignees ?? []).map((a) => ({
      userId: a.userId,
      fullName: a.fullName,
      avatarUrl: a.avatarUrl ?? null,
      departmentName: a.departmentName ?? null,
      status: a.status as AssigneeStatus,
      responseSubmittedAt: a.responseSubmittedAt ?? null,
      responseText: a.responseText ?? null,
      responseFileUrl: a.responseFileUrl ?? null,
      responseFileName: a.responseFileName ?? null,
      overdue: !!a.overdue,
      kontragent: !!a.kontragent,
      nudgeCount: Number(a.nudgeCount ?? 0),
      lastNudgeAt: a.lastNudgeAt ?? null,
    })),
  }));
  return { rows, total: raw.length > 0 ? Number(raw[0].totalRows) : 0 };
}

// ---------------- KPIs ----------------

export async function getControlKpis(me: SessionUser, scope: ControlScope): Promise<ControlKpis> {
  const res = (await db.execute(sql`
    SELECT
      count(DISTINCT t.id) FILTER (WHERE t.status <> 'completed')::int AS "openGiven",
      count(*) FILTER (WHERE t.status <> 'completed' AND ${OPEN})::int AS "awaitingAnswer",
      count(*) FILTER (WHERE t.status <> 'completed' AND ta.status = 'under_review' AND ${manageCond(me)})::int AS "awaitingMyApproval",
      count(*) FILTER (WHERE t.status <> 'completed' AND ${OPEN} AND ${LATE})::int AS "lateAssignees",
      count(*) FILTER (
        WHERE ta.status = 'completed' AND ta.completed_at >= now() - interval '90 days' AND t.deadline IS NOT NULL
      )::int AS "done90",
      count(*) FILTER (
        WHERE ta.status = 'completed' AND ta.completed_at >= now() - interval '90 days' AND t.deadline IS NOT NULL
          AND (ta.completed_at AT TIME ZONE 'Asia/Tashkent')::date <= (t.deadline AT TIME ZONE 'Asia/Tashkent')::date
      )::int AS "onTime90"
    FROM tasks t
    JOIN users c ON c.id = t.created_by_user_id
    JOIN task_assignees ta ON ta.task_id = t.id
    WHERE ${scopeCond(me, scope)}
      AND ${NOT_STUDIO}
      AND (t.status <> 'completed' OR ta.completed_at >= now() - interval '90 days')
  `)) as unknown as Array<Record<string, number | string | null>>;
  const r = res[0] ?? {};
  const done = Number(r.done90 ?? 0);
  const onTime = Number(r.onTime90 ?? 0);
  return {
    openGiven: Number(r.openGiven ?? 0),
    awaitingAnswer: Number(r.awaitingAnswer ?? 0),
    awaitingMyApproval: Number(r.awaitingMyApproval ?? 0),
    lateAssignees: Number(r.lateAssignees ?? 0),
    onTimeRate90d: done > 0 ? Math.round((onTime / done) * 100) : null,
  };
}

// ---------------- project filter options ----------------

/** Projects that have open, in-scope tasks — options for the board's project filter. */
export async function listControlProjects(me: SessionUser, scope: ControlScope): Promise<Array<{ id: string; name: string }>> {
  const res = (await db.execute(sql`
    SELECT DISTINCT p.id, p.name
    FROM tasks t
    JOIN users c ON c.id = t.created_by_user_id
    JOIN projects p ON p.id = t.project_id
    WHERE t.status <> 'completed' AND ${scopeCond(me, scope)} AND ${NOT_STUDIO}
    ORDER BY p.name
    LIMIT 300
  `)) as unknown as Array<{ id: string; name: string }>;
  return res.map((r) => ({ id: r.id, name: r.name }));
}

// ---------------- nudge stats (task page) ----------------

export async function getNudgeStats(taskId: string): Promise<Record<string, { count: number; lastAt: string | null }>> {
  try {
    const rows = await db
      .select({
        toUserId: taskNudges.toUserId,
        count: sql<number>`count(*)::int`,
        lastAt: sql<string | null>`${iso(sql`max(${taskNudges.createdAt})`)}`,
      })
      .from(taskNudges)
      .where(eq(taskNudges.taskId, taskId))
      .groupBy(taskNudges.toUserId);
    const out: Record<string, { count: number; lastAt: string | null }> = {};
    for (const r of rows) out[r.toUserId] = { count: Number(r.count), lastAt: r.lastAt ?? null };
    return out;
  } catch {
    // task_nudges hali yaratilmagan (0031 migratsiyasi qo'llanmagan) — hisoblagichlarsiz ishlaymiz.
    return {};
  }
}

// ---------------- Excel export ----------------

type RawExportRow = {
  registrationNumber: string | null;
  title: string;
  assignee: string;
  department: string | null;
  deadline: string | null;
  responseSubmittedAt: string | null;
  completedAt: string | null;
  status: string;
  nudgeCount: number | null;
};

/**
 * One row per assignee of every in-scope task (completed ones included) whose
 * Tashkent deadline date falls in [from, to]; tasks without a deadline are matched
 * by creation date instead. `from`/`to` must already be clamped (clampExportRange).
 */
export async function listControlExportRows(
  me: SessionUser,
  scope: ControlScope,
  from: string,
  to: string
): Promise<ControlExportRow[]> {
  const scopeSql = scopeCond(me, scope);
  const build = (withNudges: boolean) => sql`
    SELECT
      t.registration_number AS "registrationNumber",
      t.title,
      u.full_name AS "assignee",
      d.name AS "department",
      ${iso(sql`t.deadline`)} AS "deadline",
      ${iso(sql`ta.response_submitted_at`)} AS "responseSubmittedAt",
      ${iso(sql`ta.completed_at`)} AS "completedAt",
      ta.status,
      coalesce(nz.n, 0) AS "nudgeCount"
    FROM tasks t
    JOIN users c ON c.id = t.created_by_user_id
    JOIN task_assignees ta ON ta.task_id = t.id
    JOIN users u ON u.id = ta.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    ${nudgeLateral(withNudges)}
    WHERE ${scopeSql}
      AND ${NOT_STUDIO}
      AND (
        (t.deadline IS NOT NULL AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date BETWEEN ${from}::date AND ${to}::date)
        OR (t.deadline IS NULL AND (t.created_at AT TIME ZONE 'Asia/Tashkent')::date BETWEEN ${from}::date AND ${to}::date)
      )
    ORDER BY t.deadline ASC NULLS LAST, t.registration_number ASC NULLS LAST, t.id, ta.created_at
    LIMIT ${EXPORT_MAX_ROWS}
  `;
  const raw = await withNudgeFallback<RawExportRow>(build);
  const today = tashkentDate(new Date());
  return raw.map((r) => {
    const status = r.status as AssigneeStatus;
    return {
      registrationNumber: r.registrationNumber,
      title: r.title,
      assignee: r.assignee,
      department: r.department,
      deadline: r.deadline,
      responseSubmittedAt: r.responseSubmittedAt,
      status,
      lateDays: lateDays({ deadline: r.deadline, status, responseSubmittedAt: r.responseSubmittedAt, completedAt: r.completedAt }, today),
      nudgeCount: Number(r.nudgeCount ?? 0),
    };
  });
}
