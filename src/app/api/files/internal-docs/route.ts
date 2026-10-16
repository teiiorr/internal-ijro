import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalDocuments } from "@/lib/db/tables/internal-documents";
import { storeStream, isForbiddenExt } from "@/lib/upload";
import { logActivity } from "@/lib/audit";
import { canUseInternalDocs, internalDocsPath, isInternalDocKind, isYmd, titleFromFileName } from "@/lib/internal-docs/logic";

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

function clean(raw: string | null, max: number): string | null {
  const v = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return v.length > 0 ? v : null;
}

/**
 * "Ichki hujjatlar"ga fayl yuklash (oqim orqali, butun fayl xotiraga olinmaydi).
 * Query: kind=bildirgi|buyruq, name=<fayl nomi>, title?, number?, date?=YYYY-MM-DD.
 * Barcha ichki xodimlar yuklay oladi; kontragent (studiya) — yoʻq.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseInternalDocs(session.user.position)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const name = (url.searchParams.get("name") ?? "").trim();
  const date = url.searchParams.get("date");
  if (!isInternalDocKind(kind) || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (date && !isYmd(date)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: "internal-docs",
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  const fileName = stored.originalName.slice(0, 255);
  const title = clean(url.searchParams.get("title"), 300) ?? titleFromFileName(fileName);
  const [row] = await db
    .insert(internalDocuments)
    .values({
      kind,
      title,
      docNumber: clean(url.searchParams.get("number"), 60),
      docDate: date || null,
      fileUrl: stored.url,
      fileName,
      fileSize: stored.size,
      fileMimeType: stored.mimeType.slice(0, 120),
      uploadedByUserId: session.user.id,
    })
    .returning({ id: internalDocuments.id });
  await logActivity({
    userId: session.user.id,
    action: "internal_doc.uploaded",
    entityType: "internal_document",
    entityId: row?.id,
    newValue: { kind, title, fileName },
  });

  revalidatePath(internalDocsPath(kind));
  return NextResponse.json({ ok: true });
}
