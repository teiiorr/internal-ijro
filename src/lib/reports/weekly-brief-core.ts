/**
 * Haftalik rahbar brifingi uchun SOF yordamchilar (DB / server-only / "@/" importlari yoʻq):
 * server soʻrovlari, worker (scripts/jobs/weekly-snapshot.ts), UI va vitest bemalol ishlatadi.
 *
 * Sanalar "YYYY-MM-DD" satrlari — Toshkent (UTC+05:00, DST yoʻq) kalendar kuni.
 * Arifmetika UTC yarim tunida bajariladi, shuning uchun soat mintaqasi xatolari boʻlmaydi.
 * Hafta dushanbadan boshlanadi (ISO 8601).
 */

const DAY_MS = 86_400_000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// ---------- koʻrsatkichlar ----------

/** Haftalik snapshot koʻrsatkichlari (weekly_snapshots.metrics jsonb). Hammasi son. */
export type WeeklyMetrics = {
  /** Holat (snapshot paytida): yakunlanmagan, toʻxtatilmagan loyihalar. */
  activeProjects: number;
  overdueStages: number;
  dueSoonStages: number;
  overdueTasks: number;
  reviewQueue: number;
  pendingRequests: number;
  /** Hodisalar (hafta oynasi ichida). */
  stagesCompleted: number;
  tasksCreated: number;
  tasksCompleted: number;
  paidUzs: number;
  newProjects: number;
};

export const METRIC_KEYS = [
  "activeProjects",
  "overdueStages",
  "dueSoonStages",
  "overdueTasks",
  "reviewQueue",
  "pendingRequests",
  "stagesCompleted",
  "tasksCreated",
  "tasksCompleted",
  "paidUzs",
  "newProjects",
] as const satisfies readonly (keyof WeeklyMetrics)[];

export const EMPTY_METRICS: WeeklyMetrics = {
  activeProjects: 0,
  overdueStages: 0,
  dueSoonStages: 0,
  overdueTasks: 0,
  reviewQueue: 0,
  pendingRequests: 0,
  stagesCompleted: 0,
  tasksCreated: 0,
  tasksCompleted: 0,
  paidUzs: 0,
  newProjects: 0,
};

/** jsonb'dan kelgan qiymatni xavfsiz WeeklyMetrics'ga keltiradi (yoʻq/notoʻgʻri maydon → 0). */
export function normalizeMetrics(raw: unknown): WeeklyMetrics {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = null;
    }
  }
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: WeeklyMetrics = { ...EMPTY_METRICS };
  for (const k of METRIC_KEYS) {
    const n = Number(src[k]);
    out[k] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

/**
 * Snapshot "taxminiy" belgisi (metrics jsonb ichidagi qoʻshimcha `estimated: true` kaliti).
 * Hafta yakunidan keyingi dushanbadan BOSHQA kunda yaratilgan snapshot (masalan, eski haftaga
 * xulosa yozilganda) holat koʻrsatkichlarini oʻsha haftaning oxiridagi emas, yaratilgan
 * kundagi holat boʻyicha muzlatadi — u aniq deb koʻrsatilmasligi, delta va sparkline'ga
 * qoʻshilmasligi kerak. normalizeMetrics bu kalitni eʼtiborsiz qoldiradi.
 */
export function isEstimatedMetrics(raw: unknown): boolean {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return false;
    }
  }
  return !!value && typeof value === "object" && (value as Record<string, unknown>).estimated === true;
}

/** KPI qatoridagi 7 ta plitka va har birining "yaxshi yoʻnalishi". */
export type GoodDirection = "up" | "down" | "neutral";
export type KpiKey =
  | "activeProjects"
  | "overdueStages"
  | "dueSoonStages"
  | "overdueTasks"
  | "reviewQueue"
  | "pendingRequests"
  | "paidUzs";

