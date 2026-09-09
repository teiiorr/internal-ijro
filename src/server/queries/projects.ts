import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  projects,
  projectCurators,
  projectTypes,
  projectStages,
  stageDocuments,
  milestones,
  deliverables,
  projectMessages,
  ratings,
  externalCompanies,
  users,
  tasks,
} from "@/lib/db/schema";
import { stageTurn } from "@/lib/projects/progress";

/**
 * Loyihaning barcha kuratorlari (avatar + ism), tartiblangan holda. Boğlovçi jadval
 * böş bölganda YOKI hali migratsiya qilinmaganda eski yagona `curator_user_id`
 * ustuniga qaytadi (şu tufayli 0022 maqsadli DB ga qöllanmasdan oldin ilova heç qaçon işdan çiqmaydi).
 */
export async function fetchProjectCurators(
  projectId: string,
  fallbackCuratorUserId: string | null,
): Promise<Array<{ id: string; fullName: string; avatarUrl: string | null }>> {
  try {
    const rows = await db
      .select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl })
      .from(projectCurators)
      .innerJoin(users, eq(users.id, projectCurators.userId))
      .where(eq(projectCurators.projectId, projectId))
      .orderBy(asc(projectCurators.orderIndex), asc(users.fullName));
    if (rows.length > 0) return rows;
  } catch {
    /* jadval hali migratsiya qilinmagan — yagona kurator ustuniga ötamiz */
  }
  if (fallbackCuratorUserId) {
    return db
      .select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, fallbackCuratorUserId))
      .limit(1);
  }
  return [];
}

export type ProjectFilters = {
  search?: string | null;
  status?: string | null;
  type?: "internal" | "external" | null;
  externalCompanyId?: string | null;
  // işlab çiqarish turi / bosqiç filtrlari (faqat turi belgilangan loyihalarga mos keladi)
  projectTypeId?: string | null;
  responsibleUserId?: string | null;
  payment?: "paid" | "unpaid" | null;
  overdue?: boolean | null;
  from?: string | null;
  to?: string | null;
  /** joriy holat filtri: loyihaning FAOL bosqiçining nusxa nomi (nameUzLatn) */
  stage?: string | null;
};

function typeLabel(row: { typeUz: string | null; typeCy: string | null; typeRu: string | null }, locale?: string): string | null {
  if (!row.typeUz && !row.typeCy && !row.typeRu) return null;
  if (locale === "ru") return row.typeRu;
  if (locale === "uz-cyrl") return row.typeCy;
  return row.typeUz;
}

export async function listProjects(f: ProjectFilters, locale?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conds = [] as any[];
  if (f.search) {
    const s = `%${f.search.toLowerCase()}%`;
    conds.push(or(ilike(projects.name, s), ilike(projects.description, s)));
  }
  if (f.status) conds.push(eq(projects.status, f.status));
  if (f.type) conds.push(eq(projects.type, f.type));
  if (f.externalCompanyId) conds.push(eq(projects.externalCompanyId, f.externalCompanyId));
  if (f.projectTypeId) conds.push(eq(projects.projectTypeId, f.projectTypeId));
  if (f.from) conds.push(gte(projects.deadline, f.from));
  if (f.to) conds.push(lte(projects.deadline, f.to));
  if (f.responsibleUserId)
    conds.push(sql`exists (select 1 from project_stages s where s.project_id = ${projects.id} and s.responsible_user_id = ${f.responsibleUserId})`);
  if (f.payment === "unpaid")
    conds.push(sql`exists (select 1 from stage_payments sp join project_stages s on s.id = sp.stage_id where s.project_id = ${projects.id} and sp.status <> 'paid')`);
  if (f.payment === "paid")
    conds.push(sql`exists (select 1 from stage_payments sp join project_stages s on s.id = sp.stage_id where s.project_id = ${projects.id}) and not exists (select 1 from stage_payments sp join project_stages s on s.id = sp.stage_id where s.project_id = ${projects.id} and sp.status <> 'paid')`);
  if (f.overdue)
    conds.push(sql`exists (select 1 from project_stages s where s.project_id = ${projects.id} and s.status = 'active' and s.planned_deadline < now()::date)`);
  if (f.stage)
    conds.push(sql`exists (select 1 from project_stages s where s.project_id = ${projects.id} and s.status = 'active' and s.name = ${f.stage})`);
  const where = conds.length > 0 ? and(...conds) : undefined;
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      type: projects.type,
      status: projects.status,
      statusOverride: projects.statusOverride,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      startDate: projects.startDate,
      posterUrl: projects.posterUrl,
      genre: projects.genre,
      curatorName: users.fullName,
      companyName: externalCompanies.name,
      projectTypeId: projects.projectTypeId,
      typeUz: projectTypes.nameUzLatn,
      typeCy: projectTypes.nameUzCyrl,
      typeRu: projectTypes.nameRu,
    })
    .from(projects)
    .leftJoin(users, eq(users.id, projects.curatorUserId))
    .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .leftJoin(projectTypes, eq(projectTypes.id, projects.projectTypeId))
    .where(where)
    .orderBy(desc(projects.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, projectTypeName: typeLabel(r, locale) }));
}

