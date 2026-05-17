import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildEmployeeCardPdf } from "@/lib/pdf/employee-card";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  if (!["direktor", "orinbosar", "hr"].includes(session.user.position)) return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params;
  const pdf = await buildEmployeeCardPdf(id);
  if (!pdf) return new NextResponse("not_found", { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="employee-${id}.pdf"`,
    },
  });
}
