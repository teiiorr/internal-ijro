import "server-only";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationSettings, tasks, users } from "@/lib/db/schema";
import { svcChangeTaskStatusByChatId } from "./service";
import type { TaskStatus } from "@/lib/permissions/tasks";

const token = process.env.TELEGRAM_BOT_TOKEN ?? "";

let cached: Bot | null = null;
function getBot(): Bot | null {
  if (!token) return null;
  if (cached) return cached;
  cached = new Bot(token);

  cached.command("start", async (ctx) => {
    await ctx.reply(
      `Welcome to Ichki Ijro!\n\nTo link your account, go to Settings → Telegram in the web app and copy the linking code, then send it here as a plain message.`
    );
  });

  cached.command("help", async (ctx) => {
    await ctx.reply(`/today — show today's tasks\n/standup — submit standup (TBD)\n/help — this message`);
  });

  cached.command("today", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;
    const linked = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .innerJoin(notificationSettings, eq(notificationSettings.userId, users.id))
      .where(eq(notificationSettings.telegramChatId, chatId))
      .limit(1);
    if (linked.length === 0) {
      await ctx.reply("Your Telegram is not linked. Open Settings → Telegram in the web app.");
      return;
    }
    const myTasks = await db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, deadline: tasks.deadline })
      .from(tasks)
      .where(and(eq(tasks.assignedToUserId, linked[0].id), sql`${tasks.status} not in ('completed','rejected')`))
      .orderBy(desc(tasks.deadline))
      .limit(10);
    if (myTasks.length === 0) {
      await ctx.reply("No active tasks. 🎉");
      return;
    }
    for (const t of myTasks) {
      const kb = new InlineKeyboard()
        .text("In progress", `task:${t.id}:in_progress`)
        .text("Submit", `task:${t.id}:under_review`);
      await ctx.reply(
        `${t.title}\nStatus: ${t.status}${t.deadline ? `\nDue: ${new Date(t.deadline).toLocaleString()}` : ""}`,
        { reply_markup: kb }
      );
    }
  });

  // Inline callback to change status (best-effort — requires linked user)
  cached.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const m = data.match(/^task:([0-9a-f-]+):(\w+)$/);
    if (!m) return ctx.answerCallbackQuery();
    const [, taskId, status] = m;
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return ctx.answerCallbackQuery();
    const res = await svcChangeTaskStatusByChatId({
      chatId,
      taskId,
      nextStatus: status as TaskStatus,
    });
    if (res.ok) await ctx.answerCallbackQuery({ text: `Status → ${status}` });
    else await ctx.answerCallbackQuery({ text: res.reason });
  });

  // Plain-text: try to interpret as linking code
  cached.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;
    // Linking code = 8-digit numeric
    if (!/^\d{6,12}$/.test(text)) return;
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;
    // Find user with two_factor_secret OR a temp linking_code we store in notification_settings.telegramChatId pattern "pending:<code>"
    const rows = await db
      .select({ userId: notificationSettings.userId })
      .from(notificationSettings)
      .where(eq(notificationSettings.telegramChatId, `pending:${text}`))
      .limit(1);
    if (rows.length === 0) {
      await ctx.reply("Linking code not found or expired.");
      return;
    }
    await db
      .update(notificationSettings)
      .set({ telegramChatId: chatId, telegramEnabled: true })
      .where(eq(notificationSettings.userId, rows[0].userId));
    await ctx.reply("Account linked! You'll receive notifications here.");
  });

  return cached;
}

export function getBotHandler() {
  const bot = getBot();
  if (!bot) return null;
  return webhookCallback(bot, "std/http");
}

export async function sendTelegramTo(chatId: string, text: string): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;
  try {
    await bot.api.sendMessage(chatId, text);
    return true;
  } catch (e) {
    console.error("telegram send error", e);
    return false;
  }
}
