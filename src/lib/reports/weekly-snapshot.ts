import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
// Relative imports only (no "server-only", no "@/" alias): this module is shared by the
// Next server (queries/actions) and the standalone worker (scripts/jobs/weekly-snapshot.ts).
// The caller passes its own drizzle instance — the same pattern as lib/notifications/deliver.ts.
import type * as schema from "../db/schema";
import { weeklySnapshots } from "../db/tables/weekly-brief";
import {
  addDays,
  isIsoDay,
  lastCompletedWeekStart,
  addWeeks,
  tashkentToday,
  weekStartOf,
  weekWindow,
  type WeeklyMetrics,
} from "./weekly-brief-core";

export { weekStartOf, lastCompletedWeekStart, addWeeks };
export type { WeeklyMetrics };

export type WeeklyDb = PostgresJsDatabase<typeof schema>;

// postgres-js returns a RowList (array); normalise to a plain array.
function rowsOf<T>(res: unknown): T[] {
  return Array.isArray(res) ? (res as T[]) : [];
}

function assertWeekStart(weekStart: string) {
  if (!isIsoDay(weekStart) || weekStartOf(weekStart) !== weekStart) throw new Error("invalid_week");
}

/**
 * Bitta hafta koʻrsatkichlari — bitta `db.execute` (sub-select'lar bilan).
 *
 * Hafta oynasi: [weekStart, weekStart + 7) Asia/Tashkent.
 *  - Holat koʻrsatkichlari (activeProjects … pendingRequests) CHAQIRUV paytidagi holat:
 *    "bugun" = hozirgi Toshkent sanasi. Dushanba ertalabki worker uchun bu — hafta yakuni.
 *  - Hodisalar (stagesCompleted, tasksCreated/Completed, paidUzs, newProjects) — oyna ichida.
 */
export async function computeWeeklyMetrics(db: WeeklyDb, weekStart: string): Promise<WeeklyMetrics> {
  assertWeekStart(weekStart);
  const { startIso, endIso } = weekWindow(weekStart);
  const res = await db.execute(sql`
    WITH b AS (
      SELECT
        ${startIso}::timestamptz AS ws,
        ${endIso}::timestamptz AS we,
        (now() AT TIME ZONE 'Asia/Tashkent')::date AS td
    )
    SELECT
      (SELECT count(*) FROM projects p
        WHERE p.status NOT IN ('completed', 'cancelled')
          AND p.status_override IS DISTINCT FROM 'on_hold')::int AS active_projects,
      (SELECT count(*) FROM project_stages s
        WHERE s.status = 'active' AND s.planned_deadline < b.td)::int AS overdue_stages,
      (SELECT count(*) FROM project_stages s
        WHERE s.status = 'active' AND s.planned_deadline BETWEEN b.td AND b.td + 7)::int AS due_soon_stages,
      (SELECT count(*) FROM task_assignees ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE ta.status IN ('todo', 'in_progress', 'rejected')
          AND t.status <> 'completed'
          AND t.deadline IS NOT NULL
          AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date < b.td)::int AS overdue_tasks,
      (SELECT count(*) FROM project_stages s
        JOIN projects p ON p.id = s.project_id
        WHERE s.status = 'active' AND s.review_status = 'submitted'
          AND p.external_company_id IS NOT NULL)::int AS review_queue,
      (SELECT count(*) FROM stage_requests r WHERE r.status = 'pending')::int AS pending_requests,
      (SELECT count(*) FROM project_stages s
        WHERE s.completed_at >= b.ws AND s.completed_at < b.we)::int AS stages_completed,
      (SELECT count(*) FROM tasks t
        WHERE t.created_at >= b.ws AND t.created_at < b.we)::int AS tasks_created,
      (SELECT count(*) FROM tasks t
        WHERE t.completed_at >= b.ws AND t.completed_at < b.we)::int AS tasks_completed,
      (SELECT coalesce(sum(sp.amount), 0) FROM stage_payments sp
        WHERE sp.status = 'paid' AND sp.currency = 'UZS'
          AND sp.paid_at >= b.ws AND sp.paid_at < b.we)::text AS paid_uzs,
      (SELECT count(*) FROM projects p
        WHERE p.created_at >= b.ws AND p.created_at < b.we)::int AS new_projects
    FROM b
  `);
  const r = rowsOf<Record<string, unknown>>(res)[0] ?? {};
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  return {
    activeProjects: n(r.active_projects),
    overdueStages: n(r.overdue_stages),
    dueSoonStages: n(r.due_soon_stages),
    overdueTasks: n(r.overdue_tasks),
    reviewQueue: n(r.review_queue),
    pendingRequests: n(r.pending_requests),
    stagesCompleted: n(r.stages_completed),
    tasksCreated: n(r.tasks_created),
    tasksCompleted: n(r.tasks_completed),
    paidUzs: n(r.paid_uzs),
    newProjects: n(r.new_projects),
  };
}

/**
 * Hafta snapshot'i boʻlmasa — hisoblab yozadi (INSERT … ON CONFLICT (week_start) DO NOTHING).
 * Mavjud boʻlsa hech narsa qilmaydi, shuning uchun takroriy chaqiruv xavfsiz.
 * Jadval yoʻq boʻlsa (0031 qoʻllanmagan) xato chaqiruvchiga uzatiladi.
 */
export async function ensureSnapshot(db: WeeklyDb, weekStart: string, now: Date = new Date()): Promise<void> {
  assertWeekStart(weekStart);
  const existing = await db
    .select({ id: weeklySnapshots.id })
    .from(weeklySnapshots)
    .where(eq(weeklySnapshots.weekStart, weekStart))
    .limit(1);
  if (existing.length > 0) return;
  const metrics = await computeWeeklyMetrics(db, weekStart);
  // Holat koʻrsatkichlari "hozir" boʻyicha hisoblanadi: ular faqat hafta tugagan kunning
  // ertasi (keyingi dushanba, Toshkent) uchun aniq. Boshqa kunda yaratilgan snapshot
  // (masalan, eski haftaga xulosa yozilganda) taxminiy deb belgilanadi.
  const exact = tashkentToday(now) === addDays(weekStart, 7);
  await db
    .insert(weeklySnapshots)
    .values({ weekStart, metrics: exact ? metrics : { ...metrics, estimated: true } })
    .onConflictDoNothing({ target: weeklySnapshots.weekStart });
}

/** Hafta oynasining oxirgi kuni (yakshanba) — UI va xabarlar uchun. */
export function weekEndDay(weekStart: string): string {
  return addDays(weekStart, 6);
}
