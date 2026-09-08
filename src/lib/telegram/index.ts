/**
 * Telegram orqali yetkazib beriş nuqtasi (2-bosqiç).
 *
 * Foydalanuvçi→chat boğlaş oqimi (bot, webhook, /start orqali chat_id ni oliş)
 * hali qurilmagan. Bu funksiya yagona integratsiya nuqtasi: bot token
 * sozlanmaguncha VA qabul qiluvçining boğlangan
 * `notificationSettings.telegramChatId` si bölmaguncha u uyqu holatida turadi;
 * şu ondan boşlab notify() hech qanday qöşimça sozlaşsiz şu orqali yetkazadi.
 * Iloji boriça işlaydi; çaqiruvçiga hech qaçon exception qaytarmaydi.
 */
export async function sendTelegram(chatId: string, title: string, message?: string, link?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return; // sozlanmagan / boğlanmagan → hech nima qilmaydi
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const text = [title, message, link ? `${base}${link}` : null].filter(Boolean).join("\n");
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // iloji boriça — Telegram uzilib qolsa ham ilova içidagi bildirişnomalar buzilmasligi kerak
  }
}
