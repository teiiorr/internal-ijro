import { NextRequest, NextResponse } from "next/server";
import { getBotHandler } from "@/lib/telegram/bot";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const handler = getBotHandler();
  if (!handler) return new NextResponse("bot_not_configured", { status: 503 });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) return new NextResponse("forbidden", { status: 403 });
  }
  // grammy's std/http handler reads the Request and produces a Response
  return handler(req);
}
