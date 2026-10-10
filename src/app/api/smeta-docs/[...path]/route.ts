import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { join, resolve, basename, extname, sep } from "node:path";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Smeta komissiyasi arxiv fayllari UPLOAD_DIR/smeta-docs ichida yashaydi —
// kod/repozitoriydan tashqarida, deploy ularga tegmaydi. Faqat tizimga kirgan
// ichki xodimlarga beriladi (studiyalarga — yoʻq). PDF/rasm brauzerda ochiladi,
// ?dl=1 — yuklab olishga majburlaydi.
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const BASE = resolve(join(UPLOAD_DIR, "smeta-docs"));

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
};

function guessMime(name: string): string {
  return MIME[extname(name).slice(1).toLowerCase()] ?? "application/octet-stream";
}

/** Content-Disposition uchun xavfsiz nom: yoʻl/boshqaruv belgilarisiz ASCII + RFC5987 UTF-8. */
function disposition(kind: "inline" | "attachment", rawName: string): string {
  const name = basename(rawName).replace(/[\r\n"\\]/g, "").trim() || "file";
  const ascii = name.replace(/[^\x20-\x7E]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  // Faqat ichki xodimlar: studiyalar (kontragent) smeta arxivini koʻrmaydi.
  if (session.user.position === "kontragent") return new NextResponse("forbidden", { status: 403 });

  const { path } = await ctx.params;
  // Har bir segment nomga aylantiriladi (kodlangan "/" yoki ".." bilan chiqib boʻlmaydi).
  const segs = (path ?? []).map((s) => basename(s)).filter((s) => s && s !== "." && s !== "..");
  if (segs.length < 1) return new NextResponse("not_found", { status: 404 });
  const target = resolve(BASE, ...segs);
  // Yuklamalar papkasidan tashqariga chiqishni rad etamiz.
  if (target !== BASE && !target.startsWith(BASE + sep)) return new NextResponse("not_found", { status: 404 });

  let size: number;
  try {
    const st = await stat(target);
    if (!st.isFile()) return new NextResponse("not_found", { status: 404 });
    size = st.size;
  } catch {
    return new NextResponse("not_found", { status: 404 });
  }

  const onDisk = basename(target);
  const mime = guessMime(onDisk);
  const dl = req.nextUrl.searchParams.get("dl") === "1";
  const downloadName = req.nextUrl.searchParams.get("name") || onDisk;

  // Diskdan oqim bilan uzatamiz — 40MB li PDF 2GB serverda xotirani portlatmasin.
  const body = Readable.toWeb(createReadStream(target)) as unknown as ReadableStream<Uint8Array>;
  const headers = new Headers();
  headers.set("Content-Type", mime);
  headers.set("Content-Length", String(size));
  headers.set("Content-Disposition", disposition(dl ? "attachment" : "inline", downloadName));
  // Ichki hujjatlar — umumiy (CDN/proxy) keshda saqlanmasin.
  headers.set("Cache-Control", "private, max-age=600");
  return new NextResponse(body, { headers });
}
