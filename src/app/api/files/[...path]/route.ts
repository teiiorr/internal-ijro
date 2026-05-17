import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFileForDownload } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  const { path } = await ctx.params;
  if (!path || path.length < 2) return new NextResponse("not_found", { status: 404 });

  const fileName = path[path.length - 1];
  const subdir = path.slice(0, -1).join("/");
  const f = await readFileForDownload(subdir, fileName);
  if (!f) return new NextResponse("not_found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Length", String(f.size));
  headers.set("Content-Disposition", `inline; filename="${fileName}"`);
  return new NextResponse(new Uint8Array(f.buf), { headers });
}
