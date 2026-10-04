/**
 * Muddat surilishi tahlili uchun SOF hisob-kitoblar (DB / server-only importlari yoʻq):
 * server soʻrovlari, eksport marshruti, UI va vitest bemalol ishlatadi.
 *
 * Sanalar "YYYY-MM-DD" satrlari (Toshkent kalendar kuni). Arifmetika UTC yarim tunida
 * bajariladi — soat mintaqasi / DST xatolari boʻlmaydi.
 */

const DAY_MS = 86_400_000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** Hisobot va eksportni koʻra oladigan lavozimlar (egasi alohida — isOwner). */
export const SLIPPAGE_VIEWER_POSITIONS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"] as const;

/** Studiya kesimida mediana/P80 koʻrsatish uchun eng kichik namuna hajmi. */
export const BENCHMARK_MIN_SAMPLES = 3;

/** Meʼyor "haqiqatdan past" deb belgilanadigan chegara: mediana > meʼyor × 1.25. */
export const UNREALISTIC_NORM_FACTOR = 1.25;

export type SlipTone = "green" | "amber" | "red" | "muted";

export type DeadlineChangeLite = {
  stageId: string;
  oldDeadline: string | null;
  newDeadline: string | null;
  deltaDays: number | null;
  source: string;
  createdAt: string | Date;
};

export type StageLite = { id: string; orderIndex: number; plannedDeadline: string | null };

export type ProjectSlip = {
  baselineEnd: string | null;
  currentEnd: string | null;
  /** currentEnd − baselineEnd (kun); sanalardan biri yoʻq boʻlsa null. */
  slipDays: number | null;
  /** Haqiqiy koʻchirishlar soni (isReschedule). */
  reschedules: number;
  /** Shulardan studiya soʻrovi bilan boʻlganlari. */
  studioReschedules: number;
  /** studioReschedules / reschedules; koʻchirish boʻlmasa null. */
  studioShare: number | null;
  /** Koʻchirishlardagi delta_days yigʻindisi (studiya boʻyicha oʻrtacha uchun). */
  rescheduleDelta: number;
};

export type BenchmarkSample = {
  templateItemId: string;
  stageName: string;
  typeName: string;
  defaultDays: number | null;
  days: number;
  /** Saralash uchun: tur tartibi va shablon elementi tartibi. */
  typeOrder?: number;
  itemOrder?: number;
};

export type BenchmarkRow = {
  templateItemId: string;
  stageName: string;
  typeName: string;
  defaultDays: number | null;
  median: number | null;
  p80: number | null;
  n: number;
};

// ---------- ruxsat va filtrlar ----------

/** Hisobot / eksport ruxsati: 4 ta rahbar lavozimi yoki platforma egasi (isOwner natijasi). */
export function canViewSlippage(position: string | null | undefined, owner: boolean): boolean {
  if (owner) return true;
  return !!position && (SLIPPAGE_VIEWER_POSITIONS as readonly string[]).includes(position);
}

export type SlippageFilters = { typeId?: string; studioId?: string; curatorId?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTER_KEYS = ["typeId", "studioId", "curatorId"] as const;

/** URL parametrlaridan filtrlar; faqat toʻgʻri UUID qabul qilinadi (aks holda eʼtiborsiz). */
export function parseSlippageFilters(get: (k: string) => string | null | undefined): SlippageFilters {
  const out: SlippageFilters = {};
  for (const k of FILTER_KEYS) {
    const v = get(k);
    if (typeof v === "string" && UUID_RE.test(v)) out[k] = v.toLowerCase();
  }
  return out;
}

export function slippageFiltersToParams(f: SlippageFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k]) p.set(k, f[k]!);
  return p;
}

// ---------- sana yordamchilari ----------

function dayMs(iso: string): number {
  const s = iso.slice(0, 10);
  return Date.parse(`${s}T00:00:00Z`);
}

function isIsoDay(v: string | null | undefined): v is string {
  return typeof v === "string" && ISO_DAY.test(v) && !Number.isNaN(dayMs(v));
}

/** "YYYY-MM-DD..." → "YYYY-MM-DD"; boʻsh / notoʻgʻri qiymat → null. */
export function normalizeIsoDay(v: string | null | undefined): string | null {
  return isIsoDay(v) ? v.slice(0, 10) : null;
}

