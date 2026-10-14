import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOwner } from "@/lib/permissions/owner";
import { canViewWeeklyBrief, parseWeekParam } from "@/lib/reports/weekly-brief-core";
import { canSeeMoney } from "@/lib/permissions/money";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

/** Haftalik rahbar brifingini PDF sifatida yuklab olish. Ruxsat — brifing koʻrish huquqi. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!canViewWeeklyBrief(session.user.position, isOwner(session.user.email))) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const week = parseWeekParam(req.nextUrl.searchParams.get("week") ?? undefined, new Date());
  const lp = req.nextUrl.searchParams.get("locale") ?? "";
  const locale = (routing.locales as readonly string[]).includes(lp) ? lp : routing.defaultLocale;
  const canMoney = await canSeeMoney({ id: session.user.id, email: session.user.email });

  const { buildWeeklyReportPdf } = await import("@/lib/pdf/weekly-report");
  const pdf = await buildWeeklyReportPdf(week, { canMoney, locale });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="haftalik-brifing-${week}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
