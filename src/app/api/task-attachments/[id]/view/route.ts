import { NextRequest, NextResponse } from "next/server";
import { contentDisposition } from "@/lib/internal-docs/logic";
import { fileStream } from "@/lib/internal-docs/serve";
import { inlinePreviewMime } from "@/lib/files/file-kind";
import { loadAttachmentForViewer } from "@/lib/tasks/attachment-serve";

export const runtime = "nodejs";

/**
 * Brauzerda köriş: faqat PDF va oddiy rasmlar (aniq MIME bilan, nosniff). Boşqa turlar
 * brauzerda xavfsiz oçilmaydi, şuning uçun ular yuklab olişga yönaltiriladi.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await loadAttachmentForViewer(id);
  if (r.status !== 200) return new NextResponse(null, { status: r.status });

  const { fileName } = r.attachment;
  const mime = inlinePreviewMime(fileName);
  if (!mime) return NextResponse.redirect(new URL(`/api/task-attachments/${r.attachment.id}/download`, req.url), 303);

  const headers = new Headers();
  headers.set("Content-Type", mime);
  headers.set("Content-Length", String(r.file.size));
  headers.set("Content-Disposition", contentDisposition("inline", fileName));
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(fileStream(r.file.path), { headers });
}
