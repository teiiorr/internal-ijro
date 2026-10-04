import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activityLog,
  projects,
  projectStages,
  stagePayments,
  stageRequests,
  stageTemplateItems,
  users,
} from "@/lib/db/schema";
import { weeklySnapshots } from "@/lib/db/tables/weekly-brief";
import { computeWeeklyMetrics } from "@/lib/reports/weekly-snapshot";
import {
  addWeeks,
  EMPTY_METRICS,
  isEstimatedMetrics,
  normalizeMetrics,
  weekWindow,
  type WeeklyMetrics,
} from "@/lib/reports/weekly-brief-core";
import { MONEY_MASK } from "@/lib/permissions/project-editors";

/**
 * Haftalik rahbar brifingi (/reports/weekly) uchun oʻqish soʻrovlari.
 *
 * - weekly_snapshots (0031) dan har bir oʻqish try/catch bilan himoyalangan: jadval
 *   hali yoʻq boʻlsa koʻrsatkichlar joyida hisoblanadi va "Taxminiy" belgisi chiqadi.
 * - Hodisalar (yakunlangan bosqichlar, toʻlovlar, yangi loyihalar, muddat oʻzgarishlari)
 *   har qanday oʻtgan hafta uchun vaqt belgilaridan hisoblanadi — snapshot shart emas.
 * - "Eʼtibor talab qiladi" — hozirgi holat.
 * Ruxsat sahifada (va reports/layout.tsx da) tekshiriladi.
 */

const LIST_LIMIT = 100;
const ATTENTION_LIMIT = 20;

export type WeeklySeriesPoint = { weekStart: string; metrics: WeeklyMetrics };

export type WeeklyStageRef = {
  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;
};

export type WeeklyCompletedStage = WeeklyStageRef & { at: Date };
export type WeeklyCrossedDeadline = WeeklyStageRef & { deadline: string; stillOpen: boolean };
export type WeeklyDeadlineMove = WeeklyStageRef & {
  at: Date;
  oldValue: string | null;
  newValue: string | null;
  by: string | null;
  viaStudio: boolean;
};
export type WeeklyPayment = {
  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;
  amount: number | typeof MONEY_MASK;
  currency: string;
  paidAt: Date;
};
export type WeeklyNewProject = { id: string; name: string; at: Date };

export type WeeklyEvents = {
  completedStages: WeeklyCompletedStage[];
  crossedDeadline: WeeklyCrossedDeadline[];
  deadlineMoves: WeeklyDeadlineMove[];
  payments: WeeklyPayment[];
  newProjects: WeeklyNewProject[];
  studioRequests: { opened: number; decided: number };
};

export type WeeklySilentProject = { id: string; name: string; lastActivityAt: Date | null };
export type WeeklyWaitingReview = WeeklyStageRef & { submittedAt: Date; days: number };
export type WeeklyOverrunning = WeeklyStageRef & { startedAt: Date; defaultDays: number; actualDays: number };

export type WeeklyAttention = {
  silentProjects: WeeklySilentProject[];
  waitingReview: WeeklyWaitingReview[];
  overrunning: WeeklyOverrunning[];
};

export type WeeklyThroughput = {
  days: { date: string; created: number; completed: number }[];
  byDepartment: { department: string | null; created: number; completed: number; overdue: number }[];
};

export type WeeklyBrief = {
  weekStart: string;
  metrics: WeeklyMetrics;
  isEstimate: boolean;
  prev: WeeklyMetrics | null;
  /** Oxirgi ≤12 ta snapshot (eski → yangi), tanlangan haftagacha. */
  series: WeeklySeriesPoint[];
  /** false boʻlsa paidUzs nolga tushirilgan — UI MONEY_MASK koʻrsatadi. */
  canMoney: boolean;
  events: WeeklyEvents;
  attention: WeeklyAttention;
  throughput: WeeklyThroughput;
  summary: { note: string; byName: string | null; at: Date | null } | null;
};

