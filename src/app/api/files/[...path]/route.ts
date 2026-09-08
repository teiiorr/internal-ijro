import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { statFileForDownload } from "@/lib/upload";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml", bmp: "image/bmp",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  pdf: "application/pdf",
};

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

// Ruxsat etilgan ölçamlar (faqat ?w= orqali). Cheklab qöyildi — çaqiruvçilar
// ixtiyoriy ölçam sörab, CPU/keşni ortiqça yuklab yubormasligi uçun.
const RESIZE_WIDTHS = new Set([64, 96, 128, 256]);

/**
 * Rasterli tasvirlar uçun tezkor miniatura, `?w=<n>` orqali ixtiyoriy. Töliq
 * himoyalangan: har qanday xatolik (sharp yöq, dekod xatosi, ölçab bölmaydigan tur)
 * quyidagi oddiy töliq-fayl oqimiga ötadi, şunda rasm uzatish hech qaçon buzilmaydi.
 */
async function tryResize(filePath: string, mime: string, width: number): Promise<NextResponse | null> {
  if (!RESIZE_WIDTHS.has(width)) return null;
  if (!/^image\/(jpe?g|png|webp)$/.test(mime)) return null; // svg/gif/bmp/video ni ötkazib yuboramiz
  try {
    const { default: sharp } = await import("sharp");
    const input = await readFile(filePath);
    const out = await sharp(input)
      .rotate() // EXIF orientatsiyasini hisobga olamiz
      .resize(width, width, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const headers = new Headers();
    headers.set("Content-Type", "image/webp");
    headers.set("Content-Length", String(out.length));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new NextResponse(new Uint8Array(out), { headers });
  } catch {
    return null; // töliq oqimga qaytamiz
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  const { path } = await ctx.params;
  if (!path || path.length < 2) return new NextResponse("not_found", { status: 404 });

  const fileName = path[path.length - 1];
  const subdir = path.slice(0, -1).join("/");
  const f = await statFileForDownload(subdir, fileName);
  if (!f) return new NextResponse("not_found", { status: 404 });

  const mime = guessMime(fileName);

  // Ixtiyoriy ölçamlangan miniatura (avatarlar va h.k.). Hech qaçon halokatli emas — null → töliq oqim.
  const width = Number(req.nextUrl.searchParams.get("w"));
  if (width) {
    const resized = await tryResize(f.path, mime, width);
    if (resized) return resized;
  }

  // Faylni Buffer ga yuklash örniga diskdan oqim qilib uzatamiz — katta
  // yuklab olish 2GB li serverda öz hajmiça RAM egallamasligi kerak.
  const body = Readable.toWeb(createReadStream(f.path)) as unknown as ReadableStream<Uint8Array>;
  const isMedia = mime.startsWith("image/") || mime.startsWith("video/");
  const headers = new Headers();
  headers.set("Content-Type", isMedia ? mime : "application/octet-stream");
  headers.set("Content-Length", String(f.size));
  headers.set("Content-Disposition", `inline; filename="${fileName}"`);
  if (isMedia) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new NextResponse(body, { headers });
}
