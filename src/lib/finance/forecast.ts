/**
 * Pul oqimi prognozi uchun SOF yordamchilar (DB yoʻq, "server-only" yoʻq) — server
 * sahifasi ham, mijoz grafigi ham, vitest ham bemalol import qiladi.
 *
 * Barcha oylar Toshkent vaqti (+05:00) boʻyicha 'YYYY-MM' koʻrinishidagi kalitlar.
 * Valyutalar HECH QACHON aralashtirilmaydi: har bir hisob valyuta boʻyicha alohida.
 */

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_ONLY_RE = /^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/;

/** Prognoz kalitlari: oy ('YYYY-MM') yoki maxsus savatlar. */
export type ForecastSpecialBucket = "overdue" | "nodate" | "later";
export const FORECAST_SPECIAL_BUCKETS: readonly ForecastSpecialBucket[] = ["overdue", "nodate", "later"];

/** valyuta → (oy | 'overdue' | 'nodate' | 'later') → summa */
export type ForecastBuckets = Record<string, Record<string, number>>;

export type ForecastStage = { remaining: number; currency: string; plannedDeadline: string | null };
export type ActualPoint = { month: string; currency: string; amount: number };
export type CashflowRow = { month: string; paid: number; forecast: number };

function tryMonthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const s = iso.trim();
  if (MONTH_RE.test(s)) return s;
  // Faqat sana ('YYYY-MM-DD', masalan planned_deadline) — kalendar sanasi, vaqt mintaqasisiz.
  if (DATE_ONLY_RE.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 7);
}

/**
 * Sanani/vaqtni Toshkent boʻyicha 'YYYY-MM' oy kalitiga aylantiradi.
 * - 'YYYY-MM-DD' (date ustuni) — oʻsha kalendar oyi;
 * - toʻliq ISO vaqt — +05:00 ga siljitilib olinadi (30-sentabr 20:00Z → '…-10').
 * Notoʻgʻri qiymatda RangeError tashlaydi.
 */
export function monthKey(iso: string): string {
  const k = tryMonthKey(iso);
  if (!k) throw new RangeError(`Invalid date: ${iso}`);
  return k;
}

/** 'YYYY-MM' oyni `delta` oyga siljitadi (manfiy ham boʻladi). */
export function shiftMonth(month: string, delta: number): string {
  const m = MONTH_RE.exec(month);
  if (!m) throw new RangeError(`Invalid month: ${month}`);
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + Math.trunc(delta);
  const y = Math.floor(total / 12);
  const mo = total - y * 12 + 1;
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}`;
}

/** `fromIso` oyidan boshlab ketma-ket `n` ta oy (shu oyning oʻzi ham kiradi). */
export function nextMonths(fromIso: string, n: number): string[] {
  const start = monthKey(fromIso);
  const count = Math.max(0, Math.floor(n));
  return Array.from({ length: count }, (_, i) => shiftMonth(start, i));
}

function emptyBuckets(months: string[]): Record<string, number> {
  const b: Record<string, number> = {};
  for (const m of months) b[m] = 0;
  for (const s of FORECAST_SPECIAL_BUCKETS) b[s] = 0;
  return b;
}

/**
 * Qolgan majburiyatlarni (remaining > 0) valyuta va reja muddati oyi boʻyicha savatlaydi.
 * - muddati yoʻq / notoʻgʻri → 'nodate';
 * - muddati birinchi oydan OLDIN → 'overdue';
 * - oraliqdagi oy → oʻsha oy;
 * - oxirgi oydan KEYIN → 'later' (ufqdan tashqarida — yoʻqolib ketmasligi uchun).
 * Har bir uchragan valyuta uchun barcha kalitlar 0 bilan initsializatsiya qilinadi.
 */
export function bucketForecast(stages: ForecastStage[], months: string[]): ForecastBuckets {
  const out: ForecastBuckets = {};
  const first = months[0];
  const monthSet = new Set(months);
  for (const s of stages) {
    const remaining = Number(s.remaining);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const currency = s.currency || "UZS";
    const bucket = (out[currency] ??= emptyBuckets(months));
    const mk = tryMonthKey(s.plannedDeadline);
    let key: string;
    if (!mk) key = "nodate";
    else if (first !== undefined && mk < first) key = "overdue";
    else if (monthSet.has(mk)) key = mk;
    else key = "later";
    bucket[key] = (bucket[key] ?? 0) + remaining;
  }
  return out;
}

/**
 * Tanlangan valyuta uchun grafik qatorlari: har bir oy uchun haqiqiy toʻlangan
 * (actual) va prognoz (forecast[currency][oy]). Boshqa valyutalar eʼtiborga olinmaydi.
 */
export function mergeActualAndForecast(
  actual: ActualPoint[],
  forecast: ForecastBuckets,
  months: string[],
  currency: string,
): CashflowRow[] {
  const paidBy = new Map<string, number>();
  for (const a of actual) {
    if (a.currency !== currency) continue;
    const amount = Number(a.amount);
    if (!Number.isFinite(amount)) continue;
    paidBy.set(a.month, (paidBy.get(a.month) ?? 0) + amount);
  }
  const fb = forecast[currency] ?? {};
  return months.map((month) => ({ month, paid: paidBy.get(month) ?? 0, forecast: fb[month] ?? 0 }));
}

/** Valyutalarni noyob va barqaror tartibda qaytaradi: UZS birinchi, qolganlari alifbo boʻyicha. */
export function orderCurrencies(list: Iterable<string>): string[] {
  const set = new Set<string>();
  for (const c of list) if (c) set.add(c);
  return [...set].sort((a, b) => (a === "UZS" ? -1 : b === "UZS" ? 1 : a.localeCompare(b)));
}
