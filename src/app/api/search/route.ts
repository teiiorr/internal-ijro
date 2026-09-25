import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { globalSearch } from "@/server/queries/search";

export const runtime = "nodejs";

// Global qidiruv — faqat ichki xodimlar uchun (kontragentlar alohida portalda).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (session.user.position === "kontragent") return new NextResponse("forbidden", { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  if (q.trim().length < 2) {
    return NextResponse.json({ results: { projects: [], tasks: [], employees: [], studios: [], contests: [] } });
  }
  const results = await globalSearch(q);
  return NextResponse.json({ results });
}
