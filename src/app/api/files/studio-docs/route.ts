import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, projectStages, stageDocuments, externalCompanies } from "@/lib/db/schema";
import { storeStream, isForbiddenExt } from "@/lib/upload";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

/** Trim, collapse whitespace, cap at 120; empty → null. */
function normalizeCategory(raw: string | null): string | null {
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

/**
 * Studio (kontragent) document upload — mirrors the staff stage-docs endpoint but
 * takes a projectId and hard-scopes to the caller's OWN studio: the project must
 * belong to the company resolved from the caller's email. Documents attach to the
 * project's active stage (or its first stage), filed under the chosen folder.
 * The client compresses images before sending; the body streams straight to disk.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.position !== "kontragent") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  const category = normalizeCategory(url.searchParams.get("category"));
  if (!projectId || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  // Resolve the caller's studio by email (the portal's link model).
  const [company] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, session.user.email))
    .limit(1);
  if (!company) return NextResponse.json({ error: "no_company" }, { status: 403 });

  // The project must belong to THIS studio.
  const [project] = await db
    .select({ id: projects.id, ec: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.ec !== company.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Attach to the active stage, else the first stage.
  const stages = await db
    .select({ id: projectStages.id, status: projectStages.status })
    .from(projectStages)
    .where(eq(projectStages.projectId, projectId))
    .orderBy(asc(projectStages.orderIndex));
  const target = stages.find((s) => s.status === "active") ?? stages[0];
  if (!target) return NextResponse.json({ error: "no_stage" }, { status: 400 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: `stage-docs/${target.id}`,
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  await db.insert(stageDocuments).values({
    stageId: target.id,
    fileUrl: stored.url,
    fileName: stored.originalName.slice(0, 255),
    fileSize: stored.size,
    fileMimeType: stored.mimeType.slice(0, 120),
    category,
    uploadedByUserId: session.user.id,
  });
  await db.update(projectStages).set({ updatedAt: new Date() }).where(eq(projectStages.id, target.id));
  await logActivity({
    userId: session.user.id,
    action: "stage.document_added",
    entityType: "project_stage",
    entityId: target.id,
    newValue: { fileName: stored.originalName, by: "studio" },
  });

  revalidatePath(`/contractor/projects/${projectId}`);
  return NextResponse.json({ ok: true });
}
