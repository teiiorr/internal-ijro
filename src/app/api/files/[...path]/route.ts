import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { posix, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { statFileForDownload } from "@/lib/upload";
import { canAccessFile } from "@/lib/permissions/file-access";

export const runtime = "nodejs";

// Miniatura disk keşi — yuklamalar ildizi içidagi `.thumbs` papkasi. `canAccessFile`
// noma'lum turni kontragentga bermaydi, şuning uçun keş papkasi faqat içki xodimga
// körinadi (va keş baribir GET'dagi avtorizatsiyadan KEYIN öqiladi/yoziladi).
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const THUMB_DIR = join(UPLOAD_DIR, ".thumbs");

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
async function tryResize(filePath: string, mime: string, width: number, size: number): Promise<NextResponse | null> {
  if (!RESIZE_WIDTHS.has(width)) return null;
  if (!/^image\/(jpe?g|png|webp)$/.test(mime)) return null; // svg/gif/bmp/video ni ötkazib yuboramiz
  try {
    // Disk keşi: aynan bir manba + ölçam uçun qayta-qayta sharp işga tuşirmaymiz.
    // Kalit manba yöli + hajmi + ölçamdan — fayl özgarsa (boşqa hajm) kalit ham özgaradi.
    const key = createHash("sha1").update(`${filePath}:${size}:${width}`).digest("hex");
    const cachePath = join(THUMB_DIR, `${key}-${width}.webp`);

    let out: Buffer | null = null;
    try {
      out = await readFile(cachePath); // keşdan
    } catch {
      out = null; // keşda yöq — quyida yaratamiz
    }

    if (!out) {
      const { default: sharp } = await import("sharp");
      // Faylni Buffer'ga yiğmasdan libvips özi öqiydi; juda katta (piksel) rasmlar rad etiladi.
      out = await sharp(filePath, { limitInputPixels: 50_000_000 })
        .rotate() // EXIF orientatsiyasini hisobga olamiz
        .resize(width, width, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      // Keşga atomik yozamiz (tmp + rename) — yarim yozilgan fayl heç qaçon öqilmaydi.
      // Yozib bölmasa (disk/ruxsat), e'tibor bermaymiz: javob baribir qaytadi.
      try {
        await mkdir(THUMB_DIR, { recursive: true });
        const tmp = join(THUMB_DIR, `.${key}-${width}.${randomUUID()}.tmp`);
        await writeFile(tmp, out);
        await rename(tmp, cachePath);
      } catch {
        /* keş yozilmadi — muhim emas */
      }
    }

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

  // Xodim hujjatlari (pasport, shartnoma skanlari) — faqat egasi yoki HR rollari.
  // Segmentlar normallashtiriladi: "x/../employee-docs/..." yoki kodlangan "/" bilan
  // tekshiruvni chetlab oʻtib boʻlmaydi; yuklamalar papkasidan tashqariga chiqish rad etiladi.
  const segs = posix.normalize(path.join("/")).split("/").filter(Boolean);
  if (segs.length < 2 || segs[0] === ".." || segs[0] === ".") return new NextResponse("not_found", { status: 404 });
  const type = segs[0].toLowerCase();
  // Past maxfiylikdagi ko'rsatuv aktivlari (avatar/logo/tanlov) umumiy keshlanadi; qolgani — maxfiy.
  const isSensitive = !["avatars", "studio-logos", "contest-logos", "contest-photos", "contest-files"].includes(type);
  // Markazlashgan kirish tekshiruvi (IDOR'ga qarshi): loyiha/bosqich/chat/me'yoriy hujjatlar
  // endi faqat tegishli foydalanuvchiga beriladi (kontragent faqat o'z studiyasi loyihalariga).
  const allowed = await canAccessFile(
    { id: session.user.id, email: session.user.email!, position: session.user.position },
    segs,
  );
  if (!allowed) return new NextResponse("forbidden", { status: 403 });

  // Faylni aynan tekşiruvdan ötgan (normallaştirilgan) yöldan beramiz. Xom `path`dan olinsa,
  // oxirgi segmentdagi kodlangan "..%2F" tekşiruvni bir papkaga, berilgan faylni esa boşqasiga yönaltirardi.
  const fileName = segs[segs.length - 1];
  const subdir = segs.slice(0, -1).join("/");
  const f = await statFileForDownload(subdir, fileName);
  if (!f) return new NextResponse("not_found", { status: 404 });

  const mime = guessMime(fileName);

  // Ixtiyoriy ölçamlangan miniatura (avatarlar va h.k.). Hech qaçon halokatli emas — null → töliq oqim.
  const width = Number(req.nextUrl.searchParams.get("w"));
  if (width) {
    const resized = await tryResize(f.path, mime, width, f.size);
    if (resized) {
      // Maxfiy (kirish nazoratidagi) fayllar umumiy (proxy/CDN) keshida saqlanmasligi kerak.
      if (isSensitive) resized.headers.set("Cache-Control", "private, no-store");
      return resized;
    }
  }

  // Faylni Buffer ga yuklash örniga diskdan oqim qilib uzatamiz — katta
  // yuklab olish 2GB li serverda öz hajmiça RAM egallamasligi kerak.
  const body = Readable.toWeb(createReadStream(f.path)) as unknown as ReadableStream<Uint8Array>;
  const isMedia = mime.startsWith("image/") || mime.startsWith("video/");
  const headers = new Headers();
  headers.set("Content-Type", isMedia ? mime : "application/octet-stream");
  headers.set("Content-Length", String(f.size));
  headers.set("Content-Disposition", `inline; filename="${fileName}"`);
  if (isSensitive) {
    headers.set("Cache-Control", "private, no-store");
  } else if (isMedia) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new NextResponse(body, { headers });
}