export const KPI_TILES: readonly { key: KpiKey; good: GoodDirection; pointInTime: boolean; money?: boolean }[] = [
  { key: "activeProjects", good: "neutral", pointInTime: true },
  { key: "overdueStages", good: "down", pointInTime: true },
  { key: "dueSoonStages", good: "down", pointInTime: true },
  { key: "overdueTasks", good: "down", pointInTime: true },
  { key: "reviewQueue", good: "down", pointInTime: true },
  { key: "pendingRequests", good: "down", pointInTime: true },
  { key: "paidUzs", good: "up", pointInTime: false, money: true },
];

export type MetricDelta = {
  diff: number;
  direction: "up" | "down" | "flat";
  tone: "good" | "bad" | "neutral";
};

/** Oldingi haftaga nisbatan farq. Oldingi qiymat boʻlmasa — null (delta koʻrsatilmaydi). */
export function metricDelta(cur: number, prev: number | null | undefined, good: GoodDirection): MetricDelta | null {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(cur)) return null;
  const diff = cur - prev;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const tone =
    direction === "flat" || good === "neutral" ? "neutral" : direction === good ? "good" : "bad";
  return { diff, direction, tone };
}

/**
 * Inline-SVG sparkline uchun yoʻl. Kamida 2 ta nuqta kerak, aks holda null.
 * Barcha qiymatlar teng boʻlsa — chiziq oʻrtada gorizontal.
 */
