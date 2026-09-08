import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendMail } from "@/lib/email";
import { deliverNotification, type DeliverArgs } from "./deliver";

export type NotifyArgs = DeliverArgs;

/**
 * Ilova tomonidagi notify: umumiy yadro orqali ilova içida + email + Telegram
 * yetkazib beradi, soröv doirasidagi db singletoni va SMTP mailer'dan
 * foydalanadi. Cron worker deliverNotification() ni öz db'si bilan
 * töğridan-töğri çaqiradi (qarang: scripts/worker.ts).
 */
export async function notify(args: NotifyArgs): Promise<void> {
  await deliverNotification(db, args, (opts) => sendMail(opts));
}

export async function markAllAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.userId, userId));
}

export async function markAsRead(id: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}
