import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { taskAssignees, tasks, users } from "@/lib/db/schema";
import { taskDeadlineRequests } from "@/lib/db/tables/task-edit";
import { diffDaysIso, toTashkentIso } from "@/components/staff/task-edit/task-edit-logic";

export type InboxItem = {
  id: string;
  title: string;
  registrationNumber: string | null;
  deadline: Date | null;
  status: string;
  myStatus: string | null;
  creatorName: string | null;
  responseSubmittedAt: Date | null;
  responseFromName?: string | null;
  avatarUrl?: string | null;
};

/**
 * "Tasdiq kutmoqda" — men yaratuvçi bölgan va ijroçi javob topşirgan topşiriqlar.
 */
export async function inboxAwaitingMyApproval(userId: string): Promise<InboxItem[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      registrationNumber: tasks.registrationNumber,
      deadline: tasks.deadline,
      status: tasks.status,
      myStatus: sql<string | null>`null`,
      creatorName: sql<string | null>`null`,
      responseSubmittedAt: taskAssignees.responseSubmittedAt,
      responseFromName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(and(eq(tasks.createdByUserId, userId), eq(taskAssignees.status, "under_review")))
    .orderBy(desc(taskAssignees.responseSubmittedAt))
    .limit(20);
  return rows.map((r) => ({ ...r, deadline: r.deadline, responseSubmittedAt: r.responseSubmittedAt as Date | null }));
}

/**
 * "Bajariş kerak" — menga biriktirilgan oçiq topşiriqlar (todo / in_progress / rejected).
 */
export async function inboxMyActive(userId: string): Promise<InboxItem[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      registrationNumber: tasks.registrationNumber,
      deadline: tasks.deadline,
      status: tasks.status,
      myStatus: taskAssignees.status,
      creatorName: users.fullName,
      avatarUrl: users.avatarUrl,
      responseSubmittedAt: taskAssignees.responseSubmittedAt,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
    .innerJoin(users, eq(users.id, tasks.createdByUserId))
    .where(
      and(
        eq(taskAssignees.userId, userId),
        sql`${taskAssignees.status} in ('todo', 'in_progress', 'rejected')`
      )
    )
    .orderBy(sql`${tasks.deadline} nulls last`)
    .limit(20);
  return rows.map((r) => ({ ...r, deadline: r.deadline, responseSubmittedAt: r.responseSubmittedAt as Date | null }));
}

export type DeadlineRequestInboxItem = {
  requestId: string;
  taskId: string;
  title: string;
  registrationNumber: string | null;
  requesterName: string;
  avatarUrl: string | null;
  extraDays: number;
  requestedDeadline: Date;
  createdAt: Date;
};

/**
 * "Tasdiq kutmoqda" — pending deadline-extension requests on tasks I created.
 * Empty until the 0031 migration (task_deadline_requests) is applied.
 */
export async function inboxDeadlineRequests(userId: string): Promise<DeadlineRequestInboxItem[]> {
  try {
    const rows = await db
      .select({
        requestId: taskDeadlineRequests.id,
        taskId: tasks.id,
        title: tasks.title,
        registrationNumber: tasks.registrationNumber,
        requesterName: users.fullName,
        avatarUrl: users.avatarUrl,
        previousDeadline: taskDeadlineRequests.previousDeadline,
        requestedDeadline: taskDeadlineRequests.requestedDeadline,
        createdAt: taskDeadlineRequests.createdAt,
      })
      .from(taskDeadlineRequests)
      .innerJoin(tasks, eq(tasks.id, taskDeadlineRequests.taskId))
      .innerJoin(users, eq(users.id, taskDeadlineRequests.requestedByUserId))
      .where(and(eq(tasks.createdByUserId, userId), eq(taskDeadlineRequests.status, "pending"), sql`${tasks.status} <> 'completed'`))
      .orderBy(desc(taskDeadlineRequests.createdAt))
      .limit(20);
    return rows.map(({ previousDeadline, ...r }) => ({
      ...r,
      extraDays: previousDeadline
        ? diffDaysIso(toTashkentIso(previousDeadline), toTashkentIso(r.requestedDeadline))
        : 0,
    }));
  } catch {
    return [];
  }
}

void isNull;
