import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";

/**
 * Egasi tomonidan boşqariladigan qobiliyat grantlari. Bular QÖŞIMÇA: ular
 * foydalanuvçi qila oladigan işlarni örnatilgan lavozim/allowlist qoidalari
 * ustiga kengaytiradi — heç qaçon kirişni olib taşlamaydi. Nazorat
 * `canEditProjects(email) || hasGrant(...)` ni birlaştiradi.
 */
export const MANAGED_CAPABILITIES = [
  "projects.edit",
  "money.view",
  "projects.upload_docs",
  "contractors.chat_read",
] as const;

export type ManagedCapability = (typeof MANAGED_CAPABILITIES)[number];

export function isManagedCapability(x: string): x is ManagedCapability {
  return (MANAGED_CAPABILITIES as readonly string[]).includes(x);
}

/** Foydalanuvçiga berilgan barça qobiliyatlar. Himoyalangan: jadval yöq bölsa → böş töplam. */
export async function getUserGrants(userId: string): Promise<Set<string>> {
  try {
    const rows = await db
      .select({ capability: userPermissions.capability })
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
    return new Set(rows.map((r) => r.capability));
  } catch {
    return new Set(); // 0023 migratsiyasi hali qöllanmagan — grantlar yöq
  }
}

/** Foydalanuvçida muayyan qobiliyat granti bor-yöqligini tekşiradi. */
export async function hasGrant(userId: string, capability: ManagedCapability): Promise<boolean> {
  const grants = await getUserGrants(userId);
  return grants.has(capability);
}

/** Admin UI uçun har bir grant qatori. Himoyalangan. userId → capability[] qaytaradi. */
export async function listAllGrants(): Promise<Record<string, string[]>> {
  try {
    const rows = await db
      .select({ userId: userPermissions.userId, capability: userPermissions.capability })
      .from(userPermissions);
    const map: Record<string, string[]> = {};
    for (const r of rows) (map[r.userId] ??= []).push(r.capability);
    return map;
  } catch {
    return {};
  }
}
