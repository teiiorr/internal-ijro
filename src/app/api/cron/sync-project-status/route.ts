import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncProjectStatusesFromSheet } from "@/lib/integrations/sheet-status";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Google Sheets → projects.currentStatus sinxroni. Sessiyasiz (GitHub Actions
// cron yoki Apps Script push çaqiradi), şuning uçun maxfiy token bilan himoyalangan.
// Token muhitda böş bölsa — funksiya öçirilgan hisoblanadi (503). Maxfiy söz FAQAT
// x-sync-secret header'ida qabul qilinadi — URL query'sida emas (query'lar proksi
// loglariga, brauzer tarixiga tuşib maxfiy sözni oşkor qilardi).

function tokenOk(provided: string | null): boolean {
  const secret = process.env.SHEET_SYNC_SECRET;
  if (!secret) return false; // sozlanmagan → öçirilgan
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false; // timingSafeEqual teng uzunlik talab qiladi
  return timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  // /api yöllari proksidagi umumiy rate-limitdan çetda — şu bois shu yerda öz
  // çegaramizni qöyamiz (maxfiy söz sizib ketsa ham, cheksiz çaqiriş bölmasin).
  if (!rateLimit("sync-project-status", 12, 60_000).allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  if (!process.env.SHEET_SYNC_SECRET) {
    return NextResponse.json({ ok: false, error: "sync_disabled" }, { status: 503 });
  }
  if (!tokenOk(req.headers.get("x-sync-secret"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const dryRun = ["1", "true", "yes"].includes((req.nextUrl.searchParams.get("dryRun") ?? "").toLowerCase());
  const result = await syncProjectStatusesFromSheet({ dryRun });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET ham quvvatlanadi (masalan ?dryRun=1 bilan) — ammo maxfiy söz baribir
// x-sync-secret header'ida yuborilişi kerak.
export async function GET(req: NextRequest) {
  return handle(req);
}
