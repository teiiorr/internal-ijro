import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  externalCompanies,
  projectCurators,
  projects,
  projectStages,
  projectTypes,
  stageRequests,
  stageTemplateItems,
  users,
} from "@/lib/db/schema";
import { stageDeadlineChanges, type DeadlineChangeSource } from "@/lib/db/tables/deadline-slippage";
import {
  avgSlipPerStage,
  buildBenchmarks,
  durationDays,
  projectSlip,
  type BenchmarkRow,
  type BenchmarkSample,
  type DeadlineChangeLite,
  type SlippageFilters,
  type StageLite,
} from "@/lib/projects/slippage";
import { listProjectTypes, localizedTypeName } from "@/server/queries/stages";

// Muddat surilishi tahlili. stage_deadline_changes (0031) oʻqishlari try/catch bilan
// himoyalangan: migratsiya hali qoʻllanmagan boʻlsa boʻlimlar shunchaki boʻsh koʻrinadi.

const HISTORY_LIMIT = 200;

function stageLabel(
  row: { tiUz: string | null; tiCy: string | null; tiRu: string | null; snapshot: string },
  locale: string
): string {
  const loc = locale === "ru" ? row.tiRu : locale === "uz-cyrl" ? row.tiCy : row.tiUz;
  return loc ?? row.snapshot;
}

/** Kuzatuv boshlangan payt: tizimdagi birinchi backfill boʻlmagan yozuv (ISO) yoki null. */
async function getTrackingSince(): Promise<string | null> {
  try {
    const [r] = await db
      .select({ v: sql<Date | null>`min(${stageDeadlineChanges.createdAt})`.mapWith(stageDeadlineChanges.createdAt) })
      .from(stageDeadlineChanges)
      .where(ne(stageDeadlineChanges.source, "backfill"));
    return r?.v ? new Date(r.v).toISOString() : null;
  } catch {
    return null;
  }
}

// ---------------- loyiha sahifasi: muddat tarixi ----------------

export type DeadlineHistoryItem = {
  id: string;
  stageId: string;
  stageName: string;
  oldDeadline: string | null;
  newDeadline: string | null;
  deltaDays: number | null;
  source: DeadlineChangeSource;
  reason: string | null;
  byName: string | null;
  byAvatar: string | null;
  createdAt: Date;
};

