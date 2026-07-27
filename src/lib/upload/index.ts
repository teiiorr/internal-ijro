import "server-only";
import { writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 52428800);

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
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buf);

  return {
    url: `/api/files/${subdir}/${fileName}`,
    diskPath,
    fileName,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
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

export async function readFileForDownload(subdir: string, fileName: string): Promise<{ buf: Buffer; size: number } | null> {
  const safe = basename(fileName);
  const path = join(UPLOAD_DIR, subdir, safe);
  try {
    const st = await stat(path);
    if (!st.isFile()) return null;
    const { readFile } = await import("node:fs/promises");
    const buf = await readFile(path);
    return { buf, size: st.size };
  } catch {
    return null;
  }
}
