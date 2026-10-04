import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { councilAgendaItems, councilMeetings, departments, projects, tasks, users } from "@/lib/db/schema";
import { councilResolutions } from "@/lib/db/tables/council-resolutions";
import type { SessionUser } from "@/lib/session";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import {
  RESOLUTION_EDITOR_POSITIONS,
  countByStatus,
  effectiveStatus,
  emptyCounters,
  isActiveStatus,
  isStaffPosition,
  sortResolutions,
  tashkentToday,
  type EffectiveStatus,
  type ResolutionFilters,
} from "@/lib/councils/resolution-status";

// Every read of council_resolutions is try/catch-guarded: before migration 0031
// is applied the table does not exist and the kengash pages must still render.

export type ResolutionRow = {
  id: string;
  meetingId: string;
  meetingKind: string;
  /** ISO instant of the meeting (council_meetings.scheduled_at). */
  meetingDate: string;
  meetingTitle: string | null;
  meetingCreatorId: string | null;
  number: number;
  text: string;
  agendaItemId: string | null;
  agendaTopic: string | null;
  projectId: string | null;
  projectName: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  responsibleAvatar: string | null;
  departmentName: string | null;
  /** Tashkent date YYYY-MM-DD. */
  dueDate: string | null;
  taskId: string | null;
  taskRegNumber: string | null;
  taskStatus: string | null;
  /** Manual status: open | done | cancelled. */
  status: string;
  effective: EffectiveStatus;
  closedNote: string | null;
  /** ISO instant. */
  closedAt: string | null;
};

const ROW_SELECT = {
  id: councilResolutions.id,
  meetingId: councilResolutions.meetingId,
  meetingKind: councilMeetings.kind,
  meetingScheduledAt: councilMeetings.scheduledAt,
  meetingTitle: councilMeetings.title,
  meetingCreatorId: councilMeetings.createdByUserId,
  number: councilResolutions.number,
  text: councilResolutions.text,
  agendaItemId: councilResolutions.agendaItemId,
  agendaTopic: councilAgendaItems.topic,
  projectId: councilAgendaItems.projectId,
  projectName: sql<string | null>`coalesce(${projects.name}, ${councilAgendaItems.projectName})`,
  responsibleUserId: councilResolutions.responsibleUserId,
  responsibleName: users.fullName,
  responsibleAvatar: users.avatarUrl,
  departmentName: departments.name,
  dueDate: councilResolutions.dueDate,
  taskId: councilResolutions.taskId,
  taskRegNumber: tasks.registrationNumber,
  taskStatus: tasks.status,
  status: councilResolutions.status,
  closedNote: councilResolutions.closedNote,
  closedAt: councilResolutions.closedAt,
};

/** One query joining meetings, agenda items, projects, users, departments and tasks. */
async function selectRows(where: SQL | undefined, opts: { limit?: number; newestFirst?: boolean } = {}): Promise<ResolutionRow[]> {
  const q = db
    .select(ROW_SELECT)
    .from(councilResolutions)
    .innerJoin(councilMeetings, eq(councilMeetings.id, councilResolutions.meetingId))
    .leftJoin(councilAgendaItems, eq(councilAgendaItems.id, councilResolutions.agendaItemId))
    .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
    .leftJoin(users, eq(users.id, councilResolutions.responsibleUserId))
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .leftJoin(tasks, eq(tasks.id, councilResolutions.taskId))
    .where(where)
    .orderBy(
      opts.newestFirst ? desc(councilMeetings.scheduledAt) : asc(councilMeetings.scheduledAt),
      asc(councilResolutions.number)
    )
    .$dynamic();
  const raw = opts.limit ? await q.limit(opts.limit) : await q;
  const today = tashkentToday();
  return raw.map(({ meetingScheduledAt, closedAt, ...r }) => ({
    ...r,
    meetingDate: new Date(meetingScheduledAt).toISOString(),
    closedAt: closedAt ? new Date(closedAt).toISOString() : null,
    effective: effectiveStatus({ status: r.status, dueDate: r.dueDate, taskStatus: r.taskStatus }, today),
  }));
}

/** Points of the given meetings, grouped by meeting id (ordered by point number). */
export async function listResolutionsForMeetings(meetingIds: Array<string | null | undefined>): Promise<Record<string, ResolutionRow[]>> {
  const ids = Array.from(new Set(meetingIds.filter((x): x is string => !!x)));
  if (ids.length === 0) return {};
  try {
    const rows = await selectRows(inArray(councilResolutions.meetingId, ids));
    const out: Record<string, ResolutionRow[]> = {};
    for (const r of rows) (out[r.meetingId] ??= []).push(r);
    for (const list of Object.values(out)) list.sort((a, b) => a.number - b.number);
    return out;
  } catch {
    return {};
  }
}

/**
 * Still-open points (effective status not done / cancelled) from EARLIER meetings of the
 * same kind — the "Oldingi qarorlar ijrosi" carry-over list for the upcoming meeting.
 */
