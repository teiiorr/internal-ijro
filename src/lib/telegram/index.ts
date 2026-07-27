/**
 * Telegram delivery seam (Phase 2).
 *
 * The user→chat linking flow (bot, webhook, /start capture of chat_id) is NOT
 * built yet. This function is the single integration point: it stays dormant
 * until a bot token is configured AND the recipient has a linked
 * `notificationSettings.telegramChatId`, at which point notify() will deliver
 * through it with no further wiring. Best-effort; never throws to the caller.
 */
export async function sendTelegram(chatId: string, title: string, message?: string, link?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return; // not configured / not linked → no-op
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const text = [title, message, link ? `${base}${link}` : null].filter(Boolean).join("\n");
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // best-effort — a Telegram outage must never break in-app notifications
  }
}
