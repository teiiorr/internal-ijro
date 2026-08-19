import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, externalCompanies } from "@/lib/db/schema";
import { storeStream, isForbiddenExt } from "@/lib/upload";

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!projectId || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const [project] = await db
    .select({ id: projects.id, ec: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (session.user.position === "kontragent") {
    const [company] = await db
      .select({ id: externalCompanies.id })
      .from(externalCompanies)
      .where(eq(externalCompanies.contactEmail, session.user.email))
      .limit(1);
    if (!company || project.ec !== company.id)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: `chat/${projectId}`,
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  return NextResponse.json({
    url: stored.url,
    name: stored.originalName,
    size: stored.size,
    mimeType: stored.mimeType,
  });
}
