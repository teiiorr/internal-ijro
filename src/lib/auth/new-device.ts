import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { renderNewDeviceLoginEmail, sendMail } from "@/lib/email";

/**
 * Send a "new device" email if no successful login for the same UA happened in the last 60 days.
 * Best-effort — failures are swallowed.
 */
export async function maybeSendNewDeviceEmail(opts: {
  userId: string;
  email: string;
  fullName: string;
  languagePreference: string;
}) {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? null;
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    if (!ua) return;

    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const prior = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, opts.userId),
          eq(activityLog.action, "auth.login_success"),
          eq(activityLog.userAgent, ua),
          gte(activityLog.createdAt, since)
        )
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(1);

    await db.insert(activityLog).values({
      userId: opts.userId,
      action: "auth.login_success",
      entityType: "user",
      entityId: opts.userId,
      ipAddress: ip,
      userAgent: ua,
    });

    if (prior.length === 0) {
      const mail = renderNewDeviceLoginEmail(opts.fullName, ip, ua, opts.languagePreference);
      await sendMail({ to: opts.email, subject: mail.subject, html: mail.html }).catch(() => {});
    }
  } catch (e) {
    console.error("new-device email failed", e);
  }
}
