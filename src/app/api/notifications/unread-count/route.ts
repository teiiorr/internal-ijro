import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)));
  return NextResponse.json({ count: Number(rows[0]?.c ?? 0) });
}
