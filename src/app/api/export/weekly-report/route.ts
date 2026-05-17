import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildWeeklyReportPdf } from "@/lib/pdf/weekly-report";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  if (!["direktor", "orinbosar"].includes(session.user.position)) return new NextResponse("forbidden", { status: 403 });
  const pdf = await buildWeeklyReportPdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="weekly-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