export async function getProject(id: string) {
  const p = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (p.length === 0) return null;
  const [company, curator, curators, mls, dlvs, msgs, prjTasks, rt] = await Promise.all([
    p[0].externalCompanyId
      ? db.select().from(externalCompanies).where(eq(externalCompanies.id, p[0].externalCompanyId)).limit(1)
      : Promise.resolve([]),
    p[0].curatorUserId
      ? db.select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, p[0].curatorUserId)).limit(1)
      : Promise.resolve([]),
    fetchProjectCurators(id, p[0].curatorUserId),
    db.select().from(milestones).where(eq(milestones.projectId, id)).orderBy(asc(milestones.orderIndex)),
    db
      .select()
      .from(deliverables)
      .where(
        sql`${deliverables.milestoneId} in (select id from milestones where project_id = ${id}) OR ${deliverables.taskId} in (select id from tasks where project_id = ${id})`
      )
      .orderBy(desc(deliverables.submittedAt)),
    db
      .select({
        id: projectMessages.id,
        content: projectMessages.content,
        createdAt: projectMessages.createdAt,
        userId: projectMessages.userId,
        userName: users.fullName,
        userAvatarUrl: users.avatarUrl,
        attachments: projectMessages.attachments,
      })
      .from(projectMessages)
      .innerJoin(users, eq(users.id, projectMessages.userId))
      .where(eq(projectMessages.projectId, id))
      .orderBy(asc(projectMessages.createdAt)),
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority, deadline: tasks.deadline })
      .from(tasks)
      .where(eq(tasks.projectId, id))
      .orderBy(desc(tasks.createdAt)),
    db.select().from(ratings).where(eq(ratings.projectId, id)),
  ]);
  return {
    project: p[0],
    company: company[0] ?? null,
    curator: curator[0] ?? null,
    curators,
    milestones: mls,
    deliverables: dlvs,
    messages: msgs,
    tasks: prjTasks,
    ratings: rt,
  };
}

export async function listContractors(status?: string | null) {
  const where = status ? eq(externalCompanies.status, status) : undefined;
  return db.select().from(externalCompanies).where(where).orderBy(desc(externalCompanies.createdAt));
}

