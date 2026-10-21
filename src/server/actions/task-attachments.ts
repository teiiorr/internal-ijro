"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { taskAttachments } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { deleteFileByUrl } from "@/lib/upload";
import { type ActionResult } from "@/lib/action-result";
import { isWordFile, urlFileName, wordOpenUri } from "@/lib/internal-docs/logic";
import { createWordToken } from "@/lib/internal-docs/word-token";
import { requestOrigin } from "@/lib/request-origin";
import { canDeleteTaskAttachment, canViewTaskAttachments } from "@/lib/tasks/attachments";
import { getTaskAttachment } from "@/server/queries/task-attachments";

/** Hujjatni öçiradi: yuklagan xodim, topşiriq bergan xodim yoki rahbariyat. */
export async function removeTaskAttachment(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const found = await getTaskAttachment(id);
  if (!found) return { ok: false, error: "not_found" };
  const { attachment, task } = found;
  if (!canDeleteTaskAttachment(me, task, attachment.uploadedByUserId)) return { ok: false, error: "forbidden" };

  await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
  await deleteFileByUrl(attachment.fileUrl);
  await logActivity({
    userId: me.id,
    action: "task.attachment_removed",
    entityType: "task",
    entityId: attachment.taskId,
    oldValue: { attachmentId: id, fileName: attachment.fileName },
  });
  revalidatePath(`/tasks/${attachment.taskId}`);
  revalidatePath(`/contractor/tasks/${attachment.taskId}`);
  return { ok: true };
}

/**
 * "Wordda oçiş": Office URI (ms-word:ofv|u|…) qaytaradi. Word faylni kukisiz yuklagani uçun
 * manzil qisqa muddatli, faqat şu hujjatga boğlangan imzolangan token bilan beriladi.
 */
export async function getTaskAttachmentWordLink(id: string): Promise<ActionResult<{ url: string }>> {
  const me = await requireUser();
  const found = await getTaskAttachment(id);
  if (!found) return { ok: false, error: "not_found" };
  if (!canViewTaskAttachments(me, found.task)) return { ok: false, error: "forbidden" };
  const { attachment } = found;
  if (!isWordFile(attachment.fileName)) return { ok: false, error: "invalid" };
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return { ok: false, error: "invalid" };

  const origin = await requestOrigin();
  if (!origin) return { ok: false, error: "invalid" };
  const token = createWordToken(attachment.id, secret, undefined, "task-attachment-word");
  const fileUrl = `${origin}/api/task-attachments/${attachment.id}/word/${token}/${urlFileName(attachment.fileName)}`;
  return { ok: true, url: wordOpenUri(fileUrl) };
}
