import "server-only";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
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

export type ProjectFilters = {
  search?: string | null;
  status?: string | null;
  type?: "internal" | "external" | null;
  externalCompanyId?: string | null;
  // production-type / stage filters (only match typed projects)
  projectTypeId?: string | null;
  responsibleUserId?: string | null;
  payment?: "paid" | "unpaid" | null;
  overdue?: boolean | null;
  from?: string | null;
  to?: string | null;
  /** current-state filter: snapshot name (nameUzLatn) of the project's ACTIVE stage */
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
  const [company, curator, mls, dlvs, msgs, prjTasks, rt] = await Promise.all([
    p[0].externalCompanyId
      ? db.select().from(externalCompanies).where(eq(externalCompanies.id, p[0].externalCompanyId)).limit(1)
      : Promise.resolve([]),
    p[0].curatorUserId
      ? db.select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, p[0].curatorUserId)).limit(1)
      : Promise.resolve([]),
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

/** Studios + the projects assigned to each (for the reveal on the studios page). */
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
  return companies.map((c) => ({ ...c, projects: byCompany.get(c.id) ?? [] }));
}

export async function getContractor(id: string) {
  const r = await db.select().from(externalCompanies).where(eq(externalCompanies.id, id)).limit(1);
  return r[0] ?? null;
}

export async function listProjectsForContractor(contractorUserId: string) {
  // Resolve company by contractor user (uses email match — simplest reliable join for self-registered contractors)
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
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
    })
    .from(projects)
    .where(eq(projects.externalCompanyId, company[0].id))
    .orderBy(desc(projects.createdAt));
  return { company: company[0], projects: prjs };
}

/**
 * Flat per-project rows for the Excel report (Loyihalar hisoboti):
 * name, studio, current stage, contract number, dates and the money totals
 * (planned / paid / remaining). Ordered oldest-first for a stable registry.
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
 * Report rows honouring the same filters as the projects list (search / project
 * type / stage / payment / overdue). The derived-status tab + status-priority
 * sort are applied by the caller (route), since derived status isn't a column.
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

// ── Studio detail queries ──────────────────────────────────────────

export async function getContractorDetail(companyId: string) {
  const [company] = await db.select().from(externalCompanies).where(eq(externalCompanies.id, companyId)).limit(1);
  if (!company) return null;

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
  if (projectIds.length === 0) return { company, projects: [], stages: [], lastActivity: null };

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

  return { company, projects: prjs, stages, lastActivity };
}

export async function getStageMessages(projectId: string, stageId: string | null) {
  const cond = stageId
    ? and(eq(projectMessages.projectId, projectId), eq(projectMessages.stageId, stageId))
    : and(eq(projectMessages.projectId, projectId), sql`${projectMessages.stageId} is null`);
  return db
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
    .where(cond)
    .orderBy(asc(projectMessages.createdAt));
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
