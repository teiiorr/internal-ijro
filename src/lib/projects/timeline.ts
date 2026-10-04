/**
 * Loyihalar xronologiyasi (portfel Gant diagrammasi) uchun SOF hisob-kitoblar.
 * Hech qanday import yoʻq — server ham, klient ham, vitest ham bemalol ishlatadi.
 *
 * Barcha sanalar "YYYY-MM-DD" satrlari (Toshkent kalendar kuni). Arifmetika UTC
 * yarim tunida bajariladi, shuning uchun soat mintaqasi / DST xatolari boʻlmaydi.
 */

// ---------- turlar ----------

export type TLStage = {
  id: string;
  name: string;
  orderIndex: number;
  status: "locked" | "active" | "completed" | (string & {});
  reviewStatus: string | null;
  plannedStart: string | null;
  plannedDeadline: string | null;
  startedAt: string | null;
  completedAt: string | null;
  responsibleName: string | null;
};

export type TLProject = {
  id: string;
  name: string;
  posterUrl: string | null;
  startDate: string | null;
  deadline: string | null;
  progress: number;
  studioId: string | null;
  studioName: string | null;
  typeId: string | null;
  typeName: string | null;
  curators: { id: string; fullName: string; avatarUrl: string | null }[];
  stages: TLStage[];
};

export type Bar = {
  stageId: string | null;
  name: string;
  /** Rejadagi boshlanish (kiritilgan yoki zanjir orqali hisoblangan). */
  start: string;
  /** Rejadagi tugash — planned_deadline (yoʻq boʻlsa start + 14 kun, `estimated`). */
  end: string;
  status: string;
  late: boolean;
  bkrmTurn: boolean;
  actualStart: string | null;
  actualEnd: string | null;
  responsibleName: string | null;
  legacy: boolean;
  /** planned_deadline kiritilmagan — tugash sanasi taxminiy (UI punktir bilan chizadi). */
  estimated: boolean;
};

export type Zoom = "month" | "quarter" | "year";
export type TimelineGroup = "none" | "studio" | "curator" | "type";

export const ZOOMS: readonly Zoom[] = ["month", "quarter", "year"];
export const GROUPS: readonly TimelineGroup[] = ["none", "studio", "curator", "type"];
export const DEFAULT_ZOOM: Zoom = "quarter";

/** URL qiymati → zoom (notoʻgʻri boʻlsa standart "quarter"). */
export function parseZoom(v: string | null | undefined): Zoom {
  return (ZOOMS as readonly string[]).includes(v ?? "") ? (v as Zoom) : DEFAULT_ZOOM;
}

/** URL qiymati → guruhlash (notoʻgʻri boʻlsa "none"). */
export function parseGroup(v: string | null | undefined): TimelineGroup {
  return (GROUPS as readonly string[]).includes(v ?? "") ? (v as TimelineGroup) : "none";
}

export type Tick = { iso: string; label: string; major: boolean };

export type Scale = {
  /** Shkala boshi (davr chegarasi, shu kun ichida). */
  start: string;
  /** Shkala oxiri (keyingi davrning birinchi kuni — eksklyuziv). */
  end: string;
  dayPx: number;
  ticks: Tick[];
  totalDays: number;
  widthPx: number;
};

// ---------- sana yordamchilari ----------

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** "YYYY-MM-DD..." → UTC yarim tun ms; notoʻgʻri boʻlsa NaN. */
function toMs(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Sanani "YYYY-MM-DD" ga keltiradi (vaqt qismini tashlaydi); notoʻgʻri boʻlsa null. */
export function isoDay(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = ISO_RE.exec(v);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function addDays(iso: string, n: number): string {
  return fromMs(toMs(iso) + n * DAY_MS);
}

/** b − a kunlarda (b keyin boʻlsa musbat). */
export function diffDays(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY_MS);
}

/** Toshkent (+05:00) boʻyicha bugungi kalendar sanasi. */
export function tashkentToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}

const minIso = (a: string, b: string) => (a <= b ? a : b);
const maxIso = (a: string, b: string) => (a >= b ? a : b);

const DEFAULT_SPAN_DAYS = 14;

// ---------- bosqich chiziqlari ----------

