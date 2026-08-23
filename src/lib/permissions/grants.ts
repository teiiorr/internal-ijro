import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";

/**
 * Owner-managed capability grants. These are ADDITIVE: they widen what a user
 * can do on top of the built-in position/allowlist rules — they never remove
 * access. Enforcement combines `canEditProjects(email) || hasGrant(...)`.
 */
export const MANAGED_CAPABILITIES = [
  "projects.edit",
  "money.view",
  "projects.upload_docs",
] as const;

export type ManagedCapability = (typeof MANAGED_CAPABILITIES)[number];

export function isManagedCapability(x: string): x is ManagedCapability {
  return (MANAGED_CAPABILITIES as readonly string[]).includes(x);
}

/** All capabilities granted to a user. Guarded: table absent → empty set. */
export async function getUserGrants(userId: string): Promise<Set<string>> {
  try {
    const rows = await db
      .select({ capability: userPermissions.capability })
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
    return new Set(rows.map((r) => r.capability));
  } catch {
    return new Set(); // migration 0023 not applied yet — no grants
  }
}

/** Whether a user has a specific capability grant. */
export async function hasGrant(userId: string, capability: ManagedCapability): Promise<boolean> {
  const grants = await getUserGrants(userId);
  return grants.has(capability);
}

/** Every grant row, for the admin UI. Guarded. Returns userId → capability[]. */
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