export function sparklinePath(
  values: number[],
  width: number,
  height: number,
  pad = 2
): { line: string; area: string; last: { x: number; y: number } } | null {
  const vals = values.filter((v) => Number.isFinite(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const r = (n: number) => Math.round(n * 100) / 100;
  const pts = vals.map((v, i) => ({
    x: r(pad + (i / (vals.length - 1)) * innerW),
    y: r(span === 0 ? pad + innerH / 2 : pad + innerH - ((v - min) / span) * innerH),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const first = pts[0];
  const last = pts[pts.length - 1];
  const bottom = r(height - pad);
  const area = `${line} L${last.x} ${bottom} L${first.x} ${bottom} Z`;
  return { line, area, last };
}

/** Butun son, minglar boʻshliq bilan: 12 500 000 (locale'dan mustaqil — SSR/CSR bir xil). */
export function formatInt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const s = String(Math.round(Math.abs(n)));
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Katta summani ixchamlaydi: 1 250 000 000 → { n: "1,3", unit: "billion" }.
 * Milliondan kichik — toʻliq son, unit null. Kasr ajratuvchi — vergul (uz/ru).
 */
export function compactAmount(n: number): { n: string; unit: "billion" | "million" | null } {
  const abs = Math.abs(n);
  const one = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");
  if (abs >= 1e9) return { n: one(n / 1e9), unit: "billion" };
  if (abs >= 1e6) return { n: one(n / 1e6), unit: "million" };
  return { n: formatInt(n), unit: null };
}

// ---------- ruxsatlar ----------

/** Brifingni koʻra oladigan lavozimlar (egasi alohida — isOwner). */
export const WEEKLY_BRIEF_VIEWER_POSITIONS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"] as const;
/** Hafta xulosasini yoza oladigan lavozimlar (egasi alohida — isOwner). */
export const WEEKLY_SUMMARY_EDITOR_POSITIONS = ["direktor", "orinbosar"] as const;
export const SUMMARY_MAX_LENGTH = 10_000;

export function canViewWeeklyBrief(position: string | null | undefined, owner: boolean): boolean {
  if (owner) return true;
  return !!position && (WEEKLY_BRIEF_VIEWER_POSITIONS as readonly string[]).includes(position);
}

export function canEditWeeklySummary(position: string | null | undefined, owner: boolean): boolean {
  if (owner) return true;
  return !!position && (WEEKLY_SUMMARY_EDITOR_POSITIONS as readonly string[]).includes(position);
}

// ---------- sanalar / haftalar ----------

const parseDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Haqiqiy kalendar sanasimi ("2026-02-30" → false). */
export function isIsoDay(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DAY.test(s)) return false;
  const ms = parseDay(s);
  return Number.isFinite(ms) && fmtDay(ms) === s;
}

/** Berilgan lahzadagi Toshkent sanasi. */
export function tashkentToday(now: Date = new Date()): string {
  return fmtDay(now.getTime() + TASHKENT_OFFSET_MS);
}

/** Toshkent boʻyicha ISO hafta kuni: 1 = dushanba … 7 = yakshanba. */
export function tashkentIsoWeekday(now: Date = new Date()): number {
  const d = new Date(now.getTime() + TASHKENT_OFFSET_MS).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(iso: string, n: number): string {
  return fmtDay(parseDay(iso) + n * DAY_MS);
}

export function addWeeks(iso: string, n: number): string {
  return addDays(iso, n * 7);
}

/** Shu Toshkent sanasi tushgan haftaning dushanbasi. */
export function weekStartOf(iso: string): string {
  const ms = parseDay(iso);
  const dow = new Date(ms).getUTCDay(); // 0 = yakshanba
  const back = (dow + 6) % 7;
  return fmtDay(ms - back * DAY_MS);
}

/** Oxirgi TOʻLIQ tugagan hafta dushanbasi (joriy haftadan bitta oldingi). */
export function lastCompletedWeekStart(now: Date = new Date()): string {
  return addWeeks(weekStartOf(tashkentToday(now)), -1);
}

/** Sanani dushanbaga tekislaydi; boʻsh/notoʻgʻri qiymat yoki hali tugamagan hafta → oxirgi tugagan hafta. */
export function parseWeekParam(raw: unknown, now: Date = new Date()): string {
  const latest = lastCompletedWeekStart(now);
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!isIsoDay(v)) return latest;
  const ws = weekStartOf(v);
  if (ws > latest) return latest;
  if (ws < "2000-01-03") return latest;
  return ws;
}

/** `latest`dan boshlab orqaga `count` ta dushanba (yangisi birinchi). */
export function recentWeekStarts(latest: string, count = 12): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => addWeeks(latest, -i));
}

/** ISO hafta raqami: "2026-W40". */
export function isoWeekLabel(weekStart: string): string {
  const thursday = parseDay(addDays(weekStartOf(weekStart), 3));
  const year = new Date(thursday).getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = 1 + Math.floor((thursday - jan1) / DAY_MS / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** "28.09–04.10" — dushanbadan yakshanbagacha. */
export function weekRangeLabel(weekStart: string): string {
  const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
  return `${dm(weekStart)} - ${dm(addDays(weekStart, 6))}`;
}

/** Hafta tanlagichidagi yorliq: "2026-W40 (28.09–04.10)". */
export function weekOptionLabel(weekStart: string): string {
  return weekRangeLabel(weekStart);
}

/**
 * Lahza yoki sana → Toshkent kalendar kuni ("YYYY-MM-DD").
 * Sof sana satri ("2026-10-05") oʻzgarishsiz qaytadi; notoʻgʻri qiymat → null.
 */
export function tashkentDayOf(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  if (typeof d === "string" && isIsoDay(d)) return d;
  const ms = (d instanceof Date ? d : new Date(d)).getTime();
  if (!Number.isFinite(ms)) return null;
  return fmtDay(ms + TASHKENT_OFFSET_MS);
}

/** Ixcham sana: "05.10" (Toshkent). */
export function shortDay(d: Date | string | null | undefined): string {
  const iso = tashkentDayOf(d);
  return iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : "—";
}

/** Toʻliq raqamli sana: "05.10.2026" (Toshkent). */
export function numericDay(d: Date | string | null | undefined): string {
  const iso = tashkentDayOf(d);
  return iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—";
}

/** Hafta oynasi [dushanba 00:00, keyingi dushanba 00:00) Toshkent vaqtida — ISO UTC lahzalar. */
export function weekWindow(weekStart: string): { startIso: string; endIso: string; endDay: string } {
  const endDay = addDays(weekStart, 7);
  return {
    startIso: new Date(parseDay(weekStart) - TASHKENT_OFFSET_MS).toISOString(),
    endIso: new Date(parseDay(endDay) - TASHKENT_OFFSET_MS).toISOString(),
    endDay,
  };
}
