import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { taskAssignees, tasks, users } from "@/lib/db/schema";

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
};

/**
 * "Tasdiq kutmoqda" — responses where I am the creator and an assignee has submitted javob.
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
 * "Bajarish kerak" — open assignments to me (todo / in_progress / rejected).
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

void isNull;
