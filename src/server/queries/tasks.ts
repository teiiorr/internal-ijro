import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tasks,
  taskAssignees,
  users,
  projects,
  departments,
  taskChecklistItems,
  taskComments,
  taskAttachments,
  taskDependencies,
  type Position,
} from "@/lib/db/schema";
import { TASK_STATUSES, type TaskStatus, type TaskPriority } from "@/lib/permissions/tasks";

export type TaskListFilters = {
  search?: string | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  assignedToUserId?: string | null;
  projectId?: string | null;
  /** "mine" = tasks where I'm an assignee, "given" = tasks I created, default = both. */
  scope?: "mine" | "given" | "all";
  actorId: string;
  actorPosition: Position;
  actorDepartmentId: string | null;
};

export async function listTasks(f: TaskListFilters) {
  const conds = [] as ReturnType<typeof eq>[];
  if (f.search) {
    const s = `%${f.search.toLowerCase()}%`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conds.push(or(ilike(tasks.title, s), ilike(tasks.description, s)) as any);
  }
  if (f.status) conds.push(eq(tasks.status, f.status));
  if (f.priority) conds.push(eq(tasks.priority, f.priority));
  if (f.assignedToUserId) conds.push(eq(tasks.assignedToUserId, f.assignedToUserId));
  if (f.projectId) conds.push(eq(tasks.projectId, f.projectId));

  // Involvement filter — scope-aware
  if (f.scope === "mine") {
    conds.push(
      sql`EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = ${tasks.id} AND ta.user_id = ${f.actorId})`
    );
  } else if (f.scope === "given") {
    conds.push(sql`${tasks.createdByUserId} = ${f.actorId}`);
  } else {
    conds.push(
      sql`(${tasks.createdByUserId} = ${f.actorId}
           OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = ${tasks.id} AND ta.user_id = ${f.actorId}))`
    );
  }

  const assignedAlias = users as typeof users;
  const condition = conds.length > 0 ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      deadline: tasks.deadline,
      createdAt: tasks.createdAt,
      assignedToUserId: tasks.assignedToUserId,
      assignedToName: assignedAlias.fullName,
      projectId: tasks.projectId,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(assignedAlias, eq(assignedAlias.id, tasks.assignedToUserId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(condition)
    .orderBy(desc(tasks.createdAt))
    .limit(500);

  return rows;
}

export async function getTask(id: string) {
  const row = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (row.length === 0) return null;
  const t = row[0];
  const [creator, project, assigneesList, checklist, comments, attachments, deps] = await Promise.all([
    db.select({ id: users.id, fullName: users.fullName, email: users.email, position: users.position }).from(users).where(eq(users.id, t.createdByUserId)).limit(1),
    t.projectId
      ? db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, t.projectId)).limit(1)
      : Promise.resolve([]),
    db
      .select({
        userId: taskAssignees.userId,
        status: taskAssignees.status,
        responseText: taskAssignees.responseText,
        responseFileUrl: taskAssignees.responseFileUrl,
        responseFileName: taskAssignees.responseFileName,
        responseSubmittedAt: taskAssignees.responseSubmittedAt,
        completedAt: taskAssignees.completedAt,
        updatedAt: taskAssignees.updatedAt,
        fullName: users.fullName,
        position: users.position,
        departmentName: departments.name,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(users.id, taskAssignees.userId))
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(eq(taskAssignees.taskId, id))
      .orderBy(asc(taskAssignees.createdAt)),
    db.select().from(taskChecklistItems).where(eq(taskChecklistItems.taskId, id)).orderBy(asc(taskChecklistItems.orderIndex)),
    db
      .select({
        id: taskComments.id,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        userId: taskComments.userId,
        userName: users.fullName,
        parentCommentId: taskComments.parentCommentId,
      })
      .from(taskComments)
      .innerJoin(users, eq(users.id, taskComments.userId))
      .where(and(eq(taskComments.taskId, id), isNull(taskComments.deletedAt)))
      .orderBy(asc(taskComments.createdAt)),
    db.select().from(taskAttachments).where(eq(taskAttachments.taskId, id)).orderBy(desc(taskAttachments.uploadedAt)),
    db
      .select({ id: taskDependencies.id, dependsOnTaskId: taskDependencies.dependsOnTaskId, dependsOnTitle: tasks.title, dependsOnStatus: tasks.status })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
      .where(eq(taskDependencies.taskId, id)),
  ]);

  return {
    task: t,
    creator: creator[0] ?? null,
    project: project[0] ?? null,
    assignees: assigneesList,
    checklist,
    comments,
    attachments,
    dependencies: deps,
  };
}

export async function getTaskCountsByStatus(actorId: string, actorPosition: Position): Promise<Record<TaskStatus, number>> {
  const base = ["mutaxassis"].includes(actorPosition)
    ? eq(tasks.assignedToUserId, actorId)
    : undefined;
  const rows = await db
    .select({ status: tasks.status, c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(base)
    .groupBy(tasks.status);
  const out: Record<string, number> = {};
  for (const s of TASK_STATUSES) out[s] = 0;
  for (const r of rows) out[r.status] = Number(r.c);
  return out as Record<TaskStatus, number>;
}

export async function getOverdueTaskCount(actorId: string, actorPosition: Position): Promise<number> {
  const base = ["mutaxassis"].includes(actorPosition)
    ? eq(tasks.assignedToUserId, actorId)
    : undefined;
  const where = base
    ? and(base, sql`${tasks.deadline} < now()`, sql`${tasks.status} not in ('completed','rejected')`)
    : and(sql`${tasks.deadline} < now()`, sql`${tasks.status} not in ('completed','rejected')`);
  const rows = await db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(where);
  return Number(rows[0]?.c ?? 0);
}

export async function listAssignableUsers(actorId: string, actorPosition: Position, actorDepartmentId: string | null) {
  // Used by the create-task dropdown — we still apply canAssignTaskTo on the server when creating.
  if (actorPosition === "direktor") {
    return db
      .select({ id: users.id, fullName: users.fullName, position: users.position, departmentId: users.departmentId })
      .from(users)
      .where(sql`${users.status} = 'active' AND ${users.position} <> 'kontragent'`)
      .orderBy(users.fullName);
  }
  if (actorPosition === "orinbosar") {
    return db
      .select({ id: users.id, fullName: users.fullName, position: users.position, departmentId: users.departmentId })
      .from(users)
      .where(sql`${users.status} = 'active' AND ${users.position} not in ('kontragent','direktor')`)
      .orderBy(users.fullName);
  }
  if (actorPosition === "bolim_boshligi" && actorDepartmentId) {
    return db
      .select({ id: users.id, fullName: users.fullName, position: users.position, departmentId: users.departmentId })
      .from(users)
      .where(
        sql`${users.status} = 'active' AND (${users.departmentId} = ${actorDepartmentId} AND ${users.position} in ('bosh_mutaxassis','yetakchi_mutaxassis','mutaxassis') OR ${users.position} = 'hr')`
      )
      .orderBy(users.fullName);
  }
  if (actorPosition === "koordinator") {
    return db
      .select({ id: users.id, fullName: users.fullName, position: users.position, departmentId: users.departmentId })
      .from(users)
      .where(
        sql`${users.status} = 'active' AND (${users.departmentId} in (select department_id from coordinator_assignments where coordinator_user_id = ${actorId}) AND ${users.position} in ('bolim_boshligi','bosh_mutaxassis','yetakchi_mutaxassis','mutaxassis') OR ${users.position} = 'hr')`
      )
      .orderBy(users.fullName);
  }
  if (actorPosition === "bosh_mutaxassis" || actorPosition === "yetakchi_mutaxassis") {
    // Direct reports + HR
    return db
      .select({ id: users.id, fullName: users.fullName, position: users.position, departmentId: users.departmentId })
      .from(users)
      .where(sql`${users.status} = 'active' AND (${users.reportsToUserId} = ${actorId} OR ${users.position} = 'hr')`)
      .orderBy(users.fullName);
  }
  return [];
}

void gte; void lte; void inArray;
