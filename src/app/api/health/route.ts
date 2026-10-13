import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Sog'liqni tekshirish — joylashtirishdan keyingi smoke-check va uptime monitoring uchun.
 * DB ulanishini tekshiradi; ulanmasa 503 qaytaradi. Keshlanmaydi.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    uptimeSeconds: Math.round(process.uptime()),
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
