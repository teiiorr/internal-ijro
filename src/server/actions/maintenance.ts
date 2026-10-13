"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { clearMaintenanceCache, MAINTENANCE_KEY } from "@/lib/maintenance";
import { logActivity } from "@/lib/audit";

/** Texnik rejimni yoqish/oʻchirish — FAQAT platforma egasi. Yoqilganda egadan boshqa
 *  hamma /texnik sahifasiga yoʻnaltiriladi (dashboard/contractor layout'larida). */
export async function setMaintenanceMode(on: boolean): Promise<{ ok: boolean }> {
  const me = await requireUser();
  if (!isOwner(me.email)) throw new Error("forbidden");

  await db
    .insert(appSettings)
    .values({ key: MAINTENANCE_KEY, value: on ? "on" : "off", updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: on ? "on" : "off", updatedAt: new Date() } });

  clearMaintenanceCache();
  await logActivity({ userId: me.id, action: on ? "maintenance.on" : "maintenance.off", entityType: "system" });
  revalidatePath("/owner");
  return { ok: true };
}
