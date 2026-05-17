"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationSettings, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateTwoFactorSecret, buildOtpAuthQr, verifyTotp } from "@/lib/auth/twofa";

export async function setNotificationFlags(flags: {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  notifyTaskAssigned?: boolean;
  notifyTaskDeadline?: boolean;
  notifyTaskComment?: boolean;
  notifyMention?: boolean;
}) {
  const me = await requireUser();
  await db
    .update(notificationSettings)
    .set({ ...flags, updatedAt: new Date() })
    .where(eq(notificationSettings.userId, me.id));
  revalidatePath("/settings");
}

export async function updateProfilePreferences(input: {
  languagePreference?: string;
  themePreference?: string;
}) {
  const me = await requireUser();
  await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, me.id));
  revalidatePath("/settings");
}

export async function changePasswordSelf(currentPassword: string, newPassword: string) {
  const me = await requireUser();
  const row = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (row.length === 0) throw new Error("not_found");
  const ok = await verifyPassword(currentPassword, row[0].passwordHash);
  if (!ok) throw new Error("wrong_password");
  if (newPassword.length < 8) throw new Error("too_short");
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, me.id));
}

export async function start2faSetup(): Promise<{ qr: string; secret: string }> {
  const me = await requireUser();
  const secret = generateTwoFactorSecret();
  await db.update(users).set({ twoFactorSecret: secret }).where(eq(users.id, me.id));
  const qr = await buildOtpAuthQr(me.email, secret);
  return { qr, secret };
}

export async function confirm2fa(token: string) {
  const me = await requireUser();
  const row = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (row.length === 0 || !row[0].twoFactorSecret) throw new Error("not_setup");
  if (!verifyTotp(token, row[0].twoFactorSecret)) throw new Error("invalid_code");
  await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, me.id));
  revalidatePath("/settings");
}

export async function disable2fa(token: string) {
  const me = await requireUser();
  const row = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (row.length === 0) return;
  if (row[0].twoFactorEnabled && row[0].twoFactorSecret) {
    if (!verifyTotp(token, row[0].twoFactorSecret)) throw new Error("invalid_code");
  }
  await db
    .update(users)
    .set({ twoFactorEnabled: false, twoFactorSecret: null })
    .where(eq(users.id, me.id));
  revalidatePath("/settings");
}
