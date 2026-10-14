"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationSettings, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateTwoFactorSecret, buildOtpAuthQr, verifyTotp } from "@/lib/auth/twofa";
import { type ActionResult } from "@/lib/action-result";

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
  // Til afzalligini NEXT_LOCALE kukisiga ham yozamiz: sahifa/URL yangilanganda va
  // keyingi loginda til aynan saqlanadi (standart uz-latn'ga qaytib qolmaydi).
  if (input.languagePreference) {
    try {
      (await cookies()).set("NEXT_LOCALE", input.languagePreference, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } catch {}
  }
  revalidatePath("/settings");
}

export async function changePasswordSelf(currentPassword: string, newPassword: string): Promise<ActionResult> {
  const me = await requireUser();
  const row = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (row.length === 0) return { ok: false, error: "not_found" };
  const valid = await verifyPassword(currentPassword, row[0].passwordHash);
  if (!valid) return { ok: false, error: "wrong_password" };
  if (newPassword.length < 8) return { ok: false, error: "too_short" };
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, me.id));
  return { ok: true };
}

export async function start2faSetup(): Promise<{ qr: string; secret: string }> {
  const me = await requireUser();
  const secret = generateTwoFactorSecret();
  await db.update(users).set({ twoFactorSecret: secret }).where(eq(users.id, me.id));
  const qr = await buildOtpAuthQr(me.email, secret);
  return { qr, secret };
}

export async function confirm2fa(token: string): Promise<ActionResult> {
  const me = await requireUser();
  const row = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (row.length === 0 || !row[0].twoFactorSecret) return { ok: false, error: "not_setup" };
  if (!verifyTotp(token, row[0].twoFactorSecret)) return { ok: false, error: "invalid_code" };
  await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, me.id));
  revalidatePath("/settings");
  return { ok: true };
}

export async function disable2fa(token: string): Promise<ActionResult> {
  const me = await requireUser();
  const row = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (row.length === 0) return { ok: true };
  if (row[0].twoFactorEnabled && row[0].twoFactorSecret) {
    if (!verifyTotp(token, row[0].twoFactorSecret)) return { ok: false, error: "invalid_code" };
  }
  await db
    .update(users)
    .set({ twoFactorEnabled: false, twoFactorSecret: null })
    .where(eq(users.id, me.id));
  revalidatePath("/settings");
  return { ok: true };
}
