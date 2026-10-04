import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  externalCompanies,
  projectCurators,
  projectStages,
  projects,
  projectTypes,
  stageTemplateItems,
  users,
} from "@/lib/db/schema";
import { localizedTypeName } from "@/server/queries/stages";
import { deriveStageBars, tashkentToday, type TLProject, type TLStage } from "@/lib/projects/timeline";

export type PortfolioFilters = {
  search?: string | null;
  typeId?: string | null;
  studioId?: string | null;
  curatorId?: string | null;
  overdueOnly?: boolean;
  includeCompleted?: boolean;
};

export type PortfolioOption = { id: string; name: string };

export type PortfolioTimelineData = {
  projects: TLProject[];
  studios: PortfolioOption[];
  curators: { id: string; fullName: string }[];
  types: PortfolioOption[];
  /** Loyihalar soni limitga yetdi — eng yangi PORTFOLIO_PROJECT_LIMIT tasi koʻrsatilmoqda. */
  limited: boolean;
};

/** Bitta sahifada koʻrsatiladigan loyihalarning eng koʻp soni (eng yangilari). */
export const PORTFOLIO_PROJECT_LIMIT = 300;
const PROJECT_LIMIT = PORTFOLIO_PROJECT_LIMIT;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASHKENT_OFFSET_MS = 5 * 3_600_000;

/** URL'dan kelgan id — faqat toza uuid (aks holda Postgres "invalid input syntax" beradi). */
function uuidOrNull(v: string | null | undefined): string | null {
  const s = v?.trim();
  return s && UUID_RE.test(s) ? s : null;
}