/** Studiyalar + har biriga biriktirilgan loyihalar (studiyalar sahifasidagi ochilma uçun). */
export async function listContractorsWithProjects() {
  const companies = await db.select().from(externalCompanies).orderBy(desc(externalCompanies.createdAt));
  const prjs = await db
    .select({ id: projects.id, name: projects.name, status: projects.status, ec: projects.externalCompanyId })
    .from(projects)
    .where(sql`${projects.externalCompanyId} is not null`)
    .orderBy(desc(projects.createdAt));
  const byCompany = new Map<string, { id: string; name: string; status: string }[]>();
  for (const p of prjs) {
    if (!p.ec) continue;
    const arr = byCompany.get(p.ec) ?? [];
    arr.push({ id: p.id, name: p.name, status: p.status });
    byCompany.set(p.ec, arr);
  }
  // Har bir studiya böyiça "körib çiqişingizni kutmoqda" soni (körib çiqiş uçun yuborilgan faol bosqiçlar).
  const waiting = new Map<string, number>();
  for (const r of await db
    .select({ ec: projects.externalCompanyId, c: sql<number>`count(*)::int` })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(and(eq(projectStages.status, "active"), eq(projectStages.reviewStatus, "submitted"), sql`${projects.externalCompanyId} is not null`))
    .groupBy(projects.externalCompanyId)) {
    if (r.ec) waiting.set(r.ec, Number(r.c));
  }
  // Har bir studiyaning oxirgi platformaga kirişi (users.lastLoginAt, email böyiça bogʻlanadi).
  const lastLoginByEmail = new Map<string, Date | null>();
  for (const u of await db.select({ email: users.email, lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.position, "kontragent"))) {
    lastLoginByEmail.set(u.email.toLowerCase(), (u.lastLoginAt as Date | null) ?? null);
  }
  return companies.map((c) => ({
    ...c,
    projects: byCompany.get(c.id) ?? [],
    waiting: waiting.get(c.id) ?? 0,
    lastLoginAt: c.contactEmail ? lastLoginByEmail.get(c.contactEmail.toLowerCase()) ?? null : null,
  }));
}

/**
 * Studiya uçun Telegram uslubidagi çatlar röyxati: har bir loyiha uçun bitta suhbat,
 * har biri loyiha kuratori (biz tomon — ular gaplaşadigan odam) va oxirgi xabar bilan.
 */
export async function getContractorChatProjects(contractorUserId: string) {
  const me = await db.select({ email: users.email }).from(users).where(eq(users.id, contractorUserId)).limit(1);
  if (me.length === 0) return { company: null, chats: [] as const };
  const [company] = await db
    .select({ id: externalCompanies.id, name: externalCompanies.name })
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, me[0].email))
    .limit(1);
  if (!company) return { company: null, chats: [] as const };

  const prjs = await db
    .select({ id: projects.id, name: projects.name, posterUrl: projects.posterUrl, curatorUserId: projects.curatorUserId })
    .from(projects)
    .where(eq(projects.externalCompanyId, company.id))
    .orderBy(desc(projects.createdAt));

  const ids = prjs.map((p) => p.id);
  const lastByProject = new Map<string, { content: string; createdAt: Date | string; userName: string | null }>();
  const unreadByProject = new Map<string, number>();
  const curatorIds = Array.from(new Set(prjs.map((p) => p.curatorUserId).filter((x): x is string => !!x)));
  const curById = new Map<string, { fullName: string; avatarUrl: string | null }>();

  if (ids.length) {
    const msgs = await db
      .select({ projectId: projectMessages.projectId, content: projectMessages.content, createdAt: projectMessages.createdAt, userName: users.fullName })
      .from(projectMessages)
      .innerJoin(users, eq(users.id, projectMessages.userId))
      .where(and(inArray(projectMessages.projectId, ids), sql`${projectMessages.stageId} is null`))
      .orderBy(desc(projectMessages.createdAt));
    for (const m of msgs) if (!lastByProject.has(m.projectId)) lastByProject.set(m.projectId, { content: m.content, createdAt: m.createdAt, userName: m.userName });

    // Studiya uçun öqilmagan = biz tomonimizdan yuborilgan (istalgan kanaldagi) va ular hali öqimagan xabarlar.
    for (const r of await db
      .select({ projectId: projectMessages.projectId, c: sql<number>`count(*)::int` })
      .from(projectMessages)
      .where(and(inArray(projectMessages.projectId, ids), sql`${projectMessages.userId} <> ${contractorUserId}`, sql`${projectMessages.readByContractorAt} is null`))
      .groupBy(projectMessages.projectId)) {
      unreadByProject.set(r.projectId, Number(r.c));
    }
  }
  if (curatorIds.length) {
    const curs = await db.select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl }).from(users).where(inArray(users.id, curatorIds));
    for (const c of curs) curById.set(c.id, { fullName: c.fullName, avatarUrl: c.avatarUrl });
  }

  const chats = prjs.map((p) => ({
    id: p.id,
    name: p.name,
    posterUrl: p.posterUrl,
    curator: p.curatorUserId ? curById.get(p.curatorUserId) ?? null : null,
    lastMessage: lastByProject.get(p.id) ?? null,
    unread: unreadByProject.get(p.id) ?? 0,
  }));
  return { company, chats };
}

