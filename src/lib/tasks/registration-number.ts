import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";

/**
 * YYYY/MM/DD-NN formatida keyingi röyxatga oliş raqamini generatsiya qiladi.
 * NN — kunlik hisoblagiç, 2 xonagacha töldiriladi.
 */
export async function nextRegistrationNumber(now: Date = new Date()): Promise<string> {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `${yyyy}/${mm}/${dd}`;

  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(sql`${tasks.registrationNumber} like ${prefix + "-%"}`);
  const next = Number(rows[0]?.c ?? 0) + 1;
  return `${prefix}-${String(next).padStart(2, "0")}`;
}
