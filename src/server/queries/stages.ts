import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  projectTypes,
  projectStages,
  stageTemplateItems,
  stageDocuments,
  projectDocuments,
  stagePayments,
  externalCompanies,
  users,
} from "@/lib/db/schema";

// ---------- localization helpers ----------
type LocalizedNames = { nameUzLatn: string; nameUzCyrl: string; nameRu: string };

/** Pick the display name for the current locale (falls back to Latin). */
export function localizedTypeName(row: LocalizedNames, locale: string): string {
  if (locale === "ru") return row.nameRu;
  if (locale === "uz-cyrl") return row.nameUzCyrl;
  return row.nameUzLatn;
}

/** Localized stage name from the joined template item, falling back to the snapshot. */
function stageName(
  row: { tiUz: string | null; tiCy: string | null; tiRu: string | null; snapshot: string },
  locale: string
): string {
  const loc = locale === "ru" ? row.tiRu : locale === "uz-cyrl" ? row.tiCy : row.tiUz;
  return loc ?? row.snapshot;
}

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export type StageView = {
  id: string;
  orderIndex: number;
  status: string;
  name: string;
  plannedStartDate: string | null;
  plannedDeadline: string | null;
  plannedAmount: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  paid: number;
  pending: number;
};

/** Full typed-project view: project + type + ordered stages (with payment rollups). */
export async function getStageProject(projectId: string, locale: string) {
  const p = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (p.length === 0 || !p[0].projectTypeId) return null; // typed projects only

  const [typeRow] = await db
    .select()
    .from(projectTypes)
    .where(eq(projectTypes.id, p[0].projectTypeId))
    .limit(1);

  const curator = p[0].curatorUserId
    ? (await db.select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, p[0].curatorUserId)).limit(1))[0] ?? null
    : null;

  const company = p[0].externalCompanyId
    ? (await db
        .select({
          id: externalCompanies.id,
          name: externalCompanies.name,
          contactPerson: externalCompanies.contactPerson,
          contactPhone: externalCompanies.contactPhone,
        })
        .from(externalCompanies)
        .where(eq(externalCompanies.id, p[0].externalCompanyId))
        .limit(1))[0] ?? null
    : null;

  const stageRows = await db
    .select({
      id: projectStages.id,
      orderIndex: projectStages.orderIndex,
      status: projectStages.status,
      snapshot: projectStages.name,
      plannedStartDate: projectStages.plannedStartDate,
      plannedDeadline: projectStages.plannedDeadline,
      plannedAmount: projectStages.plannedAmount,
      contractNumber: projectStages.contractNumber,
      mergeWithNext: projectStages.mergeWithNext,
      startedAt: projectStages.startedAt,
      completedAt: projectStages.completedAt,
      responsibleUserId: projectStages.responsibleUserId,
      responsibleName: users.fullName,
      responsibleAvatarUrl: users.avatarUrl,
      tiUz: stageTemplateItems.nameUzLatn,
      tiCy: stageTemplateItems.nameUzCyrl,
      tiRu: stageTemplateItems.nameRu,
    })
    .from(projectStages)
    .leftJoin(users, eq(users.id, projectStages.responsibleUserId))
    .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
    .where(eq(projectStages.projectId, projectId))
    .orderBy(asc(projectStages.orderIndex));

  const stageIds = stageRows.map((s) => s.id);
  const pays = stageIds.length
    ? await db.select().from(stagePayments).where(inArray(stagePayments.stageId, stageIds))
    : [];

  const stages: StageView[] = stageRows.map((s) => {
    const sp = pays.filter((p) => p.stageId === s.id);
    const paid = sum(sp.filter((p) => p.status === "paid").map((p) => num(p.amount)));
    const pending = sum(sp.filter((p) => p.status !== "paid").map((p) => num(p.amount)));
    return {
      id: s.id,
      orderIndex: s.orderIndex,
      status: s.status,
      name: stageName(s, locale),
      plannedStartDate: s.plannedStartDate,
      plannedDeadline: s.plannedDeadline,
      plannedAmount: s.plannedAmount != null ? num(s.plannedAmount) : null,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      responsibleUserId: s.responsibleUserId,
      responsibleName: s.responsibleName,
      paid,
      pending,
    };
  });

  const totals = {
    planned: sum(stages.map((s) => s.plannedAmount ?? 0)),
    paid: sum(stages.map((s) => s.paid)),
    pending: sum(stages.map((s) => s.pending)),
  };

  // Project-level document buckets (analysis / international experience).
  const docRows = await db
    .select({
      id: projectDocuments.id,
      kind: projectDocuments.kind,
      folder: projectDocuments.folder,
      fileUrl: projectDocuments.fileUrl,
      fileName: projectDocuments.fileName,
      fileSize: projectDocuments.fileSize,
      uploadedAt: projectDocuments.uploadedAt,
      uploaderName: users.fullName,
    })
    .from(projectDocuments)
    .leftJoin(users, eq(users.id, projectDocuments.uploadedByUserId))
    .where(eq(projectDocuments.projectId, projectId))
    .orderBy(desc(projectDocuments.uploadedAt));

  const documents = {
    tahlil: docRows.filter((d) => d.kind === "tahlil"),
    xalqaro_tajriba: docRows.filter((d) => d.kind === "xalqaro_tajriba"),
    payment: docRows.filter((d) => d.kind === "payment"),
  };

  return {
    project: p[0],
    type: typeRow ? { ...typeRow, name: localizedTypeName(typeRow, locale) } : null,
    curator,
    company,
    stages,
    totals,
    documents,
  };
}

