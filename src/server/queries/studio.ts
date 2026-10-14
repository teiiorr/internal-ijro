import "server-only";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activityLog,
  externalCompanies,
  projects,
  projectStages,
  projectStudios,
  stagePayments,
  projectStatusUpdates,
  stageProgressReports,
  stageRequests,
  users,
} from "@/lib/db/schema";

// Studiya portali kengaytmasi uchun o'qish so'rovlari. Yangi jadvallarga (0030)
// tegadigan hamma o'qishlar try/catch bilan himoyalangan: migratsiya hali
// qo'llanmagan bo'lsa sahifa buzilmaydi — shunchaki yangi bo'limlar bo'sh ko'rinadi.

export type StudioCompany = { id: string; name: string };

/** Kontragent foydalanuvchisining studiyasini email bo'yicha topadi (registrga befarq). */
export async function getStudioCompany(email: string | null | undefined): Promise<StudioCompany | null> {
  if (!email) return null;
  const [c] = await db
    .select({ id: externalCompanies.id, name: externalCompanies.name })
    .from(externalCompanies)
    .where(sql`lower(${externalCompanies.contactEmail}) = ${email.toLowerCase()}`)
    .limit(1);
  return c ?? null;
}

// ---------------- Studiya a'zoligi (0034) ----------------
// Bitta loyihada bir neçta studiya bölişi mumkin: `projects.external_company_id` —
// ASOSIY studiya, `project_studios` esa qöşimça (ikkinçi, uçinçi …) studiyalar.
// Kompaniya loyihani faqat ASOSIY studiya bölgani YOKI şu loyiha uçun
// `project_studios` da aniq qator bölgani uçun köradi/boşqaradi — boşqa heç nima.

/** Kompaniya (studiya) a'zo bölgan loyihalar id'lari (project_studios jadvalidan).
 * Jadval hali böʻlmasa (42P01 — 0034 migratsiyasi qöllanmagan) xavfsiz tarzda [] qaytaradi,
 * şunda çaqiruvçi faqat asosiy external_company_id böyiça filtrlaşga qaytadi. */
export async function fetchCompanyStudioProjectIds(companyId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ projectId: projectStudios.projectId })
      .from(projectStudios)
      .where(eq(projectStudios.companyId, companyId));
    return rows.map((r) => r.projectId);
  } catch {
    // project_studios hali yöq (0034 qöllanmagan) — asosiy-studiya rejimiga tuşamiz.
    return [];
  }
}

/** Kompaniya şu loyihaning studiyasimi: ASOSIY (primaryCompanyId === companyId) YOKI
 * `project_studios` da (projectId, companyId) qatori mavjud. Yakka loyiha avtorizatsiyasi uçun.
 * Jadval böʻlmasa yoki xatolikda — hiçbir holatda ruxsat bermaydi (false). */
export async function isCompanyStudioOfProject(
  projectId: string,
  companyId: string,
  primaryCompanyId: string | null,
): Promise<boolean> {
  if (primaryCompanyId === companyId) return true;
  try {
    const [row] = await db
      .select({ projectId: projectStudios.projectId })
      .from(projectStudios)
      .where(and(eq(projectStudios.projectId, projectId), eq(projectStudios.companyId, companyId)))
      .limit(1);
    return !!row;
  } catch {
    return false;
  }
}

/** Kontragent foydalanuvchisi (email) şu loyiha bilan işlay oladimi: studiyasi email böyiça
 * (registrga befarq) topiladi, keyin ASOSIY studiya YOKI `project_studios` a'zoligi tekşiriladi.
 * Studiyaning barça YOZUV amallari (xabar, öqildi, topşiriş, hisobot, söʻrov) uçun yagona manba —
 * öqiş tomonidagi (portal sahifalari) tekşiruv bilan bir xil, aks holda qöşimça studiya çatni
 * köradi-yu, yoza olmaydi. */