/**
 * Loyiha bosqichlaridan Gant chiziqlarini quradi.
 *
 * Boshlanish zanjiri: planned_start → oldingi bosqich tugashi (planned_deadline) →
 * loyiha start_date → started_at → (tugash − 14 kun). planned_deadline yoʻq bosqich
 * start + 14 kun oladi va `estimated` deb belgilanadi (kechikkan hisoblanmaydi).
 * Bosqichsiz eski loyihalar start_date → deadline oraligʻida bitta `legacy` chiziq beradi.
 */
export function deriveStageBars(p: TLProject, todayIso: string): Bar[] {
  const stages = [...p.stages].sort((a, b) => a.orderIndex - b.orderIndex);

  if (stages.length === 0) {
    const s0 = isoDay(p.startDate);
    const e0 = isoDay(p.deadline);
    if (!s0 && !e0) return [];
    const start = s0 ?? addDays(e0!, -DEFAULT_SPAN_DAYS);
    const rawEnd = e0 ?? addDays(start, DEFAULT_SPAN_DAYS);
    const end = maxIso(rawEnd, start);
    const done = p.progress >= 100;
    const notStarted = !done && p.progress <= 0 && start > todayIso;
    const status = done ? "completed" : notStarted ? "locked" : "active";
    return [
      {
        stageId: null,
        name: p.name,
        start,
        end,
        status,
        late: status === "active" && !!e0 && end < todayIso,
        bkrmTurn: false,
        actualStart: null,
        actualEnd: null,
        responsibleName: null,
        legacy: true,
        estimated: !e0,
      },
    ];
  }

  const bars: Bar[] = [];
  let prevEnd: string | null = null;
  for (const s of stages) {
    const deadline = isoDay(s.plannedDeadline);
    const startedAt = isoDay(s.startedAt);
    const completedAt = isoDay(s.completedAt);

    let start =
      isoDay(s.plannedStart) ??
      prevEnd ??
      isoDay(p.startDate) ??
      startedAt ??
      (deadline ? addDays(deadline, -DEFAULT_SPAN_DAYS) : null) ??
      todayIso;

    let end: string;
    if (deadline) {
      end = deadline;
      // Notoʻgʻri maʼlumot (boshlanish muddatdan keyin) — teskari chiziq chizmaymiz.
      if (start > end) start = end;
    } else {
      end = addDays(start, DEFAULT_SPAN_DAYS);
    }

    const active = s.status === "active";
    bars.push({
      stageId: s.id,
      name: s.name,
      start,
      end,
      status: s.status,
      late: active && !!deadline && end < todayIso,
      bkrmTurn: active && s.reviewStatus === "submitted",
      actualStart: startedAt,
      actualEnd: completedAt ?? (active ? todayIso : null),
      responsibleName: s.responsibleName,
      legacy: false,
      estimated: !deadline,
    });
    prevEnd = end;
  }
  return bars;
}

/**
 * Loyiha shartnoma muddatidan (projects.deadline) oshadimi: oxirgi chiziq tugashi
 * muddatdan keyin. Kechikayotgan faol bosqich qolgan zanjirni bugungacha suradi,
 * shuning uchun kechikish kunlari ham prognozga qoʻshiladi. Hammasi yakunlangan
 * loyiha uchun — false.
 */
export function willMissContract(p: Pick<TLProject, "deadline">, bars: Bar[]): boolean {
  const deadline = isoDay(p.deadline);
  if (!deadline || bars.length === 0) return false;
  if (bars.every((b) => b.status === "completed")) return false;
  let lastEnd = bars[0].end;
  let slip = 0;
  for (const b of bars) {
    lastEnd = maxIso(lastEnd, b.end);
    if (b.late && b.actualEnd) slip = Math.max(slip, diffDays(b.end, b.actualEnd));
  }
  return addDays(lastEnd, slip) > deadline;
}

// ---------- shkala ----------

export const DAY_PX: Record<Zoom, number> = { month: 6, quarter: 2.5, year: 0.9 };

const NUMERIC_MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function ymd(iso: string) {
  const ms = toMs(iso);
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}

function monthIso(y: number, m: number): string {
  return fromMs(Date.UTC(y, m, 1));
}

/**
 * [minIso, maxIso] oraligʻini zoom davri chegarasigacha kengaytiradi va sarlavha
 * belgilarini qaytaradi. month → har oy; quarter → har oy (chorak boshi `major`);
 * year → har chorak (yil boshi `major`). `monthNames` — 12 ta qisqa oy nomi.
 */
