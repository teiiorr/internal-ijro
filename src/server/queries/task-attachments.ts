import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, taskAssignees, taskAttachments, users } from "@/lib/db/schema";
import { isUuid, type TaskParticipation } from "@/lib/tasks/attachments";

export type TaskAttachmentItem = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: Date;
  uploadedByUserId: string | null;
  uploaderName: string | null;
};

/** Topşiriqni kim bergan va kimlar ijroçi (ruxsatlarni tekşiriş uçun). */
export async function getTaskParticipation(taskId: string): Promise<TaskParticipation | null> {
  if (!isUuid(taskId)) return null;
  const [t] = await db.select({ createdByUserId: tasks.createdByUserId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!t) return null;
  const rows = await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  return { createdByUserId: t.createdByUserId, assigneeIds: rows.map((r) => r.userId) };
}

/** Topşiriq hujjatlari: birinçi qöşilgani yuqorida, yuklagan xodim ismi bilan. */
export async function listTaskAttachments(taskId: string): Promise<TaskAttachmentItem[]> {
  return db
    .select({
      id: taskAttachments.id,
      fileUrl: taskAttachments.fileUrl,
      fileName: taskAttachments.fileName,
      fileSize: taskAttachments.fileSize,
      uploadedAt: taskAttachments.uploadedAt,
      uploadedByUserId: taskAttachments.uploadedByUserId,
      uploaderName: users.fullName,
    })
    .from(taskAttachments)
    .leftJoin(users, eq(users.id, taskAttachments.uploadedByUserId))
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.uploadedAt), asc(taskAttachments.id));
}

export async function countTaskAttachments(taskId: string): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId));
  return Number(row?.c ?? 0);
}

/** Bitta hujjat va uning topşiriqdagi iştirok maʼlumoti (yuklab oliş, Word, öçiriş uçun). */
export async function getTaskAttachment(id: string) {
  if (!isUuid(id)) return null;
  const [a] = await db.select().from(taskAttachments).where(eq(taskAttachments.id, id)).limit(1);
  if (!a) return null;
  const task = await getTaskParticipation(a.taskId);
  if (!task) return null;
  return { attachment: a, task };
}