export async function studioUserCanAccessProject(email: string | null | undefined, projectId: string): Promise<boolean> {
  const company = await getStudioCompany(email);
  if (!company) return false;
  const [prj] = await db
    .select({ ec: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!prj) return false;
  return isCompanyStudioOfProject(projectId, company.id, prj.ec);
}

/** Loyihaning BARÇA studiyalari (asosiy + `project_studios`) aloqa foydalanuvçilarining id'lari —
 * xodim yozganda xabarnoma şularga boradi. */
export async function projectStudioContactUserIds(projectId: string, primaryCompanyId: string | null): Promise<string[]> {
  const companyIds = new Set<string>();
  if (primaryCompanyId) companyIds.add(primaryCompanyId);
  try {
    const rows = await db
      .select({ companyId: projectStudios.companyId })
      .from(projectStudios)
      .where(eq(projectStudios.projectId, projectId));
    for (const r of rows) companyIds.add(r.companyId);
  } catch {
    /* project_studios hali yöq (0034 qöllanmagan) — faqat asosiy studiya */
  }
  if (companyIds.size === 0) return [];
  const companies = await db
    .select({ email: externalCompanies.contactEmail })
    .from(externalCompanies)
    .where(inArray(externalCompanies.id, [...companyIds]));
  const emails = companies.map((c) => c.email?.toLowerCase()).filter((e): e is string => !!e);
  if (emails.length === 0) return [];
  const contacts = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(sql`lower(${users.email})`, emails));
  return contacts.map((u) => u.id);
}

// ---------------- Studiya samaradorligi (scorecard) ----------------

export type StudioScorecard = {
  completedStages: number;
  onTimePct: number | null; // null — muddatli yakunlangan bosqiç yoʻq
  avgDurationDays: number | null;
  revisions: number; // "qayta koʻrib chiqish soʻraldi" soni
  projectCount: number;
  completedProjects: number;
};

/**
 * Studiya samaradorligi — uning loyiha bosqichlaridan hisoblanadi: muddatida
 * topshirish %, yakunlangan bosqichlar, oʻrtacha bosqich davomiyligi (kun),
 * doʻkonga qaytarilgan (changes_requested) soni. Reyting = muddat intizomi.
 */
