import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { storeStream, deleteFileByUrl, isForbiddenExt } from "@/lib/upload";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const STAFF = new Set(["direktor", "orinbosar", "koordinator"]);

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
 * Studio logo upload. Staff who manage studios may set any studio's logo; a
 * studio (kontragent) may set only its own (matched by email). The client
 * compresses the image before sending; the body streams to disk. Replaces any
 * previous logo file.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!companyId || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });
  const mime = req.headers.get("content-type") ?? "";
  if (!mime.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });

  const [company] = await db
    .select({ id: externalCompanies.id, email: externalCompanies.contactEmail, logoUrl: externalCompanies.logoUrl })
    .from(externalCompanies)
    .where(eq(externalCompanies.id, companyId))
    .limit(1);
  if (!company) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isStaff = STAFF.has(session.user.position);
  const isOwnStudio = session.user.position === "kontragent" && !!company.email && company.email === session.user.email;
  if (!isStaff && !isOwnStudio) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: "studio-logos",
      mimeType: mime,
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  const prev = company.logoUrl;
  await db.update(externalCompanies).set({ logoUrl: stored.url }).where(eq(externalCompanies.id, companyId));
  if (prev && prev !== stored.url) {
    try { await deleteFileByUrl(prev); } catch { /* ignore orphan */ }
  }
  await logActivity({
    userId: session.user.id,
    action: "contractor.logo_set",
    entityType: "external_company",
    entityId: companyId,
    newValue: { logoUrl: stored.url },
  });

  revalidatePath("/contractors");
  return NextResponse.json({ ok: true, url: stored.url });
}