/** Studiya uçun öqilmagan çat xabarlari umumiy soni (navigatsiya belgisini boşqaradi). */
export async function getContractorUnreadCount(contractorUserId: string): Promise<number> {
  const [me] = await db.select({ email: users.email }).from(users).where(eq(users.id, contractorUserId)).limit(1);
  if (!me) return 0;
  const [company] = await db.select({ id: externalCompanies.id }).from(externalCompanies).where(eq(externalCompanies.contactEmail, me.email)).limit(1);
  if (!company) return 0;
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(projectMessages)
    .innerJoin(projects, eq(projects.id, projectMessages.projectId))
    .where(and(eq(projects.externalCompanyId, company.id), sql`${projectMessages.userId} <> ${contractorUserId}`, sql`${projectMessages.readByContractorAt} is null`));
  return Number(r?.c ?? 0);
}

export async function listProjectsForContractor(contractorUserId: string, locale = "uz-latn") {
  // Kompaniyani kontragent foydalanuvçisi böyiça aniqlaymiz (email moslik böyiça — özi röyxatdan ötgan kontragentlar uçun eng sodda va işonçli boğlaniş usuli)
  const me = await db.select({ email: users.email }).from(users).where(eq(users.id, contractorUserId)).limit(1);
  if (me.length === 0) return { company: null, projects: [] };
  const company = await db
    .select()
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, me[0].email))
    .limit(1);
  if (company.length === 0) return { company: null, projects: [] };
  const prjs = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      statusOverride: projects.statusOverride,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      posterUrl: projects.posterUrl,
      genre: projects.genre,
      projectTypeId: projects.projectTypeId,
      typeUz: projectTypes.nameUzLatn,
      typeCy: projectTypes.nameUzCyrl,
      typeRu: projectTypes.nameRu,
    })
    .from(projects)
    .leftJoin(projectTypes, eq(projectTypes.id, projects.projectTypeId))
    .where(eq(projects.externalCompanyId, company[0].id))
    .orderBy(desc(projects.createdAt));

  // Faol bosqiç nomi + "N tadan X-bosqiç" bilan boyitamiz — "men qayerdaman" signali.
  const ids = prjs.map((p) => p.id);
  const activeByProject = new Map<string, { name: string; orderIndex: number; reviewStatus: string }>();
  const countByProject = new Map<string, number>();
  if (ids.length) {
    const act = await db
      .select({ projectId: projectStages.projectId, name: projectStages.name, orderIndex: projectStages.orderIndex, reviewStatus: projectStages.reviewStatus })
      .from(projectStages)
      .where(and(inArray(projectStages.projectId, ids), eq(projectStages.status, "active")));
    for (const a of act) if (!activeByProject.has(a.projectId)) activeByProject.set(a.projectId, a);
    const cnt = await db
      .select({ projectId: projectStages.projectId, c: sql<number>`count(*)::int` })
      .from(projectStages)
      .where(inArray(projectStages.projectId, ids))
      .groupBy(projectStages.projectId);
    for (const c of cnt) countByProject.set(c.projectId, Number(c.c));
  }

  return {
    company: company[0],
    projects: prjs.map((r) => {
      const a = activeByProject.get(r.id);
      return {
        ...r,
        projectTypeName: typeLabel(r, locale),
        activeStageName: a?.name ?? null,
        activeStageIndex: a ? a.orderIndex + 1 : null,
        activeStageReviewStatus: a?.reviewStatus ?? null,
        totalStages: countByProject.get(r.id) ?? 0,
      };
    }),
  };
}

/**
 * Excel hisoboti (Loyihalar hisoboti) uçun har bir loyiha böyiça tekis qatorlar:
 * nomi, studiya, joriy bosqiç, şartnoma raqami, sanalar va pul summalari
 * (rejalaştirilgan / tölangan / qolgan). Barqaror röyxat uçun eng eskisidan boşlab tartiblangan.
 */
