import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInternalDocument } from "@/server/queries/internal-docs";
import { canUseInternalDocs, contentDisposition, isWordFile, wordMimeType } from "@/lib/internal-docs/logic";
import { fileStream, locateInternalDocFile } from "@/lib/internal-docs/serve";

export const runtime = "nodejs";

/** Hujjatni asl nomi bilan yuklab olish. Faqat ichki xodimlar; kontragent (studiya) — 403. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!canUseInternalDocs(session.user.position)) return new NextResponse("forbidden", { status: 403 });

  const { id } = await ctx.params;
  const doc = await getInternalDocument(id);
  if (!doc) return new NextResponse("not_found", { status: 404 });
  const f = await locateInternalDocFile(doc.fileUrl);
  if (!f) return new NextResponse("not_found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", isWordFile(doc.fileName) ? wordMimeType(doc.fileName) : "application/octet-stream");
  headers.set("Content-Length", String(f.size));
  headers.set("Content-Disposition", contentDisposition("attachment", doc.fileName));
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(fileStream(f.path), { headers });
}