/** b − a, kunlarda (b keyinroq boʻlsa musbat). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayMs(b) - dayMs(a)) / DAY_MS);
}

/** Yangi − eski muddat (kun). Ikkalasidan biri yoʻq boʻlsa null. */
export function deltaDays(oldIso: string | null, newIso: string | null): number | null {
  const o = normalizeIsoDay(oldIso);
  const n = normalizeIsoDay(newIso);
  if (!o || !n) return null;
  return daysBetween(o, n);
}

/** Vaqt belgisini Toshkent kalendar kuniga ("YYYY-MM-DD") aylantiradi. */
export function tashkentDay(d: Date | string): string {
  return new Date(new Date(d).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Bosqich davomiyligi: boshlangan va yakunlangan Toshkent kunlari orasidagi farq (manfiy emas). */
export function durationDays(startedAt: Date | string, completedAt: Date | string): number {
  return Math.max(0, daysBetween(tashkentDay(startedAt), tashkentDay(completedAt)));
}

/** "YYYY-MM-DD" → "dd.mm.yyyy"; yoʻq boʻlsa "—". */
export function fmtDmy(iso: string | null | undefined): string {
  const s = normalizeIsoDay(iso ?? null);
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

// ---------- statistika ----------

/** Chiziqli interpolyatsiyali persentil (Excel PERCENTILE.INC bilan bir xil). p — 0..100. */
export function percentile(xs: number[], p: number): number | null {
  const vals = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (vals.length === 0) return null;
  const q = Math.min(100, Math.max(0, p)) / 100;
  const rank = q * (vals.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return vals[lo];
  return vals[lo] + (vals[hi] - vals[lo]) * (rank - lo);
}

export function median(xs: number[]): number | null {
  return percentile(xs, 50);
}

/** Ulush (0..1) → butun foiz; nomaʼlum boʻlsa null. */
export function sharePercent(share: number | null): number | null {
  return share == null ? null : Math.round(share * 100);
}

/** Bitta kasr xonasigacha yaxlitlash (UI va eksport uchun). */
export function round1(x: number | null): number | null {
  return x == null ? null : Math.round(x * 10) / 10;
}

// ---------- surilish ----------

function ts(v: string | Date): number {
  return new Date(v).getTime();
}

/**
 * Loyihaning dastlabki (bazaviy) tugash sanasi, oxirgi bosqich oʻzgarishlaridan:
 * xronologik birinchi boʻsh boʻlmagan old_deadline; boʻlmasa birinchi new_deadline;
 * boʻlmasa currentEnd.
 */
export function baselineEnd(
  changesForLastStage: { oldDeadline: string | null; newDeadline: string | null; createdAt: string | Date }[],
  currentEnd: string | null
): string | null {
  const ordered = [...changesForLastStage].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
  const firstOld = ordered.find((c) => normalizeIsoDay(c.oldDeadline));
  if (firstOld) return normalizeIsoDay(firstOld.oldDeadline);
  const firstNew = ordered.find((c) => normalizeIsoDay(c.newDeadline));
  if (firstNew) return normalizeIsoDay(firstNew.newDeadline);
  return normalizeIsoDay(currentEnd);
}

/**
 * Haqiqiy "koʻchirish": tarixiy (backfill) yozuv emas va oldin muddat boʻlgan.
 * Birinchi marta muddat qoʻyish (— → sana) koʻchirish hisoblanmaydi.
 */
export function isReschedule(c: Pick<DeadlineChangeLite, "source" | "oldDeadline">): boolean {
  return c.source !== "backfill" && normalizeIsoDay(c.oldDeadline) !== null;
}

/**
 * Bitta loyiha uchun surilish koʻrsatkichlari.
 * currentEnd — bosqichlar planned_deadline'ining eng kechi. Bazaviy sana oxirgi bosqich
 * (order_index boʻyicha) oʻzgarishlaridan olinadi; oʻzgarish boʻlmasa — oxirgi bosqichning
 * joriy muddati (u ham boʻlmasa currentEnd). Shunda oraliq bosqich oxirgisidan oshib
 * ketgani ham surilish sifatida koʻrinadi.
 */
export function projectSlip(stages: StageLite[], changes: DeadlineChangeLite[]): ProjectSlip {
  let currentEnd: string | null = null;
  let last: StageLite | null = null;
  for (const s of stages) {
    const d = normalizeIsoDay(s.plannedDeadline);
    if (d && (!currentEnd || d > currentEnd)) currentEnd = d;
    if (!last || s.orderIndex > last.orderIndex) last = s;
  }
  const lastId = last?.id ?? null;
  const lastChanges = lastId ? changes.filter((c) => c.stageId === lastId) : [];
  const fallback = normalizeIsoDay(last?.plannedDeadline ?? null) ?? currentEnd;
  const base = baselineEnd(lastChanges, fallback);
  const slipDays = base && currentEnd ? daysBetween(base, currentEnd) : null;

  let reschedules = 0;
  let studioReschedules = 0;
  let rescheduleDelta = 0;
  for (const c of changes) {
    if (!isReschedule(c)) continue;
    reschedules++;
    if (c.source === "studio_request") studioReschedules++;
    const d = c.deltaDays ?? deltaDays(c.oldDeadline, c.newDeadline);
    if (d != null) rescheduleDelta += d;
  }
  return {
    baselineEnd: base,
    currentEnd,
    slipDays,
    reschedules,
    studioReschedules,
    studioShare: reschedules > 0 ? studioReschedules / reschedules : null,
    rescheduleDelta,
  };
}

/** Surilish chipining rangi: ≤0 yashil, 1–14 sariq, >14 qizil; nomaʼlum — kulrang. */
export function slipTone(days: number | null): SlipTone {
  if (days == null) return "muted";
  if (days <= 0) return "green";
  if (days <= 14) return "amber";
  return "red";
}

/** Studiya boʻyicha: bitta bosqichga toʻgʻri keladigan oʻrtacha surilish (kun). */
export function avgSlipPerStage(totalDelta: number, stageCount: number): number | null {
  return stageCount > 0 ? round1(totalDelta / stageCount) : null;
}

// ---------- rejalashtirish aniqligi ----------

/** Mediana meʼyordan 25% dan ortiq oshsa — meʼyor haqiqatdan past. */
export function isUnrealisticNorm(medianDays: number | null, normDays: number | null): boolean {
  if (medianDays == null || normDays == null || normDays <= 0) return false;
  return medianDays > normDays * UNREALISTIC_NORM_FACTOR;
}

/**
 * Yakunlangan bosqich namunalarini shablon elementi boʻyicha guruhlaydi, mediana va P80 ni
 * hisoblaydi; namunasi minN dan kam qatorlar yashiriladi.
 */
export function buildBenchmarks(samples: BenchmarkSample[], minN = BENCHMARK_MIN_SAMPLES): BenchmarkRow[] {
  type Acc = {
    row: Omit<BenchmarkRow, "median" | "p80" | "n">;
    types: string[];
    days: number[];
    typeOrder: number;
    itemOrder: number;
  };
  const groups = new Map<string, Acc>();
  for (const s of samples) {
    if (!Number.isFinite(s.days)) continue;
    let g = groups.get(s.templateItemId);
    if (!g) {
      g = {
        row: { templateItemId: s.templateItemId, stageName: s.stageName, typeName: "", defaultDays: s.defaultDays },
        types: [],
        days: [],
        typeOrder: s.typeOrder ?? 0,
        itemOrder: s.itemOrder ?? 0,
      };
      groups.set(s.templateItemId, g);
    }
    g.days.push(s.days);
    if (s.typeName && !g.types.includes(s.typeName)) g.types.push(s.typeName);
    if (s.typeOrder != null && s.typeOrder < g.typeOrder) g.typeOrder = s.typeOrder;
  }
  return [...groups.values()]
    .filter((g) => g.days.length >= minN)
    .sort((a, b) => a.typeOrder - b.typeOrder || a.itemOrder - b.itemOrder || a.row.stageName.localeCompare(b.row.stageName))
    .map((g) => ({
      ...g.row,
      typeName: g.types.join(", "),
      median: round1(median(g.days)),
      p80: round1(percentile(g.days, 80)),
      n: g.days.length,
    }));
}
