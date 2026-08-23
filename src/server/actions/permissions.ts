"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { isManagedCapability } from "@/lib/permissions/grants";
import { logActivity } from "@/lib/audit";

/** Owner-only: grant or revoke a managed capability for a user. */
export async function setUserPermission(userId: string, capability: string, enabled: boolean) {
  const me = await requireUser();
  if (!isOwner(me.email)) throw new Error("forbidden");
  if (!isManagedCapability(capability)) throw new Error("bad_capability");

  if (enabled) {
    await db
      .insert(userPermissions)
      .values({ userId, capability, grantedByUserId: me.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.capability, capability)));
  }

  await logActivity({
    userId: me.id,
    action: enabled ? "permission.granted" : "permission.revoked",
    entityType: "user",
    entityId: userId,
    newValue: { capability },
  });
  revalidatePath("/owner");
}
