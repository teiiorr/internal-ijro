"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, notificationSettings } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { redirect } from "next/navigation";

const schema = z
  .object({
    fullName: z.string().min(2).max(255),
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "mismatch" });

export async function isSystemSetup(): Promise<boolean> {
  const row = await db.select({ id: users.id }).from(users).limit(1);
  return row.length > 0;
}

export async function setupDirektor(formData: FormData): Promise<void> {
  if (await isSystemSetup()) throw new Error("already_setup");

  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");

  const { fullName, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const inserted = await db
    .insert(users)
    .values({
      email,
      fullName,
      passwordHash,
      position: "direktor",
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });

  await db.insert(notificationSettings).values({ userId: inserted[0].id });

  redirect("/login");
}
