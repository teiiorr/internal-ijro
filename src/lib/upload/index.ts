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

/** The upload size cap in bytes — single source of truth for server + (via prop) client. */
export const MAX_UPLOAD_BYTES = MAX_BYTES;

/** True if the file extension is on the executable/active-content blocklist. */
export function isForbiddenExt(fileName: string): boolean {
  return FORBIDDEN_EXT.has(extname(fileName).toLowerCase());
}

// Stage documents accept ANY format. Security floor = an executable/active-content
// blocklist (files are served with `Content-Disposition: inline`, so markup that can
// run script — .html/.svg/etc. — is blocked to prevent stored XSS on the app origin).
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
  // Allow-by-default: any format except the executable/active-content blocklist.
  if (FORBIDDEN_EXT.has(ext)) throw new Error("ext_forbidden");

  const targetDir = join(UPLOAD_DIR, subdir);
  await mkdir(targetDir, { recursive: true });
  const safeExt = ext || "";
  const fileName = `${randomUUID()}${safeExt}`;
  const diskPath = join(targetDir, fileName);

  // Stream the upload straight to disk rather than buffering the whole file into
  // a Buffer. A 60–100MB Buffer per request is exactly the kind of memory spike
  // that took the server down; streaming keeps peak memory flat. On any failure
  // we remove the half-written file so no truncated garbage is left behind.
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
 * Store a file straight from a request body stream (no full-file buffering).
 * This is the memory-safe path for large uploads on the small production box:
 * bytes flow request → disk in chunks, so peak RAM stays flat regardless of the
 * file size. Enforces the size cap WHILE streaming (a lying Content-Length can't
 * sneak a huge file past us) and cleans up the partial file on any failure.
 */
export async function storeStream(
  body: NodeWebReadableStream<Uint8Array> | ReadableStream<Uint8Array> | null,
  opts: { fileName: string; subdir: string; mimeType?: string | null; declaredSize?: number | null }
): Promise<StoredFile> {
  if (!body) throw new Error("file_empty");
  const ext = extname(opts.fileName).toLowerCase();
  if (FORBIDDEN_EXT.has(ext)) throw new Error("ext_forbidden");
  // Fast reject when the client already tells us it's over the cap.
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
    // ignore — already gone
  }
}

/**
 * Resolve a stored file's absolute path + size for download — WITHOUT reading it
 * into memory. The route streams it from disk (createReadStream), so serving a
 * 100MB file costs a constant few KB of RAM instead of a 100MB Buffer. `basename`
 * strips any path traversal from the requested name.
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