export type ProjectReportRow = {
  name: string;
  studioName: string | null;
  activeStage: string | null;
  contractNumber: string | null;
  startDate: string | null;
  deadline: string | null;
  progress: number;
  statusOverride: string | null;
  deadlineOverdue: boolean;
  plannedTotal: number;
  paidTotal: number;
  stagePlanned: number;
  stagePaid: number;
};

/**
 * Hisobot qatorlari loyihalar röyxatidagi bilan bir xil filtrlarga amal qiladi (qidiruv /
 * loyiha turi / bosqiç / tölov / muddati ötgan). Hosila-holat tabi va holat böyiça
 * ustunlik saralaşi çaqiruvçi (route) tomonidan qöllanadi, çunki hosila holat ustun emas.
 */
export async function listProjectsForReport(f: ProjectFilters = {}): Promise<ProjectReportRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conds = [] as any[];
  if (f.search) {
    const s = `%${f.search.toLowerCase()}%`;
    conds.push(sql`(lower(p.name) like ${s} or lower(coalesce(p.description, '')) like ${s})`);
  }
  if (f.type) conds.push(sql`p.type = ${f.type}`);
  if (f.projectTypeId) conds.push(sql`p.project_type_id = ${f.projectTypeId}`);
  if (f.payment === "unpaid")
    conds.push(sql`exists (select 1 from stage_payments sp join project_stages s on s.id = sp.stage_id where s.project_id = p.id and sp.status <> 'paid')`);
  if (f.payment === "paid")
    conds.push(sql`exists (select 1 from stage_payments sp join project_stages s on s.id = sp.stage_id where s.project_id = p.id) and not exists (select 1 from stage_payments sp join project_stages s on s.id = sp.stage_id where s.project_id = p.id and sp.status <> 'paid')`);
  if (f.overdue)
    conds.push(sql`exists (select 1 from project_stages s where s.project_id = p.id and s.status = 'active' and s.planned_deadline < now()::date)`);
  if (f.stage)
    conds.push(sql`exists (select 1 from project_stages s where s.project_id = p.id and s.status = 'active' and s.name = ${f.stage})`);
  const whereSql = conds.length > 0 ? sql`where ${sql.join(conds, sql` and `)}` : sql``;

  const rows = await db.execute<ProjectReportRow>(sql`
    select
      p.name,
      ec.name as "studioName",
      (select s.name from project_stages s
         where s.project_id = p.id and s.status = 'active'
         order by s.order_index limit 1) as "activeStage",
      coalesce(
        (select s.contract_number from project_stages s
           where s.project_id = p.id and s.status = 'active'
           order by s.order_index limit 1),
        (select s.contract_number from project_stages s
           where s.project_id = p.id
           order by s.order_index desc limit 1)
      ) as "contractNumber",
      to_char(p.start_date, 'DD.MM.YYYY') as "startDate",
      to_char(p.deadline,   'DD.MM.YYYY') as "deadline",
      p.progress_percentage as "progress",
      p.status_override as "statusOverride",
      (p.deadline is not null and p.deadline < now()::date) as "deadlineOverdue",
      coalesce((select sum(s.planned_amount) from project_stages s
                  where s.project_id = p.id), 0)::float8 as "plannedTotal",
      coalesce((select sum(sp.amount) from stage_payments sp
                  join project_stages s on s.id = sp.stage_id
                 where s.project_id = p.id and sp.status = 'paid'), 0)::float8 as "paidTotal",
      coalesce((select s.planned_amount from project_stages s
                  where s.project_id = p.id and s.status = 'active'
                  order by s.order_index limit 1), 0)::float8 as "stagePlanned",
      coalesce((select sum(sp.amount) from stage_payments sp
                  join project_stages s on s.id = sp.stage_id
                 where s.project_id = p.id and s.status = 'active' and sp.status = 'paid'
                  ), 0)::float8 as "stagePaid"
    from projects p
    left join external_companies ec on ec.id = p.external_company_id
    ${whereSql}
    order by p.created_at asc
  `);
  return rows as unknown as ProjectReportRow[];
}

// ── Studiya tafsilotlari sörovlari ──────────────────────────────────────────

