import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { storeStream, deleteFileByUrl, isForbiddenExt } from "@/lib/upload";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const HR_ROLES = new Set(["direktor", "orinbosar", "hr"]);

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
  const userId = url.searchParams.get("userId") ?? "";
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!userId || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (isForbiddenExt(name)) return NextResponse.json({ error: "ext_forbidden" }, { status: 400 });
  const mime = req.headers.get("content-type") ?? "";
  if (!mime.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });

  const isSelf = session.user.id === userId;
  const isHr = HR_ROLES.has(session.user.position);
  if (!isSelf && !isHr) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [target] = await db
    .select({ id: users.id, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const declared = Number(req.headers.get("content-length"));
  let stored;
  try {
    stored = await storeStream(req.body, {
      fileName: name,
      subdir: "avatars",
      mimeType: mime,
      declaredSize: Number.isFinite(declared) && declared > 0 ? declared : null,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const known = code === "file_too_large" || code === "file_empty" || code === "ext_forbidden";
    return NextResponse.json({ error: known ? code : "upload_failed" }, { status: known ? 400 : 500 });
  }

  const prev = target.avatarUrl;
  await db.update(users).set({ avatarUrl: stored.url }).where(eq(users.id, userId));
  if (prev && prev !== stored.url) {
    try { await deleteFileByUrl(prev); } catch { /* ignore orphan */ }
  }
  await logActivity({
    userId: session.user.id,
    action: "user.avatar_set",
    entityType: "user",
    entityId: userId,
    newValue: { avatarUrl: stored.url },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${userId}`);
  return NextResponse.json({ ok: true, url: stored.url });
}
