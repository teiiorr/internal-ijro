import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  externalCompanies,
  projects,
  projectStages,
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
    if (filter.companyId) conds.push(eq(projects.externalCompanyId, filter.companyId));
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
    const [r] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(stageRequests)
      .innerJoin(projects, eq(projects.id, stageRequests.projectId))
      .where(companyId ? and(eq(stageRequests.status, "pending"), eq(projects.externalCompanyId, companyId)) : eq(stageRequests.status, "pending"));
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
    .where(eq(projects.externalCompanyId, companyId))
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
      eq(projects.externalCompanyId, companyId),
      sql`${projectStages.plannedDeadline} is not null`,
      sql`${projectStages.status} <> 'completed'`,
    ))
    .orderBy(asc(projectStages.plannedDeadline))
    .limit(limit);
  return rows.filter((r) => r.deadline) as StudioDeadline[];
}

// ---------------- Studiya bosh sahifasi ----------------

export async function getStudioDashboard(companyId: string) {
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
    .where(eq(projects.externalCompanyId, companyId));

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
      eq(projects.externalCompanyId, companyId),
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
