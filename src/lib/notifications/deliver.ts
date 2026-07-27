import { inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { sendTelegram } from "../telegram";

const { notifications, notificationSettings, users } = schema;

/**
 * Server-only-free notification delivery core.
 *
 * Kept import-clean (no `server-only`, no `@/` DB singleton) so it can run both
 * inside Next server actions AND in the standalone `scripts/worker.ts` cron.
 * The caller supplies the drizzle instance and (optionally) an email sender.
 */
export type DeliverArgs = {
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
};

export type Mailer = (opts: { to: string; subject: string; html: string }) => Promise<unknown>;

export async function deliverNotification(
  db: PostgresJsDatabase<typeof schema>,
  args: DeliverArgs,
  mailer?: Mailer
): Promise<void> {
  if (args.userIds.length === 0) return;
  const uniq = Array.from(new Set(args.userIds));

  const settings = await db
    .select({
      userId: notificationSettings.userId,
      inApp: notificationSettings.inAppEnabled,
      email: notificationSettings.emailEnabled,
      telegram: notificationSettings.telegramEnabled,
      telegramChatId: notificationSettings.telegramChatId,
    })
    .from(notificationSettings)
    .where(inArray(notificationSettings.userId, uniq));
  const map = new Map(settings.map((s) => [s.userId, s]));

  // 1) In-app (default on when the user has no settings row)
  const toInsert = uniq
    .filter((uid) => {
      const s = map.get(uid);
      return !s || s.inApp;
    })
    .map((uid) => ({
      userId: uid,
      type: args.type,
      title: args.title,
      message: args.message ?? null,
      link: args.link ?? null,
      relatedEntityType: args.entityType ?? null,
      relatedEntityId: args.entityId ?? null,
    }));
  if (toInsert.length > 0) await db.insert(notifications).values(toInsert);

  // 2) Email (opt-in) — only when a mailer is provided
  if (mailer) {
    const emailUserIds = uniq.filter((id) => map.get(id)?.email === true);
    if (emailUserIds.length > 0) {
      const recipients = await db
        .select({ email: users.email, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, emailUserIds));
      const base = process.env.APP_URL ?? "http://localhost:3000";
      await Promise.allSettled(
        recipients.map((r) =>
          mailer({
            to: r.email,
            subject: args.title,
            html: `<p>${r.fullName},</p><p>${args.message ?? args.title}</p>${
              args.link ? `<p><a href="${base}${args.link}">Open</a></p>` : ""
            }`,
          })
        )
      );
    }
  }

  // 3) Telegram (opt-in + linked chat) — dormant until a bot token + chat id exist
  const tgTargets = uniq
    .map((id) => map.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.telegram === true && !!s.telegramChatId);
  if (tgTargets.length > 0) {
    await Promise.allSettled(
      tgTargets.map((s) => sendTelegram(s.telegramChatId as string, args.title, args.message, args.link))
    );
  }
}
