import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendMail } from "@/lib/email";
import { deliverNotification, type DeliverArgs } from "./deliver";

export type NotifyArgs = DeliverArgs;

/**
 * App-side notify: delivers in-app + email + Telegram via the shared core,
 * using the request-scoped db singleton and the SMTP mailer. The cron worker
 * calls deliverNotification() directly with its own db (see scripts/worker.ts).
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
