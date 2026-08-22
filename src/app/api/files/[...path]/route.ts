import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  const { path } = await ctx.params;
  if (!path || path.length < 2) return new NextResponse("not_found", { status: 404 });

  const fileName = path[path.length - 1];
  const subdir = path.slice(0, -1).join("/");
  const f = await statFileForDownload(subdir, fileName);
  if (!f) return new NextResponse("not_found", { status: 404 });

  // Stream the file from disk instead of loading it into a Buffer — a large
  // download must not cost its full size in RAM on the 2GB box.
  const body = Readable.toWeb(createReadStream(f.path)) as unknown as ReadableStream<Uint8Array>;
  const mime = guessMime(fileName);
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
