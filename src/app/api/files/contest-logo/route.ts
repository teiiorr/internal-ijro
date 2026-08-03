import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contests } from "@/lib/db/schema";
import { storeStream, isForbiddenExt, deleteFileByUrl } from "@/lib/upload";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { logActivity } from "@/lib/audit";

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

/** Upload/replace the winner logo shown on the reveal screen. Editor allowlist only. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProjects(session.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const url = new URL(req.url);
  const contestId = url.searchParams.get("contestId") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!contestId || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });

  const [c] = await db.select({ id: contests.id, logo: contests.winnerLogoUrl }).from(contests).where(eq(contests.id, contestId)).limit(1);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: `contest-logos/${contestId}`,
      mimeType: req.headers.get("content-type"),
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  if (c.logo) await deleteFileByUrl(c.logo); // replace old logo
  await db.update(contests).set({ winnerLogoUrl: stored.url, updatedAt: new Date() }).where(eq(contests.id, contestId));
  await logActivity({ userId: session.user.id, action: "contest.logo_set", entityType: "contest", entityId: contestId });

  revalidatePath(`/tanlov/${contestId}`);
  return NextResponse.json({ ok: true });
}
