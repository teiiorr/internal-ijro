import { NextRequest, NextResponse } from "next/server";
import { contentDisposition, isWordFile, wordMimeType } from "@/lib/internal-docs/logic";
import { fileStream } from "@/lib/internal-docs/serve";
import { loadAttachmentForViewer } from "@/lib/tasks/attachment-serve";

export const runtime = "nodejs";

/** Topşiriq hujjatini asl nomi bilan yuklab oliş. Içki xodimlar va öşa topşiriq studiyasi. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await loadAttachmentForViewer(id);
  if (r.status !== 200) return new NextResponse(null, { status: r.status });

  const { fileName } = r.attachment;
  const headers = new Headers();
  headers.set("Content-Type", isWordFile(fileName) ? wordMimeType(fileName) : "application/octet-stream");
  headers.set("Content-Length", String(r.file.size));
  headers.set("Content-Disposition", contentDisposition("attachment", fileName));
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(fileStream(r.file.path), { headers });
}
