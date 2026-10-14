/**
 * Roʻyxatlar uchun yagona "load more" yordamchisi — hammasi server tomonda,
 * `?take=` searchParam orqali boshqariladi. Qattiq LIMIT bilan maʼlumotni jimgina
 * tashlab yuborish oʻrniga, foydalanuvchi oynani bosqichma-bosqich kattalashtiradi.
 *
 * Naqsh: sahifa `parseTake` bilan joriy oyna oʻlchamini oladi, soʻrovga `take + 1`
 * uzatadi, natijani `sliceWindow` bilan kesib "yana bormi" ni aniqlaydi va
 * `loadMoreHref` bilan keyingi oynaga havola yasaydi.
 */

/** Standart sahifa oʻlchami — bitta urinishda koʻrsatiladigan qatorlar soni. */
export const DEFAULT_PAGE_SIZE = 50;

/** Himoya chegarasi — bitta oynada hech qachon bundan koʻp qator soʻralmaydi. */
const MAX_TAKE = 5000;

/**
 * `?take=` qiymatini xavfsiz, chegaralangan butun songa aylantiradi. Yaroqsiz yoki
 * juda kichik qiymat → bitta sahifa; juda katta → MAX_TAKE bilan cheklanadi.
 */
export function parseTake(raw: string | string[] | undefined, pageSize = DEFAULT_PAGE_SIZE): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < pageSize) return pageSize;
  return Math.min(Math.trunc(n), MAX_TAKE);
}

/**
 * `take + 1` qator soʻralgan natijadan "yana bormi?" ni aniqlaydi va oynani aniq
 * `take` qatorga kesadi. Bitta qoʻshimcha qatorning oʻzi = yana bor degan belgidir.
 */
export function sliceWindow<T>(rows: T[], take: number): { items: T[]; hasMore: boolean } {
  const hasMore = rows.length > take;
  return { items: hasMore ? rows.slice(0, take) : rows, hasMore };
}

/**
 * Load-more havolasi uchun querystring — joriy string searchParam'larni saqlab,
 * `take`ni bitta sahifaga oshiradi. Massiv (takroriy) paramlar tushirib qoldiriladi.
 * Natija `?a=b&take=100` koʻrinishida, joriy yoʻlga nisbatan (locale prefiksi saqlanadi).
 */
export function loadMoreHref(
  sp: Record<string, string | string[] | undefined>,
  take: number,
  pageSize = DEFAULT_PAGE_SIZE,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "take") continue;
    if (typeof v === "string") p.set(k, v);
  }
  p.set("take", String(take + pageSize));
  return `?${p.toString()}`;
}
