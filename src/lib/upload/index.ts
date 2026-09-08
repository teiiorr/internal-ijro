import "server-only";
import { mkdir, unlink, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600);

/** Yuklaş hajmi çegarasi (bayt) — server va (prop orqali) mijoz uçun yagona haqiqat manbai. */
export const MAX_UPLOAD_BYTES = MAX_BYTES;

/** Fayl kengaytmasi bajariladigan/aktiv-kontent qora röyxatida bölsa, true qaytaradi. */
export function isForbiddenExt(fileName: string): boolean {
  return FORBIDDEN_EXT.has(extname(fileName).toLowerCase());
}

// Bosqiç hujjatlari HAR QANDAY formatni qabul qiladi. Minimal xavfsizlik çorasi =
// bajariladigan/aktiv-kontent qora röyxati (fayllar `Content-Disposition: inline` bilan
// beriladi, şuning uçun skript işga tuşira oladigan markup — .html/.svg va h.k. — ilova
// originida saqlangan XSS'ning oldini oliş uçun bloklanadi).
const FORBIDDEN_EXT = new Set([
  ".exe", ".bat", ".sh", ".cmd", ".com", ".js", ".mjs", ".cjs", ".jar", ".msi",
  ".vbs", ".ps1", ".scr", ".app", ".dll",
  // active markup — dangerous under inline disposition
  ".html", ".htm", ".xhtml", ".svg", ".svgz", ".xml", ".xsl", ".mht", ".mhtml",
]);

export type StoredFile = {
  url: string;
  diskPath: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
};

export async function storeFile(file: File, subdir: string): Promise<StoredFile> {
  if (file.size > MAX_BYTES) throw new Error("file_too_large");
  if (file.size === 0) throw new Error("file_empty");
  const ext = extname(file.name).toLowerCase();
  // Standart holda ruxsat: bajariladigan/aktiv-kontent qora röyxatidan boşqa har qanday format.
  if (FORBIDDEN_EXT.has(ext)) throw new Error("ext_forbidden");

  const targetDir = join(UPLOAD_DIR, subdir);
  await mkdir(targetDir, { recursive: true });
  const safeExt = ext || "";
  const fileName = `${randomUUID()}${safeExt}`;
  const diskPath = join(targetDir, fileName);

  // Faylni butunlay Buffer'ga yiğmasdan, yuklamani toğridan-toğri diskka stream
  // qilamiz. Har bir sörov uçun 60–100MB Buffer — aynan serverni ağdarib
  // tuşiradigan xotira sakraşi; stream esa eng yuqori xotira sarfini past ushlaydi.
  // Har qanday xatolikda yarim yozilgan faylni öçiramiz, toki buzuq qoldiq qolmasin.
  try {
    await pipeline(
      Readable.fromWeb(file.stream() as unknown as NodeWebReadableStream<Uint8Array>),
      createWriteStream(diskPath)
    );
  } catch (err) {
    await unlink(diskPath).catch(() => {});
    throw err;
  }

  return {
    url: `/api/files/${subdir}/${fileName}`,
    diskPath,
    fileName,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Faylni toğridan-toğri sörov tanasi (body) stream'idan saqlaydi (butun faylni buffer'ga yiğmasdan).
 * Bu kiçik production serverida katta fayllarni yuklaş uçun xotira jihatidan xavfsiz yöl:
 * baytlar bölaklar (chunk) böyiça request → disk yönalişida oqadi, şuning uçun fayl
 * hajmidan qat'i nazar eng yuqori RAM sarfi past qoladi. Hajm çegarasini stream davomida
 * tekşiradi (yolğon Content-Length katta faylni bizdan yaşirib ötkaza olmaydi) va har
 * qanday xatolikda yarim faylni tözalaydi.
 */
export async function storeStream(
  body: NodeWebReadableStream<Uint8Array> | ReadableStream<Uint8Array> | null,
  opts: { fileName: string; subdir: string; mimeType?: string | null; declaredSize?: number | null }
): Promise<StoredFile> {
  if (!body) throw new Error("file_empty");
  const ext = extname(opts.fileName).toLowerCase();
  if (FORBIDDEN_EXT.has(ext)) throw new Error("ext_forbidden");
  // Mijozning özi hajm çegarasidan oşganini aytsa, tezda rad etamiz.
  if (opts.declaredSize != null && opts.declaredSize > MAX_BYTES) throw new Error("file_too_large");

  const targetDir = join(UPLOAD_DIR, opts.subdir);
  await mkdir(targetDir, { recursive: true });
  const fileName = `${randomUUID()}${ext || ""}`;
  const diskPath = join(targetDir, fileName);

  let bytes = 0;
  const cap = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        cb(new Error("file_too_large"));
        return;
      }
      cb(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(body as NodeWebReadableStream<Uint8Array>),
      cap,
      createWriteStream(diskPath)
    );
  } catch (err) {
    await unlink(diskPath).catch(() => {});
    throw err;
  }

  if (bytes === 0) {
    await unlink(diskPath).catch(() => {});
    throw new Error("file_empty");
  }

  return {
    url: `/api/files/${opts.subdir}/${fileName}`,
    diskPath,
    fileName,
    originalName: opts.fileName,
    size: bytes,
    mimeType: opts.mimeType || "application/octet-stream",
  };
}

export async function deleteFileByUrl(url: string): Promise<void> {
  const rel = url.replace(/^\/api\/files\//, "");
  const path = join(UPLOAD_DIR, rel);
  try {
    await unlink(path);
  } catch {
    // e'tibor bermaymiz — allaqaçon yöq
  }
}

/**
 * Yuklab oliş uçun saqlangan faylning absolyut yölini va hajmini aniqlaydi — uni
 * xotiraga öqimasdan. Route uni diskdan stream qiladi (createReadStream), şuning
 * uçun 100MB faylni uzatiş 100MB Buffer örniga doimiy bir neça KB RAM sarflaydi.
 * `basename` söralgan nomdan har qanday path traversal'ni olib taşlaydi.
 */
export async function statFileForDownload(subdir: string, fileName: string): Promise<{ path: string; size: number } | null> {
  const safe = basename(fileName);
  const path = join(UPLOAD_DIR, subdir, safe);
  try {
    const st = await stat(path);
    if (!st.isFile()) return null;
    return { path, size: st.size };
  } catch {
    return null;
  }
}
