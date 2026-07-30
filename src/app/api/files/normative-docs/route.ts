import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normativeDocuments } from "@/lib/db/schema";
import { storeStream, isForbiddenExt } from "@/lib/upload";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const ALLOWED_POSITIONS = new Set([
  "direktor",
  "orinbosar",
  "koordinator",
  "bolim_boshligi",
  "bosh_mutaxassis",
  "yetakchi_mutaxassis",
  "mutaxassis",
  "hr",
]);

function normalizeFolder(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.replace(/\s+/g, " ").trim().slice(0, 120);
  return v.length > 0 ? v : null;
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Streaming upload for organisation-wide normative documents ("Me'yoriy hujjatlar"). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ALLOWED_POSITIONS.has(session.user.position)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const folder = normalizeFolder(url.searchParams.get("folder"));
  if (!name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: "normative-docs",
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  await db.insert(normativeDocuments).values({
    folder,
    fileUrl: stored.url,
    fileName: stored.originalName.slice(0, 255),
    fileSize: stored.size,
    fileMimeType: stored.mimeType.slice(0, 120),
    uploadedByUserId: session.user.id,
  });
  await logActivity({
    userId: session.user.id,
    action: "normative.document_added",
    entityType: "normative_document",
    newValue: { folder, fileName: stored.originalName },
  });

  revalidatePath("/meyoriy-hujjatlar");
  return NextResponse.json({ ok: true });
}
