import { NextRequest, NextResponse } from "next/server";
import { getInternalDocument } from "@/server/queries/internal-docs";
import { contentDisposition, isWordFile, wordMimeType } from "@/lib/internal-docs/logic";
import { verifyWordToken } from "@/lib/internal-docs/word-token";
import { fileStream, locateInternalDocFile } from "@/lib/internal-docs/serve";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; token: string; name: string }> };

type Resolved = { error: NextResponse } | { error?: undefined; headers: Headers; path: string };

/**
 * "Wordda ochish" uchun fayl manzili. Microsoft Word hujjatni brauzer kukisiz yuklab oladi,
 * shuning uchun kirish sessiya bilan emas, URL ichidagi qisqa muddatli imzolangan token bilan
 * tekshiriladi (faqat shu hujjat uchun, ~15 daqiqa). Faqat Word fayllari beriladi.
 * Word avval HEAD/OPTIONS yuborishi mumkin — ular ham qoʻllab-quvvatlanadi.
 */
async function resolve(ctx: Ctx): Promise<Resolved> {
  const { id, token } = await ctx.params;
  const secret = process.env.AUTH_SECRET ?? "";
  if (!verifyWordToken(id, token, secret)) return { error: new NextResponse("forbidden", { status: 403 }) };
  const doc = await getInternalDocument(id);
  if (!doc || !isWordFile(doc.fileName)) return { error: new NextResponse("not_found", { status: 404 }) };
  const f = await locateInternalDocFile(doc.fileUrl);
  if (!f) return { error: new NextResponse("not_found", { status: 404 }) };
  const headers = new Headers();
  headers.set("Content-Type", wordMimeType(doc.fileName));
  headers.set("Content-Length", String(f.size));
  headers.set("Content-Disposition", contentDisposition("inline", doc.fileName));
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