export async function getContractorDetail(companyId: string) {
  const [company] = await db.select().from(externalCompanies).where(eq(externalCompanies.id, companyId)).limit(1);
  if (!company) return null;

  // Studiyaning oxirgi platformaga kirişi (users.lastLoginAt, email böyiça bogʻlanadi).
  let lastLoginAt: Date | null = null;
  if (company.contactEmail) {
    const [u] = await db
      .select({ lastLoginAt: users.lastLoginAt })
      .from(users)
      // Registrsiz solishtirish — grid (listContractorsWithProjects) bilan bir xil,
      // chunki external_companies.contact_email doim kiçik harfda saqlanmaydi.
      .where(and(sql`lower(${users.email}) = ${company.contactEmail.toLowerCase()}`, eq(users.position, "kontragent")))
      .limit(1);
    lastLoginAt = (u?.lastLoginAt as Date | null) ?? null;
  }

  const prjs = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      startDate: projects.startDate,
      curatorName: users.fullName,
    })
    .from(projects)
    .leftJoin(users, eq(users.id, projects.curatorUserId))
    .where(eq(projects.externalCompanyId, companyId))
    .orderBy(desc(projects.createdAt));

  const projectIds = prjs.map((p) => p.id);
  if (projectIds.length === 0) return { company, projects: [], stages: [], lastActivity: null, lastLoginAt };

  const stages = await db
    .select({
      id: projectStages.id,
      projectId: projectStages.projectId,
      name: projectStages.name,
      orderIndex: projectStages.orderIndex,
      status: projectStages.status,
    })
    .from(projectStages)
    .where(sql`${projectStages.projectId} in ${projectIds}`)
    .orderBy(asc(projectStages.orderIndex));

  const [lastMsg] = await db
    .select({ ts: projectMessages.createdAt })
    .from(projectMessages)
    .where(sql`${projectMessages.projectId} in ${projectIds}`)
    .orderBy(desc(projectMessages.createdAt))
    .limit(1);
  const [lastDoc] = await db
    .select({ ts: stageDocuments.uploadedAt })
    .from(stageDocuments)
    .innerJoin(projectStages, eq(projectStages.id, stageDocuments.stageId))
    .where(sql`${projectStages.projectId} in ${projectIds}`)
    .orderBy(desc(stageDocuments.uploadedAt))
    .limit(1);
  const lastActivity = [lastMsg?.ts, lastDoc?.ts].filter(Boolean).sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] ?? null;

  return { company, projects: prjs, stages, lastActivity, lastLoginAt };
}

/**
 * Studiyani körib çiqiş ish maydoni (xodimlar uçun /contractors/[id]): studiyaning har bir
 * loyihasi özining FAOL bosqiçi (körib çiqiş maydonlari + yuborilgan fayllar) va
 * kimning navbati signali bilan boyitilgan, şunda xodimlar Студии bölimidan çiqmasdan
 * turib körib çiqadi/qabul qiladi/özgartiriş söraydi.
 */
