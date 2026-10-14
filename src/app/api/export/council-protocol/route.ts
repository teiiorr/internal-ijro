import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { councilMeetings } from "@/lib/db/schema";

export const runtime = "nodejs";

// Ruxsat — boşqa kengash amallari bilan bir xil (pudratchidan tashqari hamma xodim).
const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"];

/** Kengash majlisini rasmiy bayonnoma (protokol) PDF sifatida yuklab olish. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!MANAGERS.includes(session.user.position)) return new NextResponse("forbidden", { status: 403 });

  const meetingId = req.nextUrl.searchParams.get("meeting");
  if (!meetingId) return new NextResponse("bad_request", { status: 400 });

  // Fayl nomi uçun sana + majlis mavjudligini tekshiramiz.
  const [m] = await db
    .select({ scheduledAt: councilMeetings.scheduledAt })
    .from(councilMeetings)
    .where(eq(councilMeetings.id, meetingId))
    .limit(1);
  if (!m) return new NextResponse("not_found", { status: 404 });

  const { buildCouncilProtocolPdf } = await import("@/lib/pdf/council-protocol");
  const pdf = await buildCouncilProtocolPdf(meetingId);
  if (!pdf) return new NextResponse("not_found", { status: 404 });

  const date = new Date(m.scheduledAt).toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `bayonnoma-${date}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