/** Single stage detail: stage + documents + payments + sibling ordering for nav. */
export async function getStage(stageId: string, locale: string) {
  const rows = await db
    .select({
      id: projectStages.id,
      projectId: projectStages.projectId,
      projectName: projects.name,
      projectTypeId: projects.projectTypeId,
      projectCuratorUserId: projects.curatorUserId,
      orderIndex: projectStages.orderIndex,
      status: projectStages.status,
      snapshot: projectStages.name,
      plannedStartDate: projectStages.plannedStartDate,
      plannedDeadline: projectStages.plannedDeadline,
      plannedAmount: projectStages.plannedAmount,
      contractNumber: projectStages.contractNumber,
      mergeWithNext: projectStages.mergeWithNext,
      startedAt: projectStages.startedAt,
      completedAt: projectStages.completedAt,
      responsibleUserId: projectStages.responsibleUserId,
      responsibleName: users.fullName,
      responsibleAvatarUrl: users.avatarUrl,
      tiUz: stageTemplateItems.nameUzLatn,
      tiCy: stageTemplateItems.nameUzCyrl,
      tiRu: stageTemplateItems.nameRu,
    })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .leftJoin(users, eq(users.id, projectStages.responsibleUserId))
    .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
    .where(eq(projectStages.id, stageId))
    .limit(1);
  if (rows.length === 0) return null;
  const s = rows[0];

  const [documents, payments, siblings, categoryRows] = await Promise.all([
    db
      .select({
        id: stageDocuments.id,
        fileUrl: stageDocuments.fileUrl,
        fileName: stageDocuments.fileName,
        fileSize: stageDocuments.fileSize,
        fileMimeType: stageDocuments.fileMimeType,
        category: stageDocuments.category,
        uploadedAt: stageDocuments.uploadedAt,
        uploadedByUserId: stageDocuments.uploadedByUserId,
        uploaderName: users.fullName,
      })
      .from(stageDocuments)
      .leftJoin(users, eq(users.id, stageDocuments.uploadedByUserId))
      .where(eq(stageDocuments.stageId, stageId))
      .orderBy(desc(stageDocuments.uploadedAt)),
    db.select().from(stagePayments).where(eq(stagePayments.stageId, stageId)).orderBy(desc(stagePayments.createdAt)),
    db
      .select({ id: projectStages.id, orderIndex: projectStages.orderIndex, status: projectStages.status })
      .from(projectStages)
      .where(eq(projectStages.projectId, s.projectId))
      .orderBy(asc(projectStages.orderIndex)),
    // Distinct folder names used anywhere in this project → autocomplete suggestions.
    db
      .selectDistinct({ category: stageDocuments.category })
      .from(stageDocuments)
      .innerJoin(projectStages, eq(projectStages.id, stageDocuments.stageId))
      .where(and(eq(projectStages.projectId, s.projectId), sql`${stageDocuments.category} is not null`)),
  ]);

  const categorySuggestions = categoryRows
    .map((r) => r.category)
    .filter((c): c is string => !!c)
    .sort((a, b) => a.localeCompare(b));

  const paid = sum(payments.filter((p) => p.status === "paid").map((p) => num(p.amount)));
  const pending = sum(payments.filter((p) => p.status !== "paid").map((p) => num(p.amount)));

  return {
    stage: {
      id: s.id,
      projectId: s.projectId,
      projectName: s.projectName,
      projectCuratorUserId: s.projectCuratorUserId,
      orderIndex: s.orderIndex,
      status: s.status,
      name: stageName(s, locale),
      plannedStartDate: s.plannedStartDate,
      plannedDeadline: s.plannedDeadline,
      plannedAmount: s.plannedAmount != null ? num(s.plannedAmount) : null,
      contractNumber: s.contractNumber,
      mergeWithNext: s.mergeWithNext,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      responsibleUserId: s.responsibleUserId,
      responsibleName: s.responsibleName,
      responsibleAvatarUrl: s.responsibleAvatarUrl,
    },
    documents,
    payments,
    totals: { paid, pending },
    siblings,
    categorySuggestions,
  };
}

export type StageProjectFilters = {
  typeId?: string | null;
  status?: string | null;
  responsibleUserId?: string | null;
  from?: string | null;
  to?: string | null;
  payment?: "paid" | "unpaid" | null;
  overdue?: boolean | null;
};

