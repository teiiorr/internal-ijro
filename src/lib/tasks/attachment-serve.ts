import "server-only";
import { auth } from "@/lib/auth";
import { statFileForDownload } from "@/lib/upload";
import { canViewTaskAttachments, parseTaskAttachmentUrl, taskAttachmentDir } from "@/lib/tasks/attachments";
import { getTaskAttachment } from "@/server/queries/task-attachments";

/** Hujjatning `fileUrl` manzilidan diskdagi faylni topadi (yöl taşqariga çiqa olmaydi). */
export async function locateTaskAttachmentFile(fileUrl: string): Promise<{ path: string; size: number } | null> {
  const parsed = parseTaskAttachmentUrl(fileUrl);
  if (!parsed) return null;
  return statFileForDownload(taskAttachmentDir(parsed.taskId), parsed.fileName);
}

type Loaded = NonNullable<Awaited<ReturnType<typeof getTaskAttachment>>>;

/**
 * Sessiya böyiça hujjatni oçiş huquqini tekşiradi va diskdagi faylni topadi.
 * Içki xodim: ruxsat. Studiya: faqat öziga tayinlangan topşiriq hujjatlari.
 */
export async function loadAttachmentForViewer(
  id: string,
): Promise<{ status: 401 | 403 | 404 } | ({ status: 200; file: { path: string; size: number } } & Loaded)> {
  const session = await auth();
  if (!session?.user?.id) return { status: 401 };
  const found = await getTaskAttachment(id);
  if (!found) return { status: 404 };
  if (!canViewTaskAttachments({ id: session.user.id, position: session.user.position }, found.task)) return { status: 403 };
  const file = await locateTaskAttachmentFile(found.attachment.fileUrl);
  if (!file) return { status: 404 };
  return { status: 200, file, ...found };
}