// ---------- yordamchilar ----------

function rowsOf<T>(res: unknown): T[] {
  return Array.isArray(res) ? (res as T[]) : [];
}

const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const toDate = (v: unknown): Date | null => {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

type StageNameCols = { snapshot: string; tiUz: string | null; tiCy: string | null; tiRu: string | null };

/** Bosqich nomi: shablon elementining lokal nomi, boʻlmasa yaratilgan paytdagi nusxa. */
function stageName(r: StageNameCols, locale: string): string {
  const ti = locale === "ru" ? r.tiRu : locale === "uz-cyrl" ? r.tiCy : r.tiUz;
  return ti || r.snapshot;
}

const stageCols = {
  projectId: projects.id,
  projectName: projects.name,
  stageId: projectStages.id,
  snapshot: projectStages.name,
  tiUz: stageTemplateItems.nameUzLatn,
  tiCy: stageTemplateItems.nameUzCyrl,
  tiRu: stageTemplateItems.nameRu,
};

function stageRef(r: { projectId: string; projectName: string; stageId: string } & StageNameCols, locale: string): WeeklyStageRef {
  return { projectId: r.projectId, projectName: r.projectName, stageId: r.stageId, stageName: stageName(r, locale) };
}

function deptName(r: { name: string | null; uz: string | null; cy: string | null; ru: string | null }, locale: string): string | null {
  if (r.name == null && r.uz == null && r.cy == null && r.ru == null) return null;
  const loc = locale === "ru" ? r.ru : locale === "uz-cyrl" ? r.cy : r.uz;
  return loc || r.name;
}

function pickDeadline(v: unknown): string | null {
  if (v && typeof v === "object" && "plannedDeadline" in v) {
    const d = (v as { plannedDeadline?: unknown }).plannedDeadline;
    return typeof d === "string" && d ? d.slice(0, 10) : null;
  }
  return null;
}

/** Hafta oynasi sharti: col ∈ [start, end). */
function inWindow(col: unknown, startIso: string, endIso: string) {
  return sql`${col} >= ${startIso}::timestamptz AND ${col} < ${endIso}::timestamptz`;
}

/** Faol loyiha: yakunlanmagan / bekor qilinmagan va toʻxtatib turilmagan. */
const ACTIVE_PROJECT = sql`${projects.status} NOT IN ('completed', 'cancelled') AND ${projects.statusOverride} IS DISTINCT FROM 'on_hold'`;

// ---------- snapshotlar ----------

type SnapshotRow = {
  weekStart: string;
  metrics: unknown;
  /** Taxminiy snapshot (keyingi dushanbadan boshqa kunda yaratilgan) — delta/sparkline'ga kirmaydi. */
  estimated: boolean;
  summaryNote: string | null;
  summaryUpdatedAt: Date | null;
  byName: string | null;
};

/** Tanlangan haftagacha boʻlgan snapshotlar (yangi → eski). Taxminiylari ham qaytadi. */
async function readSnapshots(weekStart: string): Promise<SnapshotRow[]> {
  try {
    const rows = await db
      .select({
        weekStart: weeklySnapshots.weekStart,
        metrics: weeklySnapshots.metrics,
        summaryNote: weeklySnapshots.summaryNote,
        summaryUpdatedAt: weeklySnapshots.summaryUpdatedAt,
        byName: users.fullName,
      })
      .from(weeklySnapshots)
      .leftJoin(users, eq(users.id, weeklySnapshots.summaryByUserId))
      .where(sql`${weeklySnapshots.weekStart} <= ${weekStart}::date`)
      .orderBy(desc(weeklySnapshots.weekStart))
      // 12 ta aniq nuqta + orada uchrashi mumkin boʻlgan taxminiy snapshotlar uchun zaxira.
      .limit(24);
    return rows.map((r) => ({
      ...r,
      weekStart: String(r.weekStart).slice(0, 10),
      estimated: isEstimatedMetrics(r.metrics),
    }));
  } catch {
    return []; // 0031 hali qoʻllanmagan
  }
}

// ---------- hodisalar ----------

async function getCompletedStages(startIso: string, endIso: string, locale: string): Promise<WeeklyCompletedStage[]> {
  try {
    const rows = await db
      .select({ ...stageCols, at: projectStages.completedAt })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(inWindow(projectStages.completedAt, startIso, endIso))
      .orderBy(desc(projectStages.completedAt))
      .limit(LIST_LIMIT);
    return rows.flatMap((r) => {
      const at = toDate(r.at);
      return at ? [{ ...stageRef(r, locale), at }] : [];
    });
  } catch {
    return [];
  }
}

/**
 * Rejadagi muddati shu haftaga tushgan va oʻtib ketgan bosqichlar: hali faol yoki
 * muddatidan keyin yakunlangan. (Muddat keyinroq surilgan boʻlsa — joriy qiymat hisoblanadi.)
 */
async function getCrossedDeadline(weekStart: string, endDay: string, locale: string): Promise<WeeklyCrossedDeadline[]> {
  try {
    const rows = await db
      .select({ ...stageCols, deadline: projectStages.plannedDeadline, status: projectStages.status })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(
        sql`${projectStages.plannedDeadline} >= ${weekStart}::date
          AND ${projectStages.plannedDeadline} < ${endDay}::date
          AND ${projectStages.plannedDeadline} < (now() AT TIME ZONE 'Asia/Tashkent')::date
          AND ${projects.status} <> 'cancelled'
          AND (
            ${projectStages.status} = 'active'
            OR (${projectStages.status} = 'completed'
                AND ${projectStages.completedAt} IS NOT NULL
                AND (${projectStages.completedAt} AT TIME ZONE 'Asia/Tashkent')::date > ${projectStages.plannedDeadline})
          )`
      )
      .orderBy(asc(projectStages.plannedDeadline), asc(projects.name))
      .limit(LIST_LIMIT);
    return rows.flatMap((r) =>
      r.deadline
        ? [{ ...stageRef(r, locale), deadline: String(r.deadline).slice(0, 10), stillOpen: r.status === "active" }]
        : []
    );
  } catch {
    return [];
  }
}

/** activity_log 'stage.deadline_changed' + tasdiqlangan studiya 'deadline' soʻrovlari. */
async function getDeadlineMoves(startIso: string, endIso: string, locale: string): Promise<WeeklyDeadlineMove[]> {
  const out: WeeklyDeadlineMove[] = [];
  try {
    const rows = await db
      .select({
        ...stageCols,
        at: activityLog.createdAt,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        by: users.fullName,
      })
      .from(activityLog)
      .innerJoin(projectStages, eq(projectStages.id, activityLog.entityId))
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .leftJoin(users, eq(users.id, activityLog.userId))
      .where(and(eq(activityLog.action, "stage.deadline_changed"), inWindow(activityLog.createdAt, startIso, endIso)))
      .orderBy(desc(activityLog.createdAt))
      .limit(LIST_LIMIT);
    for (const r of rows) {
      const at = toDate(r.at);
      if (!at) continue;
      out.push({
        ...stageRef(r, locale),
        at,
        oldValue: pickDeadline(r.oldValue),
        newValue: pickDeadline(r.newValue),
        by: r.by ?? null,
        viaStudio: false,
      });
    }
  } catch {
    /* activity_log oʻqib boʻlmadi — qolgan manba bilan davom etamiz */
  }
  try {
    const rows = await db
      .select({
        ...stageCols,
        at: stageRequests.decidedAt,
        newValue: stageRequests.requestedDeadline,
        by: users.fullName,
      })
      .from(stageRequests)
      .innerJoin(projectStages, eq(projectStages.id, stageRequests.stageId))
      .innerJoin(projects, eq(projects.id, stageRequests.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .leftJoin(users, eq(users.id, stageRequests.decidedByUserId))
      .where(
        and(
          eq(stageRequests.type, "deadline"),
          eq(stageRequests.status, "approved"),
          inWindow(stageRequests.decidedAt, startIso, endIso)
        )
      )
      .orderBy(desc(stageRequests.decidedAt))
      .limit(LIST_LIMIT);
    for (const r of rows) {
      const at = toDate(r.at);
      if (!at) continue;
      out.push({
        ...stageRef(r, locale),
        at,
        oldValue: null,
        newValue: r.newValue ? String(r.newValue).slice(0, 10) : null,
        by: r.by ?? null,
        viaStudio: true,
      });
    }
  } catch {
    /* stage_requests (0030) yoʻq */
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, LIST_LIMIT);
}

async function getPayments(startIso: string, endIso: string, locale: string, canMoney: boolean): Promise<WeeklyPayment[]> {
  try {
    const rows = await db
      .select({
        ...stageCols,
        amount: stagePayments.amount,
        currency: stagePayments.currency,
        paidAt: stagePayments.paidAt,
      })
      .from(stagePayments)
      .innerJoin(projectStages, eq(projectStages.id, stagePayments.stageId))
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(and(eq(stagePayments.status, "paid"), inWindow(stagePayments.paidAt, startIso, endIso)))
      .orderBy(desc(stagePayments.paidAt))
      .limit(LIST_LIMIT);
    return rows.flatMap((r) => {
      const paidAt = toDate(r.paidAt);
      if (!paidAt) return [];
      const ref = stageRef(r, locale);
      return [
        {
          projectId: ref.projectId,
          projectName: ref.projectName,
          stageId: ref.stageId,
          stageName: ref.stageName,
          // Pul huquqi yoʻq foydalanuvchiga summa umuman yuborilmaydi.
          amount: canMoney ? num(r.amount) : MONEY_MASK,
          currency: r.currency,
          paidAt,
        },
      ];
    });
  } catch {
    return [];
  }
}

async function getNewProjects(startIso: string, endIso: string): Promise<WeeklyNewProject[]> {
  try {
    const rows = await db
      .select({ id: projects.id, name: projects.name, at: projects.createdAt })
      .from(projects)
      .where(inWindow(projects.createdAt, startIso, endIso))
      .orderBy(desc(projects.createdAt))
      .limit(LIST_LIMIT);
    return rows.flatMap((r) => {
      const at = toDate(r.at);
      return at ? [{ id: r.id, name: r.name, at }] : [];
    });
  } catch {
    return [];
  }
}

async function getStudioRequestCounts(startIso: string, endIso: string): Promise<{ opened: number; decided: number }> {
  try {
    const res = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE created_at >= ${startIso}::timestamptz AND created_at < ${endIso}::timestamptz)::int AS opened,
        count(*) FILTER (WHERE decided_at >= ${startIso}::timestamptz AND decided_at < ${endIso}::timestamptz)::int AS decided
      FROM stage_requests
      WHERE (created_at >= ${startIso}::timestamptz AND created_at < ${endIso}::timestamptz)
         OR (decided_at >= ${startIso}::timestamptz AND decided_at < ${endIso}::timestamptz)
    `);
    const r = rowsOf<{ opened: unknown; decided: unknown }>(res)[0];
    return { opened: num(r?.opened), decided: num(r?.decided) };
  } catch {
    return { opened: 0, decided: 0 };
  }
}

// ---------- eʼtibor ----------

/**
 * 14 kundan beri harakatsiz faol loyihalar — BITTA SQL: faol loyihalar ustida NOT EXISTS
 * pastki soʻrovlar (joriy holat yangilanishi, xabar, bosqich hujjati, progress hisoboti).
 * Oxirgi 14 kunda yaratilgan loyihalar hisobga olinmaydi (ular hali "jim" emas).
 */
async function getSilentProjects(): Promise<WeeklySilentProject[]> {
  try {
    const res = await db.execute(sql`
      SELECT x.id, x.name, to_json(x.last_at) #>> '{}' AS last_activity_at
      FROM (
        SELECT
          p.id,
          p.name,
          p.created_at,
          GREATEST(
            (SELECT max(u.created_at) FROM project_status_updates u WHERE u.project_id = p.id),
            (SELECT max(m.created_at) FROM project_messages m WHERE m.project_id = p.id),
            (SELECT max(d.uploaded_at) FROM stage_documents d JOIN project_stages s ON s.id = d.stage_id WHERE s.project_id = p.id),
            (SELECT max(r.created_at) FROM stage_progress_reports r WHERE r.project_id = p.id)
          ) AS last_at
        FROM projects p
        WHERE p.status NOT IN ('completed', 'cancelled')
          AND p.status_override IS DISTINCT FROM 'on_hold'
          AND p.created_at < now() - interval '14 days'
          AND NOT EXISTS (SELECT 1 FROM project_status_updates u WHERE u.project_id = p.id AND u.created_at >= now() - interval '14 days')
          AND NOT EXISTS (SELECT 1 FROM project_messages m WHERE m.project_id = p.id AND m.created_at >= now() - interval '14 days')
          AND NOT EXISTS (
            SELECT 1 FROM stage_documents d JOIN project_stages s ON s.id = d.stage_id
            WHERE s.project_id = p.id AND d.uploaded_at >= now() - interval '14 days'
          )
          AND NOT EXISTS (SELECT 1 FROM stage_progress_reports r WHERE r.project_id = p.id AND r.created_at >= now() - interval '14 days')
      ) x
      ORDER BY x.last_at ASC NULLS FIRST, x.created_at ASC
      LIMIT ${ATTENTION_LIMIT}
    `);
    return rowsOf<{ id: string; name: string; last_activity_at: string | null }>(res).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      lastActivityAt: toDate(r.last_activity_at),
    }));
  } catch {
    return [];
  }
}

/** BKRM koʻrib chiqishini 5 kundan ortiq kutayotgan topshirishlar (studiya loyihalari). */
async function getWaitingReview(locale: string): Promise<WeeklyWaitingReview[]> {
  try {
    const rows = await db
      .select({
        ...stageCols,
        submittedAt: projectStages.submittedAt,
        days: sql<number>`floor(extract(epoch from (now() - ${projectStages.submittedAt})) / 86400)::int`,
      })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(
        sql`${projectStages.status} = 'active'
          AND ${projectStages.reviewStatus} = 'submitted'
          AND ${projects.externalCompanyId} IS NOT NULL
          AND ${projectStages.submittedAt} < now() - interval '5 days'
          AND ${ACTIVE_PROJECT}`
      )
      .orderBy(asc(projectStages.submittedAt))
      .limit(ATTENTION_LIMIT);
    return rows.flatMap((r) => {
      const submittedAt = toDate(r.submittedAt);
      return submittedAt ? [{ ...stageRef(r, locale), submittedAt, days: num(r.days) }] : [];
    });
  } catch {
    return [];
  }
}

/** Shablondagi meʼyoriy muddatdan (default_duration_days) uzoq davom etayotgan faol bosqichlar. */
async function getOverrunning(locale: string): Promise<WeeklyOverrunning[]> {
  try {
    const actual = sql<number>`floor(extract(epoch from (now() - ${projectStages.startedAt})) / 86400)::int`;
    const rows = await db
      .select({
        ...stageCols,
        startedAt: projectStages.startedAt,
        defaultDays: stageTemplateItems.defaultDurationDays,
        actualDays: actual,
      })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .innerJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(
        sql`${projectStages.status} = 'active'
          AND ${projectStages.startedAt} IS NOT NULL
          AND ${stageTemplateItems.defaultDurationDays} > 0
          AND now() - ${projectStages.startedAt} > make_interval(days => ${stageTemplateItems.defaultDurationDays})
          AND ${ACTIVE_PROJECT}`
      )
      .orderBy(desc(sql`(now() - ${projectStages.startedAt}) - make_interval(days => ${stageTemplateItems.defaultDurationDays})`))
      .limit(ATTENTION_LIMIT);
    return rows.flatMap((r) => {
      const startedAt = toDate(r.startedAt);
      return startedAt && r.defaultDays != null
        ? [{ ...stageRef(r, locale), startedAt, defaultDays: r.defaultDays, actualDays: num(r.actualDays) }]
        : [];
    });
  } catch {
    return [];
  }
}

// ---------- topshiriqlar oqimi ----------

async function getThroughput(weekStart: string, startIso: string, endIso: string, locale: string): Promise<WeeklyThroughput> {
  let days: WeeklyThroughput["days"] = [];
  let byDepartment: WeeklyThroughput["byDepartment"] = [];
  try {
    const res = await db.execute(sql`
      WITH days AS (
        SELECT gs::date AS d FROM generate_series(${weekStart}::date, ${weekStart}::date + 6, interval '1 day') gs
      ),
      c AS (
        SELECT (created_at AT TIME ZONE 'Asia/Tashkent')::date AS d, count(*)::int AS n
        FROM tasks
        WHERE created_at >= ${startIso}::timestamptz AND created_at < ${endIso}::timestamptz
        GROUP BY 1
      ),
      k AS (
        SELECT (completed_at AT TIME ZONE 'Asia/Tashkent')::date AS d, count(*)::int AS n
        FROM tasks
        WHERE completed_at >= ${startIso}::timestamptz AND completed_at < ${endIso}::timestamptz
        GROUP BY 1
      )
      SELECT to_char(days.d, 'YYYY-MM-DD') AS d, coalesce(c.n, 0)::int AS created, coalesce(k.n, 0)::int AS completed
      FROM days
      LEFT JOIN c ON c.d = days.d
      LEFT JOIN k ON k.d = days.d
      ORDER BY days.d
    `);
    days = rowsOf<{ d: string; created: unknown; completed: unknown }>(res).map((r) => ({
      date: String(r.d),
      created: num(r.created),
      completed: num(r.completed),
    }));
  } catch {
    days = [];
  }
  try {
    // Asosiy masʼulning boʻlimi boʻyicha. "Kechikkan" — muddati shu haftaga tushgan, oʻtib
    // ketgan va muddatida bajarilmagan topshiriqlar (Toshkent sanasi bilan).
    const res = await db.execute(sql`
      SELECT
        d.name AS name,
        d.name_uz_latn AS uz,
        d.name_uz_cyrl AS cy,
        d.name_ru AS ru,
        count(*) FILTER (WHERE t.created_at >= ${startIso}::timestamptz AND t.created_at < ${endIso}::timestamptz)::int AS created,
        count(*) FILTER (WHERE t.completed_at >= ${startIso}::timestamptz AND t.completed_at < ${endIso}::timestamptz)::int AS completed,
        count(*) FILTER (
          WHERE t.deadline >= ${startIso}::timestamptz AND t.deadline < ${endIso}::timestamptz
            AND t.status <> 'rejected'
            AND (t.deadline AT TIME ZONE 'Asia/Tashkent')::date < (now() AT TIME ZONE 'Asia/Tashkent')::date
            AND (t.completed_at IS NULL
                 OR (t.completed_at AT TIME ZONE 'Asia/Tashkent')::date > (t.deadline AT TIME ZONE 'Asia/Tashkent')::date)
        )::int AS overdue
      FROM tasks t
      JOIN users u ON u.id = t.assigned_to_user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.hidden = false
        AND u.position <> 'kontragent'
        AND (
          (t.created_at >= ${startIso}::timestamptz AND t.created_at < ${endIso}::timestamptz)
          OR (t.completed_at >= ${startIso}::timestamptz AND t.completed_at < ${endIso}::timestamptz)
          OR (t.deadline >= ${startIso}::timestamptz AND t.deadline < ${endIso}::timestamptz)
        )
      GROUP BY d.id, d.name, d.name_uz_latn, d.name_uz_cyrl, d.name_ru
    `);
    byDepartment = rowsOf<{ name: string | null; uz: string | null; cy: string | null; ru: string | null; created: unknown; completed: unknown; overdue: unknown }>(res)
      .map((r) => ({
        department: deptName(r, locale),
        created: num(r.created),
        completed: num(r.completed),
        overdue: num(r.overdue),
      }))
      .filter((r) => r.created + r.completed + r.overdue > 0)
      .sort((a, b) => b.created + b.completed - (a.created + a.completed) || b.overdue - a.overdue);
  } catch {
    byDepartment = [];
  }
  return { days, byDepartment };
}

// ---------- asosiy ----------

/**
 * Tanlangan hafta (dushanba) uchun toʻliq brifing.
 * Snapshot boʻlsa koʻrsatkichlar undan (isEstimate = false), aks holda joyida hisoblanadi
 * (isEstimate = true). `viewer.canMoney` false boʻlsa barcha UZS summalari nolga
 * tushiriladi va toʻlov qatorlarida MONEY_MASK qaytariladi.
 */
export async function getWeeklyBrief(
  weekStart: string,
  viewer: { canMoney: boolean; locale?: string }
): Promise<WeeklyBrief> {
  const locale = viewer.locale ?? "uz-latn";
  const { startIso, endIso, endDay } = weekWindow(weekStart);

  const snapshots = await readSnapshots(weekStart);
  // Xulosa har qanday snapshot qatorida boʻlishi mumkin; koʻrsatkichlar, delta va sparkline
  // esa faqat aniq (taxminiy boʻlmagan) snapshotlardan olinadi.
  const curRow = snapshots.find((s) => s.weekStart === weekStart) ?? null;
  const exact = snapshots.filter((s) => !s.estimated);
  const cur = curRow && !curRow.estimated ? curRow : null;
  const prevRow = exact.find((s) => s.weekStart === addWeeks(weekStart, -1)) ?? null;

  const [
    computed,
    completedStages,
    crossedDeadline,
    deadlineMoves,
    payments,
    newProjects,
    studioRequests,
    silentProjects,
    waitingReview,
    overrunning,
    throughput,
  ] = await Promise.all([
    cur ? Promise.resolve(null) : computeWeeklyMetrics(db, weekStart).catch(() => ({ ...EMPTY_METRICS })),
    getCompletedStages(startIso, endIso, locale),
    getCrossedDeadline(weekStart, endDay, locale),
    getDeadlineMoves(startIso, endIso, locale),
    getPayments(startIso, endIso, locale, viewer.canMoney),
    getNewProjects(startIso, endIso),
    getStudioRequestCounts(startIso, endIso),
    getSilentProjects(),
    getWaitingReview(locale),
    getOverrunning(locale),
    getThroughput(weekStart, startIso, endIso, locale),
  ]);

  const mask = (m: WeeklyMetrics): WeeklyMetrics => (viewer.canMoney ? m : { ...m, paidUzs: 0 });

  const metrics = mask(cur ? normalizeMetrics(cur.metrics) : (computed ?? { ...EMPTY_METRICS }));
  const prev = prevRow ? mask(normalizeMetrics(prevRow.metrics)) : null;
  const series = exact
    .slice(0, 12)
    .reverse()
    .map((s) => ({ weekStart: s.weekStart, metrics: mask(normalizeMetrics(s.metrics)) }));

  const note = curRow?.summaryNote?.trim() ? curRow.summaryNote : null;

  return {
    weekStart,
    metrics,
    isEstimate: !cur,
    prev,
    series,
    canMoney: viewer.canMoney,
    events: { completedStages, crossedDeadline, deadlineMoves, payments, newProjects, studioRequests },
    attention: { silentProjects, waitingReview, overrunning },
    throughput,
    summary: note ? { note, byName: curRow?.byName ?? null, at: curRow?.summaryUpdatedAt ?? null } : null,
  };
}