export async function getProjectDeadlineHistory(
  projectId: string,
  locale: string
): Promise<{ changes: DeadlineHistoryItem[]; trackingSince: string | null }> {
  try {
    const rows = await db
      .select({
        id: stageDeadlineChanges.id,
        stageId: stageDeadlineChanges.stageId,
        snapshot: projectStages.name,
        tiUz: stageTemplateItems.nameUzLatn,
        tiCy: stageTemplateItems.nameUzCyrl,
        tiRu: stageTemplateItems.nameRu,
        oldDeadline: stageDeadlineChanges.oldDeadline,
        newDeadline: stageDeadlineChanges.newDeadline,
        deltaDays: stageDeadlineChanges.deltaDays,
        source: stageDeadlineChanges.source,
        reason: stageDeadlineChanges.reason,
        byName: users.fullName,
        byAvatar: users.avatarUrl,
        createdAt: stageDeadlineChanges.createdAt,
      })
      .from(stageDeadlineChanges)
      .innerJoin(projectStages, eq(projectStages.id, stageDeadlineChanges.stageId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .leftJoin(users, eq(users.id, stageDeadlineChanges.changedByUserId))
      .where(eq(stageDeadlineChanges.projectId, projectId))
      .orderBy(desc(stageDeadlineChanges.createdAt))
      .limit(HISTORY_LIMIT);
    if (rows.length === 0) return { changes: [], trackingSince: null };
    const changes: DeadlineHistoryItem[] = rows.map((r) => ({
      id: r.id,
      stageId: r.stageId,
      stageName: stageLabel(r, locale),
      oldDeadline: r.oldDeadline,
      newDeadline: r.newDeadline,
      deltaDays: r.deltaDays,
      source: r.source,
      reason: r.reason,
      byName: r.byName ?? null,
      byAvatar: r.byAvatar ?? null,
      createdAt: r.createdAt,
    }));
    return { changes, trackingSince: await getTrackingSince() };
  } catch {
    return { changes: [], trackingSince: null };
  }
}

// ---------------- /reports/slippage ----------------

export type SlippageProjectRow = {
  projectId: string;
  projectName: string;
  studioName: string | null;
  typeName: string | null;
  baselineEnd: string | null;
  currentEnd: string | null;
  slipDays: number | null;
  reschedules: number;
  /** Shulardan studiya soʻrovi orqali boʻlganlari. */
  studioReschedules: number;
  studioShare: number | null;
};

export type SlippageStudioRow = {
  studioId: string;
  studioName: string;
  avgSlipPerStage: number | null;
  reschedules: number;
  extApproved: number;
  extRejected: number;
};

export type SlippageReport = {
  projects: SlippageProjectRow[];
  studios: SlippageStudioRow[];
  benchmarks: BenchmarkRow[];
  trackingSince: string | null;
};

type BaseProject = {
  id: string;
  name: string;
  studioId: string | null;
  studioName: string | null;
  typeUz: string;
  typeCy: string;
  typeRu: string;
};

/** Filtrlarga mos, turi belgilangan (bosqichli) loyihalar. */
async function loadProjects(f: SlippageFilters): Promise<BaseProject[]> {
  const run = (withCuratorsTable: boolean) => {
    const conds: SQL[] = [isNotNull(projects.projectTypeId)];
    if (f.typeId) conds.push(eq(projects.projectTypeId, f.typeId));
    if (f.studioId) conds.push(eq(projects.externalCompanyId, f.studioId));
    if (f.curatorId) {
      const primary = eq(projects.curatorUserId, f.curatorId);
      conds.push(
        withCuratorsTable
          ? or(
              primary,
              sql`exists (select 1 from ${projectCurators} where ${projectCurators.projectId} = ${projects.id} and ${projectCurators.userId} = ${f.curatorId})`
            )!
          : primary
      );
    }
    return db
      .select({
        id: projects.id,
        name: projects.name,
        studioId: projects.externalCompanyId,
        studioName: externalCompanies.name,
        typeUz: projectTypes.nameUzLatn,
        typeCy: projectTypes.nameUzCyrl,
        typeRu: projectTypes.nameRu,
      })
      .from(projects)
      .innerJoin(projectTypes, eq(projectTypes.id, projects.projectTypeId))
      .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
      .where(and(...conds));
  };
  try {
    return await run(true);
  } catch {
    // project_curators hali yoʻq — faqat asosiy kurator boʻyicha filtrlaymiz.
    return f.curatorId ? run(false) : [];
  }
}

async function loadChanges(ids: string[]): Promise<(DeadlineChangeLite & { projectId: string })[]> {
  if (ids.length === 0) return [];
  try {
    return await db
      .select({
        projectId: stageDeadlineChanges.projectId,
        stageId: stageDeadlineChanges.stageId,
        oldDeadline: stageDeadlineChanges.oldDeadline,
        newDeadline: stageDeadlineChanges.newDeadline,
        deltaDays: stageDeadlineChanges.deltaDays,
        source: stageDeadlineChanges.source,
        createdAt: stageDeadlineChanges.createdAt,
      })
      .from(stageDeadlineChanges)
      .where(inArray(stageDeadlineChanges.projectId, ids));
  } catch {
    return [];
  }
}

async function loadExtensionCounts(ids: string[]): Promise<Map<string, { approved: number; rejected: number }>> {
  const out = new Map<string, { approved: number; rejected: number }>();
  if (ids.length === 0) return out;
  try {
    const rows = await db
      .select({
        studioId: projects.externalCompanyId,
        status: stageRequests.status,
        c: sql<number>`count(*)::int`,
      })
      .from(stageRequests)
      .innerJoin(projects, eq(projects.id, stageRequests.projectId))
      .where(
        and(
          inArray(stageRequests.projectId, ids),
          eq(stageRequests.type, "deadline"),
          inArray(stageRequests.status, ["approved", "rejected"]),
          isNotNull(projects.externalCompanyId)
        )
      )
      .groupBy(projects.externalCompanyId, stageRequests.status);
    for (const r of rows) {
      if (!r.studioId) continue;
      const cur = out.get(r.studioId) ?? { approved: 0, rejected: 0 };
      if (r.status === "approved") cur.approved += Number(r.c);
      else if (r.status === "rejected") cur.rejected += Number(r.c);
      out.set(r.studioId, cur);
    }
  } catch { /* stage_requests (0030) hali yoʻq */ }
  return out;
}

/**
 * Rejalashtirish aniqligi: yakunlangan bosqichlarning haqiqiy davomiyligi shablon meʼyori
 * (default_duration_days) bilan. Birlashtirilgan bloklar (merge_with_next) chiqarib tashlanadi —
 * ular bir bosishda yakunlanadi va davomiyligi bosqichning oʻziga tegishli emas.
 */
async function loadBenchmarks(ids: string[], locale: string): Promise<BenchmarkRow[]> {
  if (ids.length === 0) return [];
  try {
    const prev = alias(projectStages, "prev_stage");
    const rows = await db
      .select({
        templateItemId: projectStages.templateItemId,
        startedAt: projectStages.startedAt,
        completedAt: projectStages.completedAt,
        tiUz: stageTemplateItems.nameUzLatn,
        tiCy: stageTemplateItems.nameUzCyrl,
        tiRu: stageTemplateItems.nameRu,
        snapshot: projectStages.name,
        defaultDays: stageTemplateItems.defaultDurationDays,
        itemOrder: stageTemplateItems.orderIndex,
        typeUz: projectTypes.nameUzLatn,
        typeCy: projectTypes.nameUzCyrl,
        typeRu: projectTypes.nameRu,
        typeOrder: projectTypes.orderIndex,
      })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .innerJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .innerJoin(projectTypes, eq(projectTypes.id, projects.projectTypeId))
      .leftJoin(
        prev,
        and(eq(prev.projectId, projectStages.projectId), eq(prev.orderIndex, sql`${projectStages.orderIndex} - 1`))
      )
      .where(
        and(
          inArray(projectStages.projectId, ids),
          eq(projectStages.status, "completed"),
          isNotNull(projectStages.startedAt),
          isNotNull(projectStages.completedAt),
          eq(projectStages.mergeWithNext, false),
          sql`coalesce(${prev.mergeWithNext}, false) = false`
        )
      );
    const samples: BenchmarkSample[] = [];
    for (const r of rows) {
      if (!r.templateItemId || !r.startedAt || !r.completedAt) continue;
      samples.push({
        templateItemId: r.templateItemId,
        stageName: stageLabel(r, locale),
        typeName: localizedTypeName({ nameUzLatn: r.typeUz, nameUzCyrl: r.typeCy, nameRu: r.typeRu }, locale),
        defaultDays: r.defaultDays,
        days: durationDays(r.startedAt, r.completedAt),
        typeOrder: r.typeOrder,
        itemOrder: r.itemOrder,
      });
    }
    return buildBenchmarks(samples);
  } catch {
    return [];
  }
}

export async function getSlippageReport(f: SlippageFilters, locale: string): Promise<SlippageReport> {
  const empty: SlippageReport = { projects: [], studios: [], benchmarks: [], trackingSince: null };
  let base: BaseProject[];
  try {
    base = await loadProjects(f);
  } catch {
    return empty;
  }
  const ids = base.map((p) => p.id);

  const stagesP: Promise<(StageLite & { projectId: string })[]> =
    ids.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: projectStages.id,
            projectId: projectStages.projectId,
            orderIndex: projectStages.orderIndex,
            plannedDeadline: projectStages.plannedDeadline,
          })
          .from(projectStages)
          .where(inArray(projectStages.projectId, ids))
          .catch(() => []);

  const [stages, changes, ext, benchmarks, trackingSince] = await Promise.all([
    stagesP,
    loadChanges(ids),
    loadExtensionCounts(ids),
    loadBenchmarks(ids, locale),
    getTrackingSince(),
  ]);

  const stagesBy = new Map<string, StageLite[]>();
  for (const s of stages) {
    const list = stagesBy.get(s.projectId) ?? [];
    list.push(s);
    stagesBy.set(s.projectId, list);
  }
  const changesBy = new Map<string, DeadlineChangeLite[]>();
  for (const c of changes) {
    const list = changesBy.get(c.projectId) ?? [];
    list.push(c);
    changesBy.set(c.projectId, list);
  }

  type StudioAcc = { name: string; stageCount: number; reschedules: number; totalDelta: number };
  const studioAcc = new Map<string, StudioAcc>();
  const projectRows: SlippageProjectRow[] = [];

  for (const p of base) {
    const pStages = stagesBy.get(p.id) ?? [];
    const pChanges = changesBy.get(p.id) ?? [];
    const slip = projectSlip(pStages, pChanges);

    if (p.studioId) {
      const acc = studioAcc.get(p.studioId) ?? { name: p.studioName ?? "", stageCount: 0, reschedules: 0, totalDelta: 0 };
      acc.stageCount += pStages.length;
      acc.reschedules += slip.reschedules;
      acc.totalDelta += slip.rescheduleDelta;
      studioAcc.set(p.studioId, acc);
    }

    // Faqat muddat oʻzgarishlari qayd etilgan loyihalar reytingga kiradi.
    if (pChanges.length === 0) continue;
    projectRows.push({
      projectId: p.id,
      projectName: p.name,
      studioName: p.studioName ?? null,
      typeName: localizedTypeName({ nameUzLatn: p.typeUz, nameUzCyrl: p.typeCy, nameRu: p.typeRu }, locale),
      baselineEnd: slip.baselineEnd,
      currentEnd: slip.currentEnd,
      slipDays: slip.slipDays,
      reschedules: slip.reschedules,
      studioReschedules: slip.studioReschedules,
      studioShare: slip.studioShare,
    });
  }

  projectRows.sort(
    (a, b) =>
      (b.slipDays ?? Number.NEGATIVE_INFINITY) - (a.slipDays ?? Number.NEGATIVE_INFINITY) ||
      b.reschedules - a.reschedules ||
      a.projectName.localeCompare(b.projectName)
  );

  const studios: SlippageStudioRow[] = [];
  for (const [studioId, acc] of studioAcc) {
    const e = ext.get(studioId) ?? { approved: 0, rejected: 0 };
    if (acc.reschedules === 0 && e.approved === 0 && e.rejected === 0) continue;
    studios.push({
      studioId,
      studioName: acc.name,
      avgSlipPerStage: avgSlipPerStage(acc.totalDelta, acc.stageCount),
      reschedules: acc.reschedules,
      extApproved: e.approved,
      extRejected: e.rejected,
    });
  }
  studios.sort(
    (a, b) =>
      (b.avgSlipPerStage ?? Number.NEGATIVE_INFINITY) - (a.avgSlipPerStage ?? Number.NEGATIVE_INFINITY) ||
      b.reschedules - a.reschedules ||
      a.studioName.localeCompare(b.studioName)
  );

  return { projects: projectRows, studios, benchmarks, trackingSince };
}

