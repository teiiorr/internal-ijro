import "server-only";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { statFileForDownload } from "@/lib/upload";

/** Hujjatning `fileUrl` (/api/files/internal-docs/<fayl>) manzilidan diskdagi faylni topadi. */
export async function locateInternalDocFile(fileUrl: string): Promise<{ path: string; size: number } | null> {
  const m = /^\/api\/files\/internal-docs\/([^/]+)$/.exec(fileUrl);
  if (!m) return null;
  return statFileForDownload("internal-docs", m[1]);
}

/** Faylni xotiraga yuklamasdan diskdan oqim sifatida uzatish uchun tana. */
export function fileStream(path: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(path)) as unknown as ReadableStream<Uint8Array>;
}
