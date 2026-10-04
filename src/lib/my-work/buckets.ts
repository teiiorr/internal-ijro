// "Mening ishlarim" — sof (DB'siz) sana yordamchilari. Barcha sanalar "YYYY-MM-DD"
// koʻrinishidagi Toshkent (UTC+5, yozgi vaqtsiz) kalendar kunlari sifatida qaraladi.

export type Bucket = "overdue" | "today" | "tomorrow" | "week" | "later" | "nodate";

/** Boʻlimlarning sahifadagi tartibi. */
export const BUCKET_ORDER: Bucket[] = ["overdue", "today", "tomorrow", "week", "later", "nodate"];

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" toʻgʻri kalendar sanasimi (2026-02-30 kabi qiymatlar rad etiladi). */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Toshkent boʻyicha bugungi sana, "YYYY-MM-DD". */
export function todayTashkent(now: Date = new Date()): string {
  return new Date(now.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO sanaga n kun qoʻshadi (UTC yarim tunida hisoblanadi — DST muammosi yoʻq). */
export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** ISO hafta kuni: 1 = dushanba … 7 = yakshanba. */
function isoWeekday(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = yakshanba
  return d === 0 ? 7 : d;
}

/** Joriy ISO haftaning dushanbadan yakshanbagacha boʻlgan 7 kuni. */
export function weekDays(todayIso: string): string[] {
  const monday = addDays(todayIso, 1 - isoWeekday(todayIso));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Sanani boʻlimga ajratadi:
 * - overdue  — bugundan oldin;
 * - today    — bugun;
 * - tomorrow — ertaga (hatto u keyingi haftaga toʻgʻri kelsa ham);
 * - week     — joriy ISO haftaning qolgan kunlari (yakshanbagacha);
 * - later    — undan keyin;
 * - nodate   — sana yoʻq (yoki yaroqsiz).
 */
export function bucketOf(date: string | null | undefined, todayIso: string): Bucket {
  if (!date) return "nodate";
  const d = date.slice(0, 10);
  if (!isIsoDate(d)) return "nodate";
  if (d < todayIso) return "overdue";
  if (d === todayIso) return "today";
  if (d === addDays(todayIso, 1)) return "tomorrow";
  const sunday = addDays(todayIso, 7 - isoWeekday(todayIso));
  if (d <= sunday) return "week";
  return "later";
}

/** Har bir kun uchun elementlar soni (berilgan kunlar uchun 0 bilan boshlanadi). */
export function countByDay(items: { date: string | null }[], days: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) out[d] = 0;
  for (const it of items) {
    if (!it.date) continue;
    const d = it.date.slice(0, 10);
    if (d in out) out[d] += 1;
  }
  return out;
}

/** Sana tugashidagi Toshkent vaqti (23:59:59+05:00) — sanagacha teskari sanoq uchun. */
export function endOfTashkentDay(iso: string): string {
  return `${iso.slice(0, 10)}T23:59:59+05:00`;
}
