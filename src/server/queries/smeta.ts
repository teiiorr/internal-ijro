import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectSmetaItems } from "@/lib/db/schema";

/** Bitta smeta moddasi (decimal summalar string sifatida keladi — Drizzle qoidasi). */
export type SmetaItem = {
  id: string;
  category: string;
  description: string | null;
  plannedAmount: string;
  actualAmount: string | null;
  currency: string;
  orderIndex: number;
};

/** Valyuta bo'yicha jamlanma: reja, fakt va farq (reja − fakt). */
export type SmetaCurrencyTotal = {
  currency: string;
  planned: number;
  actual: number;
  /** Farq = reja − fakt. Musbat → tejaldi, manfiy → oshib ketdi. */
  variance: number;
};

export type ProjectSmeta = {
  items: SmetaItem[];
  totals: {
    /** Barcha moddalar bo'yicha yig'indi (axborot uchun; valyutalar aralash bo'lishi mumkin). */
    planned: number;
    actual: number;
    variance: number;
    /** Har bir valyuta bo'yicha alohida jamlanma — UI jadval oxirida shuni ko'rsatadi. */
    perCurrency: SmetaCurrencyTotal[];
  };
};

/** Postgres "undefined_table" (42P01) — 0043 migratsiyasi hali qoʻllanmagan (jadval yoʻq). */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

const EMPTY: ProjectSmeta = { items: [], totals: { planned: 0, actual: 0, variance: 0, perCurrency: [] } };

/**
 * Loyiha smetasi: moddalar (orderIndex bo'yicha tartiblangan) + hisoblangan jamlar.
 * Jamlar valyuta bo'yicha guruhlanadi (har bir valyuta uchun reja/fakt/farq), shu bilan
 * birga umumiy yig'indi ham qaytariladi.
 * 0043 hali qoʻllanmagan boʻlsa (jadval yoʻq) — boʻsh natija qaytaradi, sahifa yiqilmaydi.
 */
export async function getProjectSmeta(projectId: string): Promise<ProjectSmeta> {
  let rows: SmetaItem[];
  try {
    rows = await db
      .select({
        id: projectSmetaItems.id,
        category: projectSmetaItems.category,
        description: projectSmetaItems.description,
        plannedAmount: projectSmetaItems.plannedAmount,
        actualAmount: projectSmetaItems.actualAmount,
        currency: projectSmetaItems.currency,
        orderIndex: projectSmetaItems.orderIndex,
      })
      .from(projectSmetaItems)
      .where(eq(projectSmetaItems.projectId, projectId))
      .orderBy(asc(projectSmetaItems.orderIndex), asc(projectSmetaItems.createdAt));
  } catch (e) {
    if (isMissingTable(e)) return EMPTY;
    throw e;
  }

  // Valyuta bo'yicha guruhlab jamlaymiz (Map insert tartibini saqlaydi).
  const byCurrency = new Map<string, SmetaCurrencyTotal>();
  let planned = 0;
  let actual = 0;
  for (const r of rows) {
    const p = Number(r.plannedAmount) || 0;
    const a = r.actualAmount != null ? Number(r.actualAmount) || 0 : 0;
    planned += p;
    actual += a;
    const cur = byCurrency.get(r.currency) ?? { currency: r.currency, planned: 0, actual: 0, variance: 0 };
    cur.planned += p;
    cur.actual += a;
    cur.variance = cur.planned - cur.actual;
    byCurrency.set(r.currency, cur);
  }

  return {
    items: rows,
    totals: {
      planned,
      actual,
      variance: planned - actual,
      perCurrency: [...byCurrency.values()],
    },
  };
}
