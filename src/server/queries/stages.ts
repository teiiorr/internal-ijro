import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
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
import { fetchProjectCurators } from "@/server/queries/projects";

// ---------- lokalizatsiya yordamçilari ----------
type LocalizedNames = { nameUzLatn: string; nameUzCyrl: string; nameRu: string };

/** Joriy til uçun körsatiladigan nomni tanlaydi (lotin alifbosiga qaytadi). */
export function localizedTypeName(row: LocalizedNames, locale: string): string {
  if (locale === "ru") return row.nameRu;
  if (locale === "uz-cyrl") return row.nameUzCyrl;
  return row.nameUzLatn;
}

/** Boğlangan şablon elementidan lokallaştirilgan bosqiç nomi, bölmasa nusxaga qaytadi. */
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
  reviewStatus: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  submittedAt: Date | null;
  requirements: string | null;
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

/** Turi belgilangan loyihaning töliq köriniş: loyiha + tur + tartiblangan bosqiçlar (tölov jamlanmalari bilan). */
export async function getStageProject(projectId: string, locale: string) {
  const p = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (p.length === 0 || !p[0].projectTypeId) return null; // faqat turi belgilangan loyihalar

  const [typeRow] = await db
    .select()
    .from(projectTypes)
    .where(eq(projectTypes.id, p[0].projectTypeId))
    .limit(1);

  const curator = p[0].curatorUserId
    ? (await db.select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, p[0].curatorUserId)).limit(1))[0] ?? null
    : null;
  const curators = await fetchProjectCurators(projectId, p[0].curatorUserId);

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
      reviewStatus: projectStages.reviewStatus,
      reviewNote: projectStages.reviewNote,
      reviewedAt: projectStages.reviewedAt,
      submittedAt: projectStages.submittedAt,
      requirements: projectStages.requirements,
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
      reviewStatus: s.reviewStatus,
      reviewNote: s.reviewNote,
      reviewedAt: s.reviewedAt,
      submittedAt: s.submittedAt,
      requirements: s.requirements,
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

  // Loyiha darajasidagi hujjat guruhlari (tahlil / xalqaro tajriba).
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
    curators,
    company,
    stages,
    totals,
    documents,
  };
}

/** Bitta bosqiç tafsiloti: bosqiç + hujjatlar + tölovlar + navigatsiya uçun qöşni bosqiçlar tartibi. */
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
      reviewStatus: projectStages.reviewStatus,
      reviewNote: projectStages.reviewNote,
      reviewedAt: projectStages.reviewedAt,
      submittedAt: projectStages.submittedAt,
      requirements: projectStages.requirements,
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
    // Şu loyihada istalgan joyda işlatilgan noyob papka nomlari → avtotöldiriş takliflari.
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
      reviewStatus: s.reviewStatus,
      reviewNote: s.reviewNote,
      reviewedAt: s.reviewedAt,
      submittedAt: s.submittedAt,
      requirements: s.requirements,
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

/** 9 ta faol tur, lokallaştirilgan — yaratiş formasi va filtr paneli uçun. */
/** Loyiha turi böyiça guruhlangan bosqiç nomi variantlari, şunda röyxat filtri
 *  "bosqiç" ochilma röyxatini tanlangan tur bilan çeklaydi. value = nusxa nameUzLatn
 *  (listProjects dagi faol-bosqiç filtriga mos keladi). */
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
 * Studiyalararo "sizni kutmoqda" navbati: studiya körib çiqiş uçun yuborgan
 * har bir FAOL bosqiç, studiya böyiça guruhlangan, eng eskisi birinçi. Qisman
 * project_stages_review_idx indeksidan foydalanadi (0025-migratsiya).
 */
export async function getReviewQueue() {
  const rows = await db
    .select({
      stageId: projectStages.id,
      stageName: projectStages.name,
      submittedAt: projectStages.submittedAt,
      projectId: projects.id,
      projectName: projects.name,
      studioId: externalCompanies.id,
      studioName: externalCompanies.name,
      studioLogo: externalCompanies.logoUrl,
      submittedByName: users.fullName,
    })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .innerJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .leftJoin(users, eq(users.id, projectStages.submittedByUserId))
    .where(and(eq(projectStages.status, "active"), eq(projectStages.reviewStatus, "submitted")))
    .orderBy(asc(projectStages.submittedAt));

  type Stage = { stageId: string; projectId: string; projectName: string; stageName: string; submittedAt: Date | string | null; submittedByName: string | null };
  const groups = new Map<string, { studioId: string; studioName: string; studioLogo: string | null; oldestSubmittedAt: Date | string | null; stages: Stage[] }>();
  for (const r of rows) {
    const g = groups.get(r.studioId) ?? { studioId: r.studioId, studioName: r.studioName, studioLogo: r.studioLogo, oldestSubmittedAt: r.submittedAt, stages: [] };
    g.stages.push({ stageId: r.stageId, projectId: r.projectId, projectName: r.projectName, stageName: r.stageName, submittedAt: r.submittedAt, submittedByName: r.submittedByName });
    groups.set(r.studioId, g);
  }
  return [...groups.values()];
}

/** Barcha studiyalar böyiça körib çiqiş uçun yuborilgan faol bosqiçlar soni (navigatsiya belgisi). */
export async function getReviewQueueCount(): Promise<number> {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(and(eq(projectStages.status, "active"), eq(projectStages.reviewStatus, "submitted"), sql`${projects.externalCompanyId} is not null`));
  return Number(r?.c ?? 0);
}