/** ILIKE uchun % _ \ belgilarini ekranlaydi. */
function likePattern(s: string): string {
  return `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** date ustuni ("YYYY-MM-DD") yoki timestamp → Toshkent kalendar sanasi. */
function dayOf(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 10);
  const t = v.getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

function stageName(
  row: { tiUz: string | null; tiCy: string | null; tiRu: string | null; snapshot: string },
  locale: string,
): string {
  const loc = locale === "ru" ? row.tiRu : locale === "uz-cyrl" ? row.tiCy : row.tiUz;
  return loc ?? row.snapshot;
}

function typeName(
  row: { typeUz: string | null; typeCy: string | null; typeRu: string | null },
  locale: string,
): string | null {
  if (!row.typeUz) return null;
  return localizedTypeName(
    { nameUzLatn: row.typeUz, nameUzCyrl: row.typeCy ?? row.typeUz, nameRu: row.typeRu ?? row.typeUz },
    locale,
  );
}

const byName = <T,>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));

/**
 * Portfel Gant diagrammasi uchun maʼlumot. Loyihalar soniga bogʻliq boʻlmagan holda
 * aniq 3 ta maʼlumot soʻrovi (loyihalar → bosqichlar ‖ kuratorlar) va bitta
 * filtr variantlari soʻrovi (loyihalar soʻrovi bilan parallel). Pul koʻrsatilmaydi.
 */
export async function getPortfolioTimeline(
  f: PortfolioFilters,
  locale: string,
): Promise<PortfolioTimelineData> {
  const typeId = uuidOrNull(f.typeId);
  const studioId = uuidOrNull(f.studioId);
  const curatorId = uuidOrNull(f.curatorId);
  const search = f.search?.trim() || null;
  const today = tashkentToday();

  const primaryCurator = alias(users, "primary_curator");

  const baseConds: SQL[] = [];
  if (!f.includeCompleted) baseConds.push(ne(projects.status, "completed"));
  if (search) baseConds.push(ilike(projects.name, likePattern(search)));
  if (typeId) baseConds.push(eq(projects.projectTypeId, typeId));
  if (studioId) baseConds.push(eq(projects.externalCompanyId, studioId));
  if (f.overdueOnly) {
    // SQL'da kechikkan chiziqlarning ustki toʻplami (aniq tekshiruv pastda, deriveStageBars bilan).
    // Shusiz "faqat kechikkanlar" eng yangi 300 ta loyiha ichidangina qidirardi.
    baseConds.push(
      sql`(exists (select 1 from project_stages s where s.project_id = ${projects.id} and s.status = 'active' and s.planned_deadline < ${today}::date)
        or (not exists (select 1 from project_stages s2 where s2.project_id = ${projects.id})
            and ${projects.deadline} < ${today}::date and ${projects.progressPercentage} < 100))`,
    );
  }

  const selectProjects = (withCuratorTable: boolean) => {
    const conds = [...baseConds];
    if (curatorId) {
      conds.push(
        withCuratorTable
          ? or(
              eq(projects.curatorUserId, curatorId),
              sql`exists (select 1 from project_curators pc where pc.project_id = ${projects.id} and pc.user_id = ${curatorId})`,
            )!
          : eq(projects.curatorUserId, curatorId),
      );
    }
    return db
      .select({
        id: projects.id,
        name: projects.name,
        posterUrl: projects.posterUrl,
        startDate: projects.startDate,
        deadline: projects.deadline,
        progress: projects.progressPercentage,
        studioId: projects.externalCompanyId,
        studioName: externalCompanies.name,
        typeId: projects.projectTypeId,
        typeUz: projectTypes.nameUzLatn,
        typeCy: projectTypes.nameUzCyrl,
        typeRu: projectTypes.nameRu,
        curatorUserId: projects.curatorUserId,
        curatorName: primaryCurator.fullName,
        curatorAvatar: primaryCurator.avatarUrl,
      })
      .from(projects)
      .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
      .leftJoin(projectTypes, eq(projectTypes.id, projects.projectTypeId))
      .leftJoin(primaryCurator, eq(primaryCurator.id, projects.curatorUserId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(projects.createdAt))
      .limit(PROJECT_LIMIT);
  };

  // Soʻrov 1 (loyihalar) + filtr variantlari — parallel.
  const [projectRows, options] = await Promise.all([
    // project_curators jadvali yoʻq boʻlsa (eski DB) — faqat asosiy kurator ustuni boʻyicha.
    selectProjects(true).catch((err: unknown) => {
      if (curatorId) return selectProjects(false);
      throw err;
    }),
    loadOptions(locale),
  ]);

  const ids = projectRows.map((r) => r.id);

  // Soʻrov 2 (bosqichlar) ‖ Soʻrov 3 (kuratorlar) — har ikkisi ham bitta IN (...) bilan.
  const responsible = alias(users, "responsible");
  const [stageRows, curatorRows] = await Promise.all([
    ids.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: projectStages.id,
            projectId: projectStages.projectId,
            snapshot: projectStages.name,
            orderIndex: projectStages.orderIndex,
            status: projectStages.status,
            reviewStatus: projectStages.reviewStatus,
            plannedStart: projectStages.plannedStartDate,
            plannedDeadline: projectStages.plannedDeadline,
            startedAt: projectStages.startedAt,
            completedAt: projectStages.completedAt,
            tiUz: stageTemplateItems.nameUzLatn,
            tiCy: stageTemplateItems.nameUzCyrl,
            tiRu: stageTemplateItems.nameRu,
            responsibleName: responsible.fullName,
          })
          .from(projectStages)
          .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
          .leftJoin(responsible, eq(responsible.id, projectStages.responsibleUserId))
          .where(inArray(projectStages.projectId, ids))
          .orderBy(asc(projectStages.projectId), asc(projectStages.orderIndex)),
    ids.length === 0
      ? Promise.resolve([])
      : db
          .select({
            projectId: projectCurators.projectId,
            id: users.id,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          })
          .from(projectCurators)
          .innerJoin(users, eq(users.id, projectCurators.userId))
          .where(inArray(projectCurators.projectId, ids))
          .orderBy(asc(projectCurators.orderIndex), asc(users.fullName))
          // project_curators hali migratsiya qilinmagan boʻlsa — projects.curator_user_id ga qaytamiz.
          .catch(() => [] as { projectId: string; id: string; fullName: string; avatarUrl: string | null }[]),
  ]);

  const stagesByProject = new Map<string, TLStage[]>();
  for (const s of stageRows) {
    const list = stagesByProject.get(s.projectId) ?? [];
    list.push({
      id: s.id,
      name: stageName(s, locale),
      orderIndex: s.orderIndex,
      status: s.status,
      reviewStatus: s.reviewStatus,
      plannedStart: dayOf(s.plannedStart),
      plannedDeadline: dayOf(s.plannedDeadline),
      startedAt: dayOf(s.startedAt),
      completedAt: dayOf(s.completedAt),
      responsibleName: s.responsibleName ?? null,
    });
    stagesByProject.set(s.projectId, list);
  }

  const curatorsByProject = new Map<string, TLProject["curators"]>();
  for (const c of curatorRows) {
    const list = curatorsByProject.get(c.projectId) ?? [];
    list.push({ id: c.id, fullName: c.fullName, avatarUrl: c.avatarUrl });
    curatorsByProject.set(c.projectId, list);
  }

  let list: TLProject[] = projectRows.map((r) => {
    const fromTable = curatorsByProject.get(r.id);
    const curators =
      fromTable && fromTable.length > 0
        ? fromTable
        : r.curatorUserId && r.curatorName
          ? [{ id: r.curatorUserId, fullName: r.curatorName, avatarUrl: r.curatorAvatar ?? null }]
          : [];
    return {
      id: r.id,
      name: r.name,
      posterUrl: r.posterUrl,
      startDate: dayOf(r.startDate),
      deadline: dayOf(r.deadline),
      progress: r.progress ?? 0,
      studioId: r.studioId,
      studioName: r.studioName ?? null,
      typeId: r.typeId,
      typeName: typeName(r, locale),
      curators,
      stages: stagesByProject.get(r.id) ?? [],
    };
  });

  if (f.overdueOnly) {
    list = list.filter((p) => deriveStageBars(p, today).some((b) => b.late));
  }

  // Variantlar: alohida soʻrov natijasi + joriy natijadagi qiymatlar (soʻrov yiqilsa ham ishlaydi).
  const studios = new Map(options.studios.map((s) => [s.id, s.name]));
  const types = new Map(options.types.map((s) => [s.id, s.name]));
  const curators = new Map(options.curators.map((s) => [s.id, s.fullName]));
  for (const p of list) {
    if (p.studioId && p.studioName && !studios.has(p.studioId)) studios.set(p.studioId, p.studioName);
    if (p.typeId && p.typeName && !types.has(p.typeId)) types.set(p.typeId, p.typeName);
    if (!options.ok) for (const c of p.curators) if (!curators.has(c.id)) curators.set(c.id, c.fullName);
  }

  return {
    projects: list,
    limited: projectRows.length >= PROJECT_LIMIT,
    studios: [...studios].map(([id, name]) => ({ id, name })).sort(byName((x) => x.name)),
    types: [...types].map(([id, name]) => ({ id, name })),
    curators: [...curators].map(([id, fullName]) => ({ id, fullName })).sort(byName((x) => x.fullName)),
  };
}

type OptionRow = {
  kind: "s" | "t" | "c";
  id: string;
  name: string;
  name_cy: string | null;
  name_ru: string | null;
};

/**
 * Filtr variantlari bitta UNION soʻrovida: loyihalarda ishlatilgan studiyalar,
 * faol ishlab chiqarish turlari va kurator boʻlgan xodimlar (kontragent va
 * yashirin xodimlarsiz). Xatoda boʻsh roʻyxat — sahifa baribir ochiladi.
 */
async function loadOptions(locale: string): Promise<{
  ok: boolean;
  studios: PortfolioOption[];
  types: PortfolioOption[];
  curators: { id: string; fullName: string }[];
}> {
  try {
    const rows = (await db.execute(sql`
      (select 's' as kind, ec.id::text as id, ec.name as name, null::text as name_cy, null::text as name_ru, 0 as ord
         from external_companies ec
        where exists (select 1 from projects p where p.external_company_id = ec.id))
      union all
      (select 't', pt.id::text, pt.name_uz_latn, pt.name_uz_cyrl, pt.name_ru, pt.order_index
         from project_types pt
        where pt.is_active = true)
      union all
      (select 'c', u.id::text, u.full_name, null, null, 0
         from users u
        where u.position <> 'kontragent'
          and u.hidden = false
          and (exists (select 1 from projects p where p.curator_user_id = u.id)
               or exists (select 1 from project_curators pc where pc.user_id = u.id)))
      order by 1, 6, 3
    `)) as unknown as OptionRow[];
    const studios: PortfolioOption[] = [];
    const types: PortfolioOption[] = [];
    const curators: { id: string; fullName: string }[] = [];
    for (const r of rows) {
      if (r.kind === "s") studios.push({ id: r.id, name: r.name });
      else if (r.kind === "t")
        types.push({
          id: r.id,
          name: localizedTypeName(
            { nameUzLatn: r.name, nameUzCyrl: r.name_cy ?? r.name, nameRu: r.name_ru ?? r.name },
            locale,
          ),
        });
      else curators.push({ id: r.id, fullName: r.name });
    }
    return { ok: true, studios, types, curators };
  } catch {
    return { ok: false, studios: [], types: [], curators: [] };
  }
}