/** Typed-project list with cross-project filters (type/status/responsible/date/paid/overdue). */
export async function listStageProjects(f: StageProjectFilters, locale: string) {
  const conds = [sql`${projects.projectTypeId} is not null`];
  if (f.typeId) conds.push(sql`${projects.projectTypeId} = ${f.typeId}`);
  if (f.status) conds.push(sql`${projects.status} = ${f.status}`);
  if (f.responsibleUserId)
    conds.push(sql`exists (select 1 from ${projectStages} s where s.project_id = ${projects.id} and s.responsible_user_id = ${f.responsibleUserId})`);
  if (f.from) conds.push(gte(projects.deadline, f.from));
  if (f.to) conds.push(lte(projects.deadline, f.to));
  if (f.payment === "unpaid")
    conds.push(sql`exists (select 1 from ${stagePayments} sp join ${projectStages} s on s.id = sp.stage_id where s.project_id = ${projects.id} and sp.status <> 'paid')`);
  if (f.payment === "paid")
    conds.push(sql`not exists (select 1 from ${stagePayments} sp join ${projectStages} s on s.id = sp.stage_id where s.project_id = ${projects.id} and sp.status <> 'paid')`);
  if (f.overdue)
    conds.push(sql`exists (select 1 from ${projectStages} s where s.project_id = ${projects.id} and s.status = 'active' and s.planned_deadline < now()::date)`);

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      statusOverride: projects.statusOverride,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      createdAt: projects.createdAt,
      curatorName: users.fullName,
      typeUz: projectTypes.nameUzLatn,
      typeCy: projectTypes.nameUzCyrl,
      typeRu: projectTypes.nameRu,
      // active stage summary
      activeStageName: sql<string | null>`(
        select coalesce(ti.name_uz_latn, s.name) from ${projectStages} s
        left join ${stageTemplateItems} ti on ti.id = s.template_item_id
        where s.project_id = ${projects.id} and s.status = 'active' order by s.order_index limit 1)`,
      activeStageDeadline: sql<string | null>`(
        select s.planned_deadline from ${projectStages} s
        where s.project_id = ${projects.id} and s.status = 'active' order by s.order_index limit 1)`,
    })
    .from(projects)
    .leftJoin(users, eq(users.id, projects.curatorUserId))
    .leftJoin(projectTypes, eq(projectTypes.id, projects.projectTypeId))
    .where(and(...conds))
    .orderBy(desc(projects.createdAt))
    .limit(200);

  return rows.map((r) => ({
    ...r,
    typeName: localizedTypeName({ nameUzLatn: r.typeUz ?? "", nameUzCyrl: r.typeCy ?? "", nameRu: r.typeRu ?? "" }, locale),
  }));
}

/** The 9 active types, localized — for the create form and filter bar. */
/** Stage-name options grouped by project type, so the list filter can scope the
 *  "stage" dropdown to the selected type. value = snapshot nameUzLatn (matches
 *  the active-stage filter in listProjects). */
export async function listStageOptionsByType(locale: string): Promise<Record<string, { value: string; name: string }[]>> {
  const rows = await db
    .select({
      typeId: projectTypes.id,
      uz: stageTemplateItems.nameUzLatn,
      cy: stageTemplateItems.nameUzCyrl,
      ru: stageTemplateItems.nameRu,
      order: stageTemplateItems.orderIndex,
    })
    .from(projectTypes)
    .innerJoin(stageTemplateItems, eq(stageTemplateItems.templateId, projectTypes.stageTemplateId))
    .where(eq(projectTypes.isActive, true))
    .orderBy(asc(projectTypes.orderIndex), asc(stageTemplateItems.orderIndex));
  const out: Record<string, { value: string; name: string }[]> = {};
  for (const r of rows) {
    (out[r.typeId] ??= []).push({
      value: r.uz,
      name: localizedTypeName({ nameUzLatn: r.uz, nameUzCyrl: r.cy, nameRu: r.ru }, locale),
    });
  }
  return out;
}

export async function listProjectTypes(locale: string) {
  const rows = await db.select().from(projectTypes).where(eq(projectTypes.isActive, true)).orderBy(asc(projectTypes.orderIndex));
  return rows.map((r) => ({ id: r.id, code: r.code, name: localizedTypeName(r, locale) }));
}

/**
 * Distinct stage names across all templates, localized — powers the
 * "filter by current state" dropdown (e.g. "Adabiy ssenariy", "Postprodakshn").
 * The `value` is the Uz-Latn name, which matches project_stages.name (snapshot).
 */
export async function listStageNameOptions(locale: string) {
  const rows = await db
    .selectDistinct({
      uz: stageTemplateItems.nameUzLatn,
      cy: stageTemplateItems.nameUzCyrl,
      ru: stageTemplateItems.nameRu,
      order: stageTemplateItems.orderIndex,
    })
    .from(stageTemplateItems)
    .orderBy(asc(stageTemplateItems.orderIndex), asc(stageTemplateItems.nameUzLatn));
  const seen = new Set<string>();
  const out: { value: string; name: string }[] = [];
  for (const r of rows) {
    if (seen.has(r.uz)) continue;
    seen.add(r.uz);
    out.push({ value: r.uz, name: localizedTypeName({ nameUzLatn: r.uz, nameUzCyrl: r.cy, nameRu: r.ru }, locale) });
  }
  return out;
}
