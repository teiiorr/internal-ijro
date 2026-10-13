import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

const KEY = "maintenance_mode";
// Jarayon ichidagi qisqa kesh — har bir sahifa yuklanishida DB'ni bezovta qilmaslik uchun.
let cache: { on: boolean; at: number } | null = null;
const TTL_MS = 8000;

/** Texnik rejim yoqilganmi. Jadval boʻlmasa (0037 qoʻllanmagan) — "off" (xavfsiz). */
export async function isMaintenanceOn(): Promise<boolean> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.on;
  let on = false;
  try {
    const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
    on = row?.value === "on";
  } catch {
    on = false;
  }
  cache = { on, at: Date.now() };
  return on;
}

/** Tumbler oʻzgarganda keshni darhol tozalaymiz (shu jarayonda tezda ta'sir qiladi). */
export function clearMaintenanceCache(): void {
  cache = null;
}

export { KEY as MAINTENANCE_KEY };
