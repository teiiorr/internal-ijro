import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskAttachments } from "@/lib/db/schema";
import { storeStream, isForbiddenExt, deleteFileByUrl } from "@/lib/upload";
import { logActivity } from "@/lib/audit";
import { isOwner } from "@/lib/permissions/owner";
import { isMaintenanceOn } from "@/lib/maintenance";
import { MAX_TASK_ATTACHMENTS, canAddTaskAttachments, isUuid, taskAttachmentDir } from "@/lib/tasks/attachments";
import { countTaskAttachments, getTaskParticipation } from "@/server/queries/task-attachments";

export const runtime = "nodejs";

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Topşiriqqa hujjat biriktiriş (oqim orqali, butun fayl xotiraga olinmaydi).
 * Query: taskId=<uuid>, name=<asl fayl nomi>. Tana: faylning özi.
 * Ruxsat: topşiriq bergan xodim, içki ijroçilar va rahbariyat; studiya (kontragent) yöq.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  if (!isOwner(session.user.email) && (await isMaintenanceOn())) return NextResponse.json({ error: "maintenance" }, { status: 503 });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  const name = (url.searchParams.get("name") ?? "").replace(/[\r\n]+/g, " ").trim();
  if (!isUuid(taskId) || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const task = await getTaskParticipation(taskId);
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const viewer = { id: session.user.id, position: session.user.position };
  if (!canAddTaskAttachments(viewer, task)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if ((await countTaskAttachments(taskId)) >= MAX_TASK_ATTACHMENTS) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: taskAttachmentDir(taskId),
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  let id: string | undefined;
  try {
    const [row] = await db
      .insert(taskAttachments)
      .values({
        taskId,
        fileUrl: stored.url,
        fileName: stored.originalName.slice(0, 255),
        fileSize: stored.size,
        fileMimeType: stored.mimeType.slice(0, 100),
        uploadedByUserId: session.user.id,
      })
      .returning({ id: taskAttachments.id });
    id = row?.id;
  } catch {
    // Yozuv saqlanmasa, diskda egasiz fayl qolmasin.
    await deleteFileByUrl(stored.url);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  await logActivity({
    userId: session.user.id,
    action: "task.attachment_added",
    entityType: "task",
    entityId: taskId,
    newValue: { attachmentId: id, fileName: stored.originalName, size: stored.size },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/contractor/tasks/${taskId}`);
  return NextResponse.json({ ok: true, id });
}