export async function getContractorReviewProjects(companyId: string) {
  const prjs = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      posterUrl: projects.posterUrl,
      curatorName: users.fullName,
    })
    .from(projects)
    .leftJoin(users, eq(users.id, projects.curatorUserId))
    .where(eq(projects.externalCompanyId, companyId))
    .orderBy(desc(projects.createdAt));

  const ids = prjs.map((p) => p.id);
  if (ids.length === 0) return [];

  const totals = new Map<string, number>();
  for (const r of await db
    .select({ projectId: projectStages.projectId, c: sql<number>`count(*)::int` })
    .from(projectStages)
    .where(inArray(projectStages.projectId, ids))
    .groupBy(projectStages.projectId)) {
    totals.set(r.projectId, Number(r.c));
  }

  // Har bir loyihaning barcha bosqichlari (vazifa dialogidagi tanlagich uçun).
  const stagesByProject = new Map<string, { id: string; name: string; orderIndex: number; status: string }[]>();
  for (const s of await db
    .select({ projectId: projectStages.projectId, id: projectStages.id, name: projectStages.name, orderIndex: projectStages.orderIndex, status: projectStages.status })
    .from(projectStages)
    .where(inArray(projectStages.projectId, ids))
    .orderBy(asc(projectStages.orderIndex))) {
    const arr = stagesByProject.get(s.projectId) ?? [];
    arr.push({ id: s.id, name: s.name, orderIndex: s.orderIndex, status: s.status });
    stagesByProject.set(s.projectId, arr);
  }

  const acts = await db
    .select({
      projectId: projectStages.projectId,
      id: projectStages.id,
      name: projectStages.name,
      orderIndex: projectStages.orderIndex,
      reviewStatus: projectStages.reviewStatus,
      reviewNote: projectStages.reviewNote,
      reviewedAt: projectStages.reviewedAt,
      submittedAt: projectStages.submittedAt,
      requirements: projectStages.requirements,
      plannedDeadline: projectStages.plannedDeadline,
      submittedByName: users.fullName,
    })
    .from(projectStages)
    .leftJoin(users, eq(users.id, projectStages.submittedByUserId))
    .where(and(inArray(projectStages.projectId, ids), eq(projectStages.status, "active")));
  const activeByProject = new Map<string, (typeof acts)[number]>();
  for (const a of acts) if (!activeByProject.has(a.projectId)) activeByProject.set(a.projectId, a);

  const activeStageIds = acts.map((a) => a.id);
  const docsByStage = new Map<string, { id: string; fileUrl: string; fileName: string; fileSize: number | null; category: string | null; uploadedAt: Date | string; uploaderName: string | null }[]>();
  const suggestionsByStage = new Map<string, string[]>();
  if (activeStageIds.length) {
    const docs = await db
      .select({
        id: stageDocuments.id,
        stageId: stageDocuments.stageId,
        fileUrl: stageDocuments.fileUrl,
        fileName: stageDocuments.fileName,
        fileSize: stageDocuments.fileSize,
        category: stageDocuments.category,
        uploadedAt: stageDocuments.uploadedAt,
        uploaderName: users.fullName,
      })
      .from(stageDocuments)
      .leftJoin(users, eq(users.id, stageDocuments.uploadedByUserId))
      .where(inArray(stageDocuments.stageId, activeStageIds))
      .orderBy(desc(stageDocuments.uploadedAt));
    for (const d of docs) {
      const arr = docsByStage.get(d.stageId) ?? [];
      arr.push({ id: d.id, fileUrl: d.fileUrl, fileName: d.fileName, fileSize: d.fileSize as number | null, category: d.category, uploadedAt: d.uploadedAt, uploaderName: d.uploaderName });
      docsByStage.set(d.stageId, arr);
      if (d.category) {
        const s = suggestionsByStage.get(d.stageId) ?? [];
        if (!s.includes(d.category)) s.push(d.category);
        suggestionsByStage.set(d.stageId, s);
      }
    }
  }

  return prjs.map((p) => {
    const a = activeByProject.get(p.id) ?? null;
    return {
      ...p,
      totalStages: totals.get(p.id) ?? 0,
      stages: stagesByProject.get(p.id) ?? [],
      activeStage: a,
      docs: a ? docsByStage.get(a.id) ?? [] : [],
      suggestions: a ? suggestionsByStage.get(a.id) ?? [] : [],
      turn: a ? stageTurn({ status: "active", reviewStatus: a.reviewStatus }) : ("nobody" as const),
    };
  });
}

export async function getStageMessages(projectId: string, stageId: string | null) {
  const cond = stageId
    ? and(eq(projectMessages.projectId, projectId), eq(projectMessages.stageId, stageId))
    : and(eq(projectMessages.projectId, projectId), sql`${projectMessages.stageId} is null`);
  const replyMsg = alias(projectMessages, "reply_msg");
  const replyUser = alias(users, "reply_user");
  return db
    .select({
      id: projectMessages.id,
      content: projectMessages.content,
      createdAt: projectMessages.createdAt,
      userId: projectMessages.userId,
      userName: users.fullName,
      userAvatarUrl: users.avatarUrl,
      attachments: projectMessages.attachments,
      editedAt: projectMessages.editedAt,
      replyToId: projectMessages.replyToId,
      replyToContent: replyMsg.content,
      replyToUserName: replyUser.fullName,
    })
    .from(projectMessages)
    .innerJoin(users, eq(users.id, projectMessages.userId))
    .leftJoin(replyMsg, eq(replyMsg.id, projectMessages.replyToId))
    .leftJoin(replyUser, eq(replyUser.id, replyMsg.userId))
    .where(cond)
    .orderBy(asc(projectMessages.createdAt));
}

