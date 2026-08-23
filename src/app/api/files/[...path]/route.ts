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

// Allowed resize widths (opt-in via ?w=). Clamped so callers can't request
// arbitrary sizes and blow up CPU/cache.
const RESIZE_WIDTHS = new Set([64, 96, 128, 256]);

/**
 * On-the-fly thumbnail for raster images, opt-in via `?w=<n>`. Fully guarded:
 * any failure (sharp missing, decode error, non-resizable type) falls through
 * to the normal full-file stream below, so image serving can never break.
 */
async function tryResize(filePath: string, mime: string, width: number): Promise<NextResponse | null> {
  if (!RESIZE_WIDTHS.has(width)) return null;
  if (!/^image\/(jpe?g|png|webp)$/.test(mime)) return null; // skip svg/gif/bmp/video
  try {
    const { default: sharp } = await import("sharp");
    const input = await readFile(filePath);
    const out = await sharp(input)
      .rotate() // honour EXIF orientation
      .resize(width, width, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const headers = new Headers();
    headers.set("Content-Type", "image/webp");
    headers.set("Content-Length", String(out.length));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new NextResponse(new Uint8Array(out), { headers });
  } catch {
    return null; // fall back to full stream
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

  // Opt-in resized thumbnail (avatars etc.). Never fatal — null → full stream.
  const width = Number(req.nextUrl.searchParams.get("w"));
  if (width) {
    const resized = await tryResize(f.path, mime, width);
    if (resized) return resized;
  }

  // Stream the file from disk instead of loading it into a Buffer — a large
  // download must not cost its full size in RAM on the 2GB box.
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
