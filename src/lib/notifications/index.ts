import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, notificationSettings, users } from "@/lib/db/schema";
import { sendMail } from "@/lib/email";

export type NotifyArgs = {
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
};

export async function notify(args: NotifyArgs): Promise<void> {
  if (args.userIds.length === 0) return;

  const uniq = Array.from(new Set(args.userIds));
  // 1) Persist in-app notifications for users who have it enabled
  const settings = await db
    .select({ userId: notificationSettings.userId, inApp: notificationSettings.inAppEnabled, email: notificationSettings.emailEnabled })
    .from(notificationSettings)
    .where(inArray(notificationSettings.userId, uniq));
  const map = new Map(settings.map((s) => [s.userId, s]));

  const toInsert: { userId: string; type: string; title: string; message: string | null; link: string | null; relatedEntityType: string | null; relatedEntityId: string | null }[] = [];
  for (const uid of uniq) {
    const s = map.get(uid);
    if (!s || s.inApp) {
      toInsert.push({
        userId: uid,
        type: args.type,
        title: args.title,
        message: args.message ?? null,
        link: args.link ?? null,
        relatedEntityType: args.entityType ?? null,
        relatedEntityId: args.entityId ?? null,
      });
    }
  }
  if (toInsert.length > 0) await db.insert(notifications).values(toInsert);

  // 2) Emails
  const emailUserIds = uniq.filter((id) => {
    const s = map.get(id);
    return !s || s.email;
  });
  if (emailUserIds.length > 0) {
    const recipients = await db
      .select({ email: users.email, fullName: users.fullName, lang: users.languagePreference })
      .from(users)
      .where(inArray(users.id, emailUserIds));
    await Promise.allSettled(
      recipients.map((r) =>
        sendMail({
          to: r.email,
          subject: args.title,
          html: `<p>Hello, ${r.fullName}.</p><p>${args.message ?? args.title}</p>${
            args.link ? `<p><a href="${process.env.APP_URL ?? "http://localhost:3000"}${args.link}">Open</a></p>` : ""
          }`,
        })
      )
    );
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.userId, userId));
}

export async function markAsRead(id: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));
  void userId;
}
