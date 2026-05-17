import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
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
};

export async function listProjects(f: ProjectFilters) {
  const conds = [] as ReturnType<typeof eq>[];
  if (f.search) {
    const s = `%${f.search.toLowerCase()}%`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conds.push(or(ilike(projects.name, s), ilike(projects.description, s)) as any);
  }
  if (f.status) conds.push(eq(projects.status, f.status));
  if (f.type) conds.push(eq(projects.type, f.type));
  if (f.externalCompanyId) conds.push(eq(projects.externalCompanyId, f.externalCompanyId));
  const where = conds.length > 0 ? and(...conds) : undefined;
  return db
    .select({
      id: projects.id,
      name: projects.name,
      type: projects.type,
      status: projects.status,
      progressPercentage: projects.progressPercentage,
      deadline: projects.deadline,
      curatorName: users.fullName,
      companyName: externalCompanies.name,
    })
    .from(projects)
    .leftJoin(users, eq(users.id, projects.curatorUserId))
    .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .where(where)
    .orderBy(desc(projects.createdAt))
    .limit(200);
}

export async function getProject(id: string) {
  const p = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (p.length === 0) return null;
  const [company, curator, mls, dlvs, msgs, prjTasks, rt] = await Promise.all([
    p[0].externalCompanyId
      ? db.select().from(externalCompanies).where(eq(externalCompanies.id, p[0].externalCompanyId)).limit(1)
      : Promise.resolve([]),
    p[0].curatorUserId
      ? db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, p[0].curatorUserId)).limit(1)
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