/**
 * Loyihaning barcha suhbat kanallari uçun ma'lumot: bosqiçlar röyxati + har bir
 * bosqiç va "Umumiy masalalar" (stageId=null) uçun xabarlar. Bir sörovda oladi.
 */
export async function getProjectChannels(projectId: string) {
  const stages = await db
    .select({ id: projectStages.id, name: projectStages.name, orderIndex: projectStages.orderIndex, status: projectStages.status })
    .from(projectStages)
    .where(eq(projectStages.projectId, projectId))
    .orderBy(asc(projectStages.orderIndex));

  const replyMsg = alias(projectMessages, "reply_msg_ch");
  const replyUser = alias(users, "reply_user_ch");
  const rows = await db
    .select({
      id: projectMessages.id,
      content: projectMessages.content,
      createdAt: projectMessages.createdAt,
      userId: projectMessages.userId,
      userName: users.fullName,
      userAvatarUrl: users.avatarUrl,
      attachments: projectMessages.attachments,
      editedAt: projectMessages.editedAt,
      replyToId: projectMessages.replyToId,
      replyToContent: replyMsg.content,
      replyToUserName: replyUser.fullName,
      stageId: projectMessages.stageId,
    })
    .from(projectMessages)
    .innerJoin(users, eq(users.id, projectMessages.userId))
    .leftJoin(replyMsg, eq(replyMsg.id, projectMessages.replyToId))
    .leftJoin(replyUser, eq(replyUser.id, replyMsg.userId))
    .where(eq(projectMessages.projectId, projectId))
    .orderBy(asc(projectMessages.createdAt));

  const general = rows.filter((r) => !r.stageId);
  const byStage: Record<string, typeof rows> = {};
  for (const r of rows) if (r.stageId) (byStage[r.stageId] ??= []).push(r);
  return { stages, general, byStage };
}

export async function getContractorDocuments(companyId: string) {
  return db
    .select({
      id: stageDocuments.id,
      fileUrl: stageDocuments.fileUrl,
      fileName: stageDocuments.fileName,
      fileSize: stageDocuments.fileSize,
      fileMimeType: stageDocuments.fileMimeType,
      category: stageDocuments.category,
      uploadedAt: stageDocuments.uploadedAt,
      projectId: projectStages.projectId,
      projectName: projects.name,
    })
    .from(stageDocuments)
    .innerJoin(projectStages, eq(projectStages.id, stageDocuments.stageId))
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(eq(projects.externalCompanyId, companyId))
    .orderBy(desc(stageDocuments.uploadedAt));
}

export async function getContractorGallery(companyId: string, projectId?: string | null) {
  const conds = [eq(projects.externalCompanyId, companyId), sql`${stageDocuments.fileMimeType} like 'image/%'`];
  if (projectId) conds.push(eq(projects.id, projectId));
  return db
    .select({
      id: stageDocuments.id,
      fileUrl: stageDocuments.fileUrl,
      fileName: stageDocuments.fileName,
      fileMimeType: stageDocuments.fileMimeType,
      uploadedAt: stageDocuments.uploadedAt,
      projectName: projects.name,
    })
    .from(stageDocuments)
    .innerJoin(projectStages, eq(projectStages.id, stageDocuments.stageId))
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(and(...conds))
    .orderBy(desc(stageDocuments.uploadedAt));
}

export async function getContractorMessageCounts(companyId: string) {
  const rows = await db.execute<{ project_id: string; stage_id: string | null; cnt: string }>(sql`
    select pm.project_id, pm.stage_id, count(*)::text as cnt
    from project_messages pm
    join projects p on p.id = pm.project_id
    where p.external_company_id = ${companyId}
    group by pm.project_id, pm.stage_id
  `);
  return rows as unknown as { project_id: string; stage_id: string | null; cnt: string }[];
}
