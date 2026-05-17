import "server-only";
import { writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 52428800);

const FORBIDDEN_EXT = new Set([".exe", ".bat", ".sh", ".cmd", ".com", ".js", ".jar", ".msi", ".vbs", ".ps1"]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "text/plain",
  "text/csv",
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
  if (!ALLOWED_MIME.has(file.type)) throw new Error("mime_not_allowed");
  const ext = extname(file.name).toLowerCase();
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