export async function getStudioScorecard(companyId: string): Promise<StudioScorecard> {
  const extraIds = await fetchCompanyStudioProjectIds(companyId);
  const prjRows = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(or(eq(projects.externalCompanyId, companyId), extraIds.length ? inArray(projects.id, extraIds) : sql`false`));
  const projectIds = prjRows.map((p) => p.id);
  const projectCount = prjRows.length;
  const completedProjects = prjRows.filter((p) => p.status === "completed").length;
  if (projectIds.length === 0) {
    return { completedStages: 0, onTimePct: null, avgDurationDays: null, revisions: 0, projectCount, completedProjects };
  }

  const [agg] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${projectStages.status} = 'completed')::int`,
      onTime: sql<number>`count(*) filter (where ${projectStages.status} = 'completed' and ${projectStages.plannedDeadline} is not null and ${projectStages.completedAt}::date <= ${projectStages.plannedDeadline})::int`,
      withDeadline: sql<number>`count(*) filter (where ${projectStages.status} = 'completed' and ${projectStages.plannedDeadline} is not null)::int`,
      avgDays: sql<number | null>`avg(extract(epoch from (${projectStages.completedAt} - ${projectStages.startedAt})) / 86400.0) filter (where ${projectStages.status} = 'completed' and ${projectStages.startedAt} is not null and ${projectStages.completedAt} is not null)`,
    })
    .from(projectStages)
    .where(inArray(projectStages.projectId, projectIds));

  const [rev] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(activityLog)
    .innerJoin(projectStages, eq(projectStages.id, activityLog.entityId))
    .where(and(eq(activityLog.action, "stage.changes_requested"), inArray(projectStages.projectId, projectIds)));

  return {
    completedStages: agg?.completed ?? 0,
    onTimePct: agg && agg.withDeadline > 0 ? Math.round((agg.onTime / agg.withDeadline) * 100) : null,
    avgDurationDays: agg?.avgDays != null ? Math.round(Number(agg.avgDays)) : null,
    revisions: rev?.n ?? 0,
    projectCount,
    completedProjects,
  };
}

// ---------------- Joriy holat ----------------

export type StatusUpdate = { text: string; at: Date; byName: string | null; byStudio: boolean };

export async function getLatestStatusUpdates(projectIds: string[]): Promise<Map<string, StatusUpdate>> {
  const out = new Map<string, StatusUpdate>();
  if (projectIds.length === 0) return out;
  try {
    const rows = await db
      .selectDistinctOn([projectStatusUpdates.projectId], {
        projectId: projectStatusUpdates.projectId,
        text: projectStatusUpdates.text,
        at: projectStatusUpdates.createdAt,
        byName: users.fullName,
        position: users.position,
      })
      .from(projectStatusUpdates)
      .leftJoin(users, eq(users.id, projectStatusUpdates.updatedByUserId))
      .where(inArray(projectStatusUpdates.projectId, projectIds))
      .orderBy(projectStatusUpdates.projectId, desc(projectStatusUpdates.createdAt));
    for (const r of rows) {
      out.set(r.projectId, { text: r.text, at: r.at as Date, byName: r.byName ?? null, byStudio: r.position === "kontragent" });
    }
  } catch { /* 0030 migratsiyasi hali qo'llanmagan */ }
  return out;
}

// ---------------- Bosqich progressi ----------------

export type StageProgress = { progress: number; note: string | null; at: Date; byName: string | null };

export async function getLatestStageProgress(stageIds: string[]): Promise<Map<string, StageProgress>> {
  const out = new Map<string, StageProgress>();
  if (stageIds.length === 0) return out;
  try {
    const rows = await db
      .selectDistinctOn([stageProgressReports.stageId], {
        stageId: stageProgressReports.stageId,
        progress: stageProgressReports.progress,
        note: stageProgressReports.note,
        at: stageProgressReports.createdAt,
        byName: users.fullName,
      })
      .from(stageProgressReports)
      .leftJoin(users, eq(users.id, stageProgressReports.reportedByUserId))
      .where(inArray(stageProgressReports.stageId, stageIds))
      .orderBy(stageProgressReports.stageId, desc(stageProgressReports.createdAt));
    for (const r of rows) out.set(r.stageId, { progress: r.progress, note: r.note, at: r.at as Date, byName: r.byName ?? null });
  } catch { /* migratsiya qo'llanmagan */ }
  return out;
}

// ---------------- Studiya so'rovlari ----------------

export type StageRequestRow = {
  id: string;
  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;
  type: "deadline" | "blocker";
  status: "pending" | "approved" | "rejected" | "resolved";
  message: string;
  requestedDeadline: string | null;
  currentDeadline: string | null;
  requestedByName: string | null;
  decisionNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  studioName: string | null;
  companyId: string | null;
};

export async function listStageRequests(filter: {
  projectId?: string;
  stageId?: string;
  companyId?: string;
  status?: "pending";
  limit?: number;
}): Promise<StageRequestRow[]> {
  try {
    const conds = [];
    if (filter.projectId) conds.push(eq(stageRequests.projectId, filter.projectId));
    if (filter.stageId) conds.push(eq(stageRequests.stageId, filter.stageId));
    if (filter.companyId) {
      // Asosiy studiya YOKI project_studios a'zoligi (0034).
      const ids = await fetchCompanyStudioProjectIds(filter.companyId);
      conds.push(or(eq(projects.externalCompanyId, filter.companyId), ids.length ? inArray(projects.id, ids) : sql`false`));
    }
    if (filter.status) conds.push(eq(stageRequests.status, filter.status));
    const rows = await db
      .select({
        id: stageRequests.id,
        projectId: stageRequests.projectId,
        projectName: projects.name,
        stageId: stageRequests.stageId,
        stageName: projectStages.name,
        type: stageRequests.type,
        status: stageRequests.status,
        message: stageRequests.message,
        requestedDeadline: stageRequests.requestedDeadline,
        currentDeadline: projectStages.plannedDeadline,
        requestedByName: users.fullName,
        decisionNote: stageRequests.decisionNote,
        decidedAt: stageRequests.decidedAt,
        createdAt: stageRequests.createdAt,
        studioName: externalCompanies.name,
        companyId: projects.externalCompanyId,
      })
      .from(stageRequests)
      .innerJoin(projects, eq(projects.id, stageRequests.projectId))
      .innerJoin(projectStages, eq(projectStages.id, stageRequests.stageId))
      .leftJoin(users, eq(users.id, stageRequests.requestedByUserId))
      .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
      .where(conds.length ? and(...conds) : undefined)
      // Kutilayotganlar har doim tepada, so'ng eng yangilari.
      .orderBy(sql`case when ${stageRequests.status} = 'pending' then 0 else 1 end`, desc(stageRequests.createdAt))
      .limit(filter.limit ?? 50);
    return rows as StageRequestRow[];
  } catch {
    return [];
  }
}

export async function countPendingRequests(companyId?: string): Promise<number> {
  try {
    // Asosiy studiya YOKI project_studios a'zoligi (0034).
    let companyMatch;
    if (companyId) {
      const ids = await fetchCompanyStudioProjectIds(companyId);
      companyMatch = or(eq(projects.externalCompanyId, companyId), ids.length ? inArray(projects.id, ids) : sql`false`);
    }
    const [r] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(stageRequests)
      .innerJoin(projects, eq(projects.id, stageRequests.projectId))
      .where(companyMatch ? and(eq(stageRequests.status, "pending"), companyMatch) : eq(stageRequests.status, "pending"));
    return Number(r?.c ?? 0);
  } catch {
    return 0;
  }
}

// ---------------- To'lovlar ----------------

export type StudioPayment = {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "paid";
  paidAt: Date | null;
  note: string | null;
  createdAt: Date;
  projectId: string;
  projectName: string;
  stageName: string;
  stageOrder: number;
};

export async function getStudioPayments(companyId: string) {
  // Asosiy studiya YOKI project_studios a'zoligi (0034).
  const ids = await fetchCompanyStudioProjectIds(companyId);
  const rows = await db
    .select({
      id: stagePayments.id,
      amount: stagePayments.amount,
      currency: stagePayments.currency,
      status: stagePayments.status,
      paidAt: stagePayments.paidAt,
      note: stagePayments.note,
      createdAt: stagePayments.createdAt,
      projectId: projects.id,
      projectName: projects.name,
      stageName: projectStages.name,
      stageOrder: projectStages.orderIndex,
    })
    .from(stagePayments)
    .innerJoin(projectStages, eq(projectStages.id, stagePayments.stageId))
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(or(eq(projects.externalCompanyId, companyId), ids.length ? inArray(projects.id, ids) : sql`false`))
    .orderBy(desc(stagePayments.createdAt));

  const items: StudioPayment[] = rows.map((r) => ({
    ...r,
    amount: Number(r.amount),
    status: r.status === "paid" ? "paid" : "pending",
    paidAt: (r.paidAt as Date | null) ?? null,
    createdAt: r.createdAt as Date,
  }));
  // Valyuta bo'yicha jamlanma (aralash valyutalarni qo'shib yubormaslik uchun).
  const totals = new Map<string, { paid: number; pending: number }>();
  for (const p of items) {
    const t = totals.get(p.currency) ?? { paid: 0, pending: 0 };
    if (p.status === "paid") t.paid += p.amount; else t.pending += p.amount;
    totals.set(p.currency, t);
  }
  return { items, totals: [...totals.entries()].map(([currency, v]) => ({ currency, ...v })) };
}

// ---------------- Muddatlar ----------------

export type StudioDeadline = {
  stageId: string;
  stageName: string;
  stageOrder: number;
  status: string;
  reviewStatus: string;
  deadline: string;
  projectId: string;
  projectName: string;
};

/** Studiya loyihalaridagi yakunlanmagan bosqichlarning muddatlari (eng yaqini birinchi). */
export async function getStudioDeadlines(companyId: string, limit = 100): Promise<StudioDeadline[]> {
  // Asosiy studiya YOKI project_studios a'zoligi (0034).
  const ids = await fetchCompanyStudioProjectIds(companyId);
  const rows = await db
    .select({
      stageId: projectStages.id,
      stageName: projectStages.name,
      stageOrder: projectStages.orderIndex,
      status: projectStages.status,
      reviewStatus: projectStages.reviewStatus,
      deadline: projectStages.plannedDeadline,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(and(
      or(eq(projects.externalCompanyId, companyId), ids.length ? inArray(projects.id, ids) : sql`false`),
      sql`${projectStages.plannedDeadline} is not null`,
      sql`${projectStages.status} <> 'completed'`,
    ))
    .orderBy(asc(projectStages.plannedDeadline))
    .limit(limit);
  return rows.filter((r) => r.deadline) as StudioDeadline[];
}

// ---------------- Studiya bosh sahifasi ----------------

export async function getStudioDashboard(companyId: string) {
  // Asosiy studiya YOKI project_studios a'zoligi (0034) — barcha studiya loyihalari.
  const studioIds = await fetchCompanyStudioProjectIds(companyId);
  const companyMatch = or(eq(projects.externalCompanyId, companyId), studioIds.length ? inArray(projects.id, studioIds) : sql`false`);

  const [stageAgg] = await db
    .select({
      activeProjects: sql<number>`count(distinct ${projects.id}) filter (where ${projects.status} not in ('completed','cancelled'))::int`,
      myTurn: sql<number>`count(*) filter (where ${projectStages.status} = 'active' and ${projectStages.reviewStatus} in ('in_progress','changes_requested'))::int`,
      changesRequested: sql<number>`count(*) filter (where ${projectStages.status} = 'active' and ${projectStages.reviewStatus} = 'changes_requested')::int`,
      awaitingReview: sql<number>`count(*) filter (where ${projectStages.status} = 'active' and ${projectStages.reviewStatus} = 'submitted')::int`,
      overdue: sql<number>`count(*) filter (where ${projectStages.status} <> 'completed' and ${projectStages.plannedDeadline} < current_date)::int`,
    })
    .from(projects)
    .leftJoin(projectStages, eq(projectStages.projectId, projects.id))
    .where(companyMatch);

  // Studiyaning navbati bo'lgan faol bosqichlar — "Sizdan kutilmoqda" ro'yxati.
  const actionStages = await db
    .select({
      stageId: projectStages.id,
      stageName: projectStages.name,
      reviewStatus: projectStages.reviewStatus,
      reviewNote: projectStages.reviewNote,
      deadline: projectStages.plannedDeadline,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(and(
      companyMatch,
      eq(projectStages.status, "active"),
      inArray(projectStages.reviewStatus, ["in_progress", "changes_requested"]),
    ))
    .orderBy(sql`case when ${projectStages.reviewStatus} = 'changes_requested' then 0 else 1 end`, asc(projectStages.plannedDeadline))
    .limit(8);

  const [payments, deadlines, pendingRequests] = await Promise.all([
    getStudioPayments(companyId),
    getStudioDeadlines(companyId, 5),
    countPendingRequests(companyId),
  ]);

  return {
    kpi: {
      activeProjects: Number(stageAgg?.activeProjects ?? 0),
      myTurn: Number(stageAgg?.myTurn ?? 0),
      changesRequested: Number(stageAgg?.changesRequested ?? 0),
      awaitingReview: Number(stageAgg?.awaitingReview ?? 0),
      overdue: Number(stageAgg?.overdue ?? 0),
      pendingRequests,
    },
    actionStages,
    deadlines,
    paymentTotals: payments.totals,
    recentPayments: payments.items.slice(0, 5),
  };
}
