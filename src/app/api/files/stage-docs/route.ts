import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectStages, stageDocuments } from "@/lib/db/schema";
import { storeStream, isForbiddenExt } from "@/lib/upload";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

// Same set as the stage management actions — every staff position except the
// isolated contractor portal. Kept in sync with MANAGERS in server/actions/stages.ts.
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

/** Trim, collapse whitespace, cap length; empty → null. Mirrors the stage action helper. */
function normalizeCategory(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.replace(/\s+/g, " ").trim().slice(0, 120);
  return v.length > 0 ? v : null;
}

/** Reject cross-site POSTs (defence-in-depth on top of the SameSite=Lax session cookie). */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit Origin; the Lax cookie already guards us
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Streaming upload endpoint for stage documents.
 *
 * The file is sent as the raw request body (client: `fetch(url, { body: file })`),
 * with stageId / name / category in the query string. The body streams straight
 * to disk — it is never buffered whole in memory — so a 100MB upload is safe even
 * on the 2GB production box shared with Postgres. Contrast with a Server Action,
 * which buffers the entire body in RAM before our code runs.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ALLOWED_POSITIONS.has(session.user.position)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const stageId = url.searchParams.get("stageId") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  const category = normalizeCategory(url.searchParams.get("category"));
  if (!stageId || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const [stage] = await db
    .select({ id: projectStages.id, projectId: projectStages.projectId })
    .from(projectStages)
    .where(eq(projectStages.id, stageId))
    .limit(1);
  if (!stage) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: `stage-docs/${stageId}`,
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  await db.insert(stageDocuments).values({
    stageId,
    fileUrl: stored.url,
    fileName: stored.originalName.slice(0, 255), // column is varchar(255)
    fileSize: stored.size,
    fileMimeType: stored.mimeType.slice(0, 120), // column is varchar(120)
    category,
    uploadedByUserId: session.user.id,
  });
  await db.update(projectStages).set({ updatedAt: new Date() }).where(eq(projectStages.id, stageId));
  await logActivity({
    userId: session.user.id,
    action: "stage.document_added",
    entityType: "project_stage",
    entityId: stageId,
    newValue: { fileName: stored.originalName },
  });

  revalidatePath(`/projects/${stage.projectId}`);
  revalidatePath(`/projects/${stage.projectId}/stages/${stageId}`);

  return NextResponse.json({ ok: true });
}
