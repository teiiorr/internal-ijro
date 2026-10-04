import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAckRequestDetail } from "@/server/queries/normative-ack";

export const runtime = "nodejs";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Tanishtirish varaqasi" PDF — only for the requester, direktor, orinbosar, hr (404 otherwise). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!GUID.test(id)) return new NextResponse("not_found", { status: 404 });

  const detail = await getAckRequestDetail({ id: session.user.id, position: session.user.position }, id.toLowerCase());
  if (!detail) return new NextResponse("not_found", { status: 404 });

  const { renderAckSheet } = await import("@/lib/pdf/ack-sheet");
  const pdf = await renderAckSheet(detail);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="tanishtirish-varaqasi-${id.slice(0, 8).toLowerCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