export async function listOpenResolutions(kind: string, excludeMeetingId?: string): Promise<ResolutionRow[]> {
  try {
    let before: Date = new Date();
    if (excludeMeetingId) {
      const [m] = await db
        .select({ scheduledAt: councilMeetings.scheduledAt })
        .from(councilMeetings)
        .where(eq(councilMeetings.id, excludeMeetingId))
        .limit(1);
      if (m) before = m.scheduledAt;
    }
    const conds: SQL[] = [
      eq(councilMeetings.kind, kind),
      eq(councilResolutions.status, "open"),
      lt(councilMeetings.scheduledAt, before),
      sql`(${councilResolutions.taskId} IS NULL OR ${tasks.status} IS DISTINCT FROM 'completed')`,
    ];
    if (excludeMeetingId) conds.push(ne(councilResolutions.meetingId, excludeMeetingId));
    const rows = await selectRows(and(...conds), { limit: 300 });
    return rows.filter((r) => isActiveStatus(r.effective));
  } catch {
    return [];
  }
}

/**
 * /kengashlar/ijro + XLSX export. SQL is bounded to meetings of the last 2 years
 * (limit 1000); the effective-status filter is applied in JS. Counters reflect every
 * other filter, so the stat cards show what each status click would reveal.
 */
export async function listAllResolutions(
  me: Pick<SessionUser, "id">,
  f: Omit<ResolutionFilters, "mine"> & { mine?: boolean }
): Promise<{ rows: ResolutionRow[]; counters: Record<EffectiveStatus, number> }> {
  try {
    const conds: SQL[] = [gte(councilMeetings.scheduledAt, sql`now() - interval '2 years'`)];
    if (f.kind) conds.push(eq(councilMeetings.kind, f.kind));
    if (f.mine) conds.push(eq(councilResolutions.responsibleUserId, me.id));
    else if (f.responsibleId) conds.push(eq(councilResolutions.responsibleUserId, f.responsibleId));
    if (f.departmentId) conds.push(eq(users.departmentId, f.departmentId));
    const all = await selectRows(and(...conds), { limit: 1000, newestFirst: true });
    const counters = countByStatus(all);
    const rows = f.status ? all.filter((r) => r.effective === f.status) : all;
    return { rows: sortResolutions(rows), counters };
  } catch {
    return { rows: [], counters: emptyCounters() };
  }
}

/** Council points that produced this task (for the "Kengash qarori asosida" badge). */
export async function getResolutionsForTask(
  taskId: string
): Promise<Array<{ meetingKind: string; meetingDate: string; number: number; meetingId: string }>> {
  try {
    const rows = await db
      .select({
        meetingKind: councilMeetings.kind,
        scheduledAt: councilMeetings.scheduledAt,
        number: councilResolutions.number,
        meetingId: councilResolutions.meetingId,
      })
      .from(councilResolutions)
      .innerJoin(councilMeetings, eq(councilMeetings.id, councilResolutions.meetingId))
      .where(eq(councilResolutions.taskId, taskId))
      .orderBy(asc(councilMeetings.scheduledAt), asc(councilResolutions.number))
      .limit(10);
    return rows.map(({ scheduledAt, ...r }) => ({ ...r, meetingDate: new Date(scheduledAt).toISOString() }));
  } catch {
    return [];
  }
}

/**
 * May edit the points of EVERY meeting: direktor / orinbosar / koordinator / bolim_boshligi,
 * project editors (allowlist or the `projects.edit` grant). Staff positions only.
 */
export async function isResolutionEditor(me: Pick<SessionUser, "id" | "email" | "position">): Promise<boolean> {
  if (!isStaffPosition(me.position)) return false;
  if (RESOLUTION_EDITOR_POSITIONS.includes(me.position)) return true;
  if (canEditProjects(me.email)) return true;
  return hasGrant(me.id, "projects.edit");
}

/** Create / edit / cancel points of one meeting: its creator or a resolution editor. */
export async function canEditResolutions(
  me: Pick<SessionUser, "id" | "email" | "position">,
  meetingCreatorId: string | null
): Promise<boolean> {
  if (!isStaffPosition(me.position)) return false;
  if (meetingCreatorId && meetingCreatorId === me.id) return true;
  return isResolutionEditor(me);
}

/** Options for the /kengashlar/ijro filters: active staff and departments. */
export async function listResolutionFilterOptions(): Promise<{
  people: Array<{ id: string; fullName: string }>;
  departments: Array<{ id: string; name: string }>;
}> {
  try {
    const [people, depts] = await Promise.all([
      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.status, "active"), ne(users.position, "kontragent"), eq(users.hidden, false)))
        .orderBy(asc(users.fullName)),
      db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(asc(departments.name)),
    ]);
    return { people, departments: depts };
  } catch {
    return { people: [], departments: [] };
  }
}
