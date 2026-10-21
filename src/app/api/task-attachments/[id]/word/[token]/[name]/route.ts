import { NextRequest, NextResponse } from "next/server";
import { contentDisposition, isWordFile, wordMimeType } from "@/lib/internal-docs/logic";
import { verifyWordToken } from "@/lib/internal-docs/word-token";
import { fileStream } from "@/lib/internal-docs/serve";
import { locateTaskAttachmentFile } from "@/lib/tasks/attachment-serve";
import { getTaskAttachment } from "@/server/queries/task-attachments";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; token: string; name: string }> };

type Resolved = { error: NextResponse } | { error?: undefined; headers: Headers; path: string };

/**
 * "Wordda oçiş" uçun fayl manzili. Word hujjatni brauzer kukisiz yuklab oladi, şuning uçun
 * kiriş URL içidagi qisqa muddatli imzolangan token bilan tekşiriladi (faqat şu hujjat va
 * faqat topşiriq ilovalari uçun, ~15 daqiqa). Faqat Word fayllari beriladi.
 */
async function resolve(ctx: Ctx): Promise<Resolved> {
  const { id, token } = await ctx.params;
  const secret = process.env.AUTH_SECRET ?? "";
  if (!verifyWordToken(id, token, secret, undefined, "task-attachment-word")) {
    return { error: new NextResponse("forbidden", { status: 403 }) };
  }
  const found = await getTaskAttachment(id);
  if (!found || !isWordFile(found.attachment.fileName)) return { error: new NextResponse("not_found", { status: 404 }) };
  const f = await locateTaskAttachmentFile(found.attachment.fileUrl);
  if (!f) return { error: new NextResponse("not_found", { status: 404 }) };
  const headers = new Headers();
  headers.set("Content-Type", wordMimeType(found.attachment.fileName));
  headers.set("Content-Length", String(f.size));
  headers.set("Content-Disposition", contentDisposition("inline", found.attachment.fileName));
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return { headers, path: f.path };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if (r.error) return r.error;
  return new NextResponse(fileStream(r.path), { headers: r.headers });
}

export async function HEAD(_req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if (r.error) return new NextResponse(null, { status: r.error.status });
  return new NextResponse(null, { headers: r.headers });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { Allow: "GET, HEAD, OPTIONS" } });
}
