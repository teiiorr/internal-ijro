import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, projectDocuments, PROJECT_DOC_KINDS, type ProjectDocKind } from "@/lib/db/schema";
import { storeStream, isForbiddenExt } from "@/lib/upload";
import { canViewMoney } from "@/lib/permissions/project-editors";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

// Ajratilgan kontragent portalidan boşqa barcha xodim lavozimlari.
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
 * Loyiha darajasidagi hujjatlar (tahlil / xalqaro tajriba) uçun oqimli yuklash
 * endpointi. Xotira uçun xavfsiz dizayn stage-doc route bilan bir xil: fayl xom
 * sörov tanasi bölib, tögridan-tögri diskka oqadi. Sörov satrida stageId emas,
 * projectId + kind uzatiladi.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ALLOWED_POSITIONS.has(session.user.position)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const kind = url.searchParams.get("kind") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  const folder = (url.searchParams.get("folder") ?? "").trim().slice(0, 120);
  if (!projectId || !name || !PROJECT_DOC_KINDS.includes(kind as ProjectDocKind)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // Tölov hujjatlari (çeklar / hisob-fakturalar) moliyaviy → faqat pulni köra oladiganlar röyxati uçun.
  if (kind === "payment" && !canViewMoney(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: `project-docs/${projectId}`,
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  await db.insert(projectDocuments).values({
    projectId,
    kind,
    folder: folder || null,
    fileUrl: stored.url,
    fileName: stored.originalName.slice(0, 255),
    fileSize: stored.size,
    fileMimeType: stored.mimeType.slice(0, 120),
    uploadedByUserId: session.user.id,
  });
  await logActivity({
    userId: session.user.id,
    action: "project.document_added",
    entityType: "project",
    entityId: projectId,
    newValue: { kind, fileName: stored.originalName },
  });

  revalidatePath(`/projects/${projectId}`);
  return NextResponse.json({ ok: true });
}