// ---------------- filtr variantlari ----------------

export type SlippageFilterOptions = {
  types: { id: string; name: string }[];
  studios: { id: string; name: string }[];
  curators: { id: string; name: string }[];
};

export async function getSlippageFilterOptions(locale: string): Promise<SlippageFilterOptions> {
  const typesP = listProjectTypes(locale)
    .then((rows) => rows.map(({ id, name }) => ({ id, name })))
    .catch(() => []);

  const studiosP = db
    .selectDistinct({ id: externalCompanies.id, name: externalCompanies.name })
    .from(projects)
    .innerJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .where(isNotNull(projects.projectTypeId))
    .orderBy(asc(externalCompanies.name))
    .catch(() => []);

  // Kuratorlar: asosiy (projects.curator_user_id) + qoʻshimcha (project_curators); faqat ichki, koʻrinadigan xodimlar.
  const staffOnly = and(ne(users.position, "kontragent"), eq(users.hidden, false));
  const primaryP = db
    .selectDistinct({ id: users.id, name: users.fullName })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.curatorUserId))
    .where(and(isNotNull(projects.projectTypeId), staffOnly))
    .catch(() => []);
  const extraP = db
    .selectDistinct({ id: users.id, name: users.fullName })
    .from(projectCurators)
    .innerJoin(projects, eq(projects.id, projectCurators.projectId))
    .innerJoin(users, eq(users.id, projectCurators.userId))
    .where(and(isNotNull(projects.projectTypeId), staffOnly))
    .catch(() => []);

  const [types, studios, primary, extra] = await Promise.all([typesP, studiosP, primaryP, extraP]);
  const curators = new Map<string, { id: string; name: string }>();
  for (const c of [...primary, ...extra]) curators.set(c.id, c);
  return {
    types,
    studios,
    curators: [...curators.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