export function computeScale(
  minIsoIn: string,
  maxIsoIn: string,
  zoom: Zoom,
  monthNames: readonly string[] = NUMERIC_MONTHS,
): Scale {
  const names = monthNames.length === 12 ? monthNames : NUMERIC_MONTHS;
  let lo = isoDay(minIsoIn) ?? isoDay(maxIsoIn) ?? "1970-01-01";
  let hi = isoDay(maxIsoIn) ?? lo;
  if (lo > hi) [lo, hi] = [hi, lo];

  const a = ymd(lo);
  const b = ymd(hi);
  const step = zoom === "month" ? 1 : zoom === "quarter" ? 3 : 12;
  const startM = Math.floor(a.m / step) * step;
  const endM = Math.floor(b.m / step) * step + step; // keyingi davr boshi (eksklyuziv)
  const start = monthIso(a.y, startM);
  const end = monthIso(b.y, endM);

  const tickStep = zoom === "year" ? 3 : 1;
  const ticks: Tick[] = [];
  let y = a.y;
  let m = startM;
  let first = true;
  for (;;) {
    const iso = monthIso(y, m);
    if (iso >= end) break;
    const major = zoom === "month" ? true : zoom === "quarter" ? m % 3 === 0 : m === 0;
    const withYear = zoom === "month" || first || m === 0;
    ticks.push({ iso, label: withYear ? `${names[m]} ${y}` : names[m], major });
    first = false;
    m += tickStep;
    if (m >= 12) {
      y += Math.floor(m / 12);
      m %= 12;
    }
  }

  const dayPx = DAY_PX[zoom];
  const totalDays = diffDays(start, end);
  return { start, end, dayPx, ticks, totalDays, widthPx: Math.ceil(totalDays * dayPx) };
}

/** Kun boshining shkala boshidan pikseldagi masofasi. */
export function offsetPx(iso: string, scale: Pick<Scale, "start" | "dayPx">): number {
  return diffDays(scale.start, iso) * scale.dayPx;
}

/** [start, end] (ikkala kun ham kiradi) oraligʻining kengligi pikselda. */
export function widthPx(start: string, end: string, scale: Pick<Scale, "dayPx">): number {
  return Math.max(0, diffDays(start, end) + 1) * scale.dayPx;
}

// ---------- parallel faol bosqichlar ----------

/**
 * Bir vaqtning oʻzida faol boʻlgan bosqichlarning eng koʻp soni (sweep line).
 * Faol bosqich kamida bugungacha davom etadi, shuning uchun interval tugashi
 * max(end, actualEnd) olinadi. Intervallar ikkala chekkasi bilan kiradi.
 */
export function countActiveOverlaps(barsByProject: Bar[][]): number {
  const events: { t: number; d: 1 | -1 }[] = [];
  for (const bars of barsByProject) {
    for (const b of bars) {
      if (b.status !== "active") continue;
      const effEnd = b.actualEnd ? maxIso(b.end, b.actualEnd) : b.end;
      const s = toMs(minIso(b.start, effEnd));
      const e = toMs(effEnd) + DAY_MS; // eksklyuziv
      if (Number.isNaN(s) || Number.isNaN(e)) continue;
      events.push({ t: s, d: 1 }, { t: e, d: -1 });
    }
  }
  // Bir xil vaqtda avval chiqish, keyin kirish — tutashgan intervallar ustma-ust emas.
  events.sort((x, y) => x.t - y.t || x.d - y.d);
  let cur = 0;
  let best = 0;
  for (const ev of events) {
    cur += ev.d;
    if (cur > best) best = cur;
  }
  return best;
}

// ---------- UI yordamchilari ----------

/** Shkala chegaralari uchun barcha muhim sanalar: chiziqlar, muddatlar, bugun. */
export function timelineExtent(
  items: { bars: Bar[]; deadline: string | null }[],
  todayIso: string,
): { min: string; max: string } {
  let min = todayIso;
  let max = todayIso;
  for (const it of items) {
    for (const b of it.bars) {
      min = minIso(min, b.start);
      max = maxIso(max, b.end);
      if (b.actualStart) min = minIso(min, b.actualStart);
      if (b.actualEnd) max = maxIso(max, b.actualEnd);
    }
    const d = isoDay(it.deadline);
    if (d) {
      min = minIso(min, d);
      max = maxIso(max, d);
    }
  }
  return { min, max };
}

/** "dd.mm" (yil joriy yildan farq qilsa "dd.mm.yyyy"). */
export function shortDate(iso: string, todayIso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y === todayIso.slice(0, 4) ? `${d}.${m}` : `${d}.${m}.${y}`;
}
