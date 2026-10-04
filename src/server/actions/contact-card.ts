"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { employeeContactCards } from "@/lib/db/tables/staff-directory";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { can } from "@/lib/permissions/capabilities";
import {
  cardErrorCode,
  contactCardSchema,
  type ContactCardInput,
  type SaveContactCardResult,
} from "@/components/staff/staff-directory/card-schema";

/**
 * Kontakt kartani saqlaydi. Har kim faqat oʻz kartasini; HR rollari (employees.create:
 * direktor, oʻrinbosar, hr) — har kimnikini, va bu audit jurnaliga yoziladi.
 * Validatsiya xatolari tashlanmaydi, natija sifatida qaytariladi (prod'da server action
 * xato matnlari yashiriladi, foydalanuvchi esa aniq sababni koʻrishi kerak).
 */
export async function saveContactCard(input: ContactCardInput): Promise<SaveContactCardResult> {
  const me = await requireUser();
  if (me.position === "kontragent") throw new Error("forbidden");

  const parsed = contactCardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: cardErrorCode(parsed.error.issues.map((i) => i.path[0])) };
  }
  const d = parsed.data;

  const target = d.userId ?? me.id;
  if (target !== me.id && !can(me.position, "employees.create")) throw new Error("forbidden");

  const [u] = await db
    .select({ id: users.id, position: users.position })
    .from(users)
    .where(eq(users.id, target))
    .limit(1);
  if (!u || u.position === "kontragent") throw new Error("not_found");

  // Faqat yuborilgan maydonlar oʻzgaradi (undefined — tegilmaydi).
  const changed: Partial<typeof employeeContactCards.$inferInsert> = {};
  if (d.workPhone !== undefined) changed.workPhone = d.workPhone;
  if (d.internalExt !== undefined) changed.internalExt = d.internalExt;
  if (d.room !== undefined) changed.room = d.room;
  if (d.telegramUsername !== undefined) changed.telegramUsername = d.telegramUsername;
  if (d.bio !== undefined) changed.bio = d.bio;
  if (d.skills !== undefined) changed.skills = d.skills;
  if (d.showMobile !== undefined) changed.showMobile = d.showMobile;
  const patch = { ...changed, updatedAt: new Date() };

  // Karta va users.phone birga saqlanadi: biri muvaffaqiyatsiz boʻlsa, ikkinchisi ham qaytariladi.
  await db.transaction(async (tx) => {
    await tx
      .insert(employeeContactCards)
      .values({ userId: target, ...patch })
      .onConflictDoUpdate({ target: employeeContactCards.userId, set: patch });

    if (d.mobile !== undefined) {
      await tx.update(users).set({ phone: d.mobile, updatedAt: new Date() }).where(eq(users.id, target));
    }
  });

  if (target !== me.id) {
    await logActivity({
      userId: me.id,
      action: "contact_card.updated",
      entityType: "user",
      entityId: target,
      newValue: d.mobile !== undefined ? { ...changed, mobile: d.mobile } : changed,
    });
  }

  revalidatePath("/tuzilma");
  revalidatePath("/settings");
  revalidatePath(`/employees/${target}`);
  return { ok: true };
}
