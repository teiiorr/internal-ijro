"use server";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { users, passwordResetTokens, invitations, notificationSettings, externalCompanies } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { sendMail, renderPasswordResetEmail, renderInvitationEmail } from "@/lib/email";

function token() {
  return crypto.randomBytes(32).toString("hex");
}

// --- Forgot password ---
const forgotSchema = z.object({ email: z.string().email() });
export async function requestPasswordReset(formData: FormData) {
  const parsed = forgotSchema.safeParse({ email: String(formData.get("email") ?? "").toLowerCase() });
  if (!parsed.success) return { ok: true } as const;

  const row = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (row.length === 0 || row[0].status !== "active") return { ok: true } as const;

  const t = token();
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId: row[0].id, token: t, expiresAt: expires });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password/${t}`;
  const mail = renderPasswordResetEmail(row[0].fullName, link, row[0].languagePreference);
  try {
    await sendMail({ to: row[0].email, subject: mail.subject, html: mail.html });
  } catch (e) {
    console.error("sendMail failed", e);
  }
  return { ok: true } as const;
}

// --- Reset password ---
const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});
export async function resetPassword(formData: FormData) {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" } as const;

  const now = new Date();
  const row = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, parsed.data.token),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);
  if (row.length === 0) return { error: "invalidToken" } as const;

  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, row[0].userId));
  await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, row[0].id));
  return { ok: true } as const;
}

// --- Accept invitation ---
const inviteSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(255),
});
export async function acceptInvitation(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) return { error: "invalid" } as const;

  const inv = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, parsed.data.token), gt(invitations.expiresAt, new Date()), isNull(invitations.acceptedAt)))
    .limit(1);
  if (inv.length === 0) return { error: "invalidToken" } as const;
  const i = inv[0];

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, i.email)).limit(1);
  if (existing.length > 0) return { error: "email_taken" } as const;

  const hash = await hashPassword(parsed.data.password);
  const inserted = await db
    .insert(users)
    .values({
      email: i.email,
      fullName: parsed.data.fullName,
      passwordHash: hash,
      position: i.position,
      departmentId: i.departmentId,
      reportsToUserId: i.reportsToUserId,
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });
  await db.insert(notificationSettings).values({ userId: inserted[0].id });
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, i.id));
  return { ok: true } as const;
}

// --- Contractor self-registration ---
const contractorSchema = z.object({
  companyName: z.string().min(2).max(255),
  contactPerson: z.string().min(2).max(255),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().min(4).max(50).optional().or(z.literal("")),
  password: z.string().min(8).max(128),
});
export async function registerContractor(formData: FormData) {
  const parsed = contractorSchema.safeParse({
    companyName: formData.get("companyName"),
    contactPerson: formData.get("contactPerson"),
    contactEmail: String(formData.get("contactEmail") ?? "").toLowerCase(),
    contactPhone: formData.get("contactPhone") ?? "",
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" } as const;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.contactEmail)).limit(1);
  if (existing.length > 0) return { error: "email_taken" } as const;

  await db.transaction(async (tx) => {
    const company = await tx
      .insert(externalCompanies)
      .values({
        name: parsed.data.companyName,
        contactPerson: parsed.data.contactPerson,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone || null,
        status: "pending",
      })
      .returning({ id: externalCompanies.id });

    const u = await tx
      .insert(users)
      .values({
        email: parsed.data.contactEmail,
        fullName: parsed.data.contactPerson,
        passwordHash: await hashPassword(parsed.data.password),
        position: "kontragent",
        status: "pending",
      })
      .returning({ id: users.id });

    await tx.insert(notificationSettings).values({ userId: u[0].id });
    void company;
  });

  return { ok: true } as const;
}

// --- Create invitation (used in Stage 2 — HR add employee) ---
const createInviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  position: z.enum([
    "direktor",
    "orinbosar",
    "koordinator",
    "bolim_boshligi",
    "bosh_mutaxassis",
    "yetakchi_mutaxassis",
    "mutaxassis",
    "hr",
  ]),
  departmentId: z.string().uuid().optional().nullable(),
  reportsToUserId: z.string().uuid().optional().nullable(),
  locale: z.string().default("ru"),
  invitedByUserId: z.string().uuid(),
});
export async function createInvitation(input: z.infer<typeof createInviteSchema>) {
  const parsed = createInviteSchema.parse(input);
  const t = token();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(invitations).values({
    email: parsed.email.toLowerCase(),
    fullName: parsed.fullName,
    position: parsed.position,
    departmentId: parsed.departmentId ?? null,
    reportsToUserId: parsed.reportsToUserId ?? null,
    token: t,
    invitedByUserId: parsed.invitedByUserId,
    expiresAt: expires,
  });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/${t}`;
  const mail = renderInvitationEmail(parsed.fullName, link, parsed.locale);
  try {
    await sendMail({ to: parsed.email, subject: mail.subject, html: mail.html });
  } catch (e) {
    console.error("sendMail failed", e);
  }
  return { ok: true, link } as const;
}
