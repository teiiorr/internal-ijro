import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { localizedTypeName } from "@/server/queries/stages";
import { getProjectsActiveCount } from "@/server/queries/dashboards";
import { tashkentToday } from "@/lib/reports/weekly-brief-core";

/**
 * Ministrlik uchun davriy hisobot — markaz davr ichida nima ishlab chiqarganining
 * jamlanmasi. Faqat MAVJUD jadvallar (projects / project_stages / project_types /
 * external_companies / stage_payments) oʻqiladi, yangi jadval yoʻq. Sanalar Toshkent
 * (Asia/Tashkent) kalendar kuni boʻyicha bucket qilinadi, davr ikkala chegarasi ham
 * kiradi. Pul summalari xom qaytadi va valyutalar aralashtirilmaydi — koʻrinish
 * huquqi (canSeeMoney) chaqiruvchida tekshiriladi (finance.ts bilan bir xil qoida).
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function isValidDay(s: string): boolean {
  if (!ISO_DAY.test(s)) return false;
  const ms = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s;
}

export type MinistryPeriod = {
  /** "YYYY-MM-DD" — Toshkent, davrga kiradi. */
  from: string;
  /** "YYYY-MM-DD" — Toshkent, davrga kiradi. */
  to: string;
  /** Davr toʻliq kalendar yil boʻlsa — oʻsha yil; aks holda null (ixtiyoriy oraliq). */
  year: number | null;
};

/** URL parametrlaridan davr: `from`+`to` (YYYY-MM-DD) YOKI `year` (YYYY); aks holda joriy yil. */
export function parseMinistryPeriod(
  get: (key: string) => string | null | undefined,
  now: Date = new Date(),
): MinistryPeriod {
  const fromRaw = get("from");
  const toRaw = get("to");
  if (typeof fromRaw === "string" && typeof toRaw === "string" && isValidDay(fromRaw) && isValidDay(toRaw)) {
    let from = fromRaw;
    let to = toRaw;
    if (from > to) [from, to] = [to, from];
    const fullYear = from.endsWith("-01-01") && to.endsWith("-12-31") && from.slice(0, 4) === to.slice(0, 4);
    return { from, to, year: fullYear ? Number(from.slice(0, 4)) : null };
  }
  const currentYear = Number(tashkentToday(now).slice(0, 4));
  let year = currentYear;
  const yearRaw = get("year");
  if (typeof yearRaw === "string" && YEAR_RE.test(yearRaw)) {
    const y = Number(yearRaw);
    if (y >= 2000 && y <= currentYear + 1) year = y;
  }
  return { from: `${year}-01-01`, to: `${year}-12-31`, year };
}

/** Davrni URL parametrlariga qaytaradi (Excel havolasi uchun) — yil boʻlsa `year`, aks holda `from`+`to`. */
export function ministryPeriodToParams(p: MinistryPeriod): URLSearchParams {
  const q = new URLSearchParams();
  if (p.year != null) q.set("year", String(p.year));
  else {
    q.set("from", p.from);
    q.set("to", p.to);
  }
  return q;
}

export type MinistryTypeRow = { name: string; count: number };
export type MinistryBudgetRow = { currency: string; planned: number; paid: number; remaining: number };
export type MinistryDiscipline = {
  /** Muddatli yakunlangan bosqichlar orasida muddatida topshirilganlar ulushi (butun foiz); muddatlisi yoʻq boʻlsa null. */
  onTimePercent: number | null;
  onTime: number;
  /** Davr ichida muddati oʻtib yakunlangan bosqichlar soni. */
  late: number;
  /** Rejadagi muddati bor, davr ichida yakunlangan bosqichlar. */
  withDeadline: number;
  /** Davr ichida yakunlangan barcha bosqichlar. */
  completedStages: number;
};

export type MinistryReport = {
  period: { from: string; to: string };
  produced: { total: number; byType: MinistryTypeRow[] };
  inProduction: number;
  budget: MinistryBudgetRow[];
  discipline: MinistryDiscipline;
  studiosEngaged: number;
};

type TypeSqlRow = {
  type_id: string | null;
  uz: string | null;
  cy: string | null;
  ru: string | null;
  ord: number | null;
  c: number;
};
type BudgetSqlRow = { currency: string; planned: string; paid: string };
type DisciplineSqlRow = { with_deadline: number; on_time: number; late: number; total_completed: number };
type CountSqlRow = { c: number };

/**
 * Davr jamlanmasi. `fromISO`/`toISO` — "YYYY-MM-DD" (Toshkent, ikkala chegara ham kiradi).
 * `locale` tur nomlarini mahalliylashtiradi (default — oʻzbek lotin, eksport uchun).
 */
export async function getMinistryReport(
  fromISO: string,
  toISO: string,
  locale: string = "uz-latn",
): Promise<MinistryReport> {
  const from = fromISO.slice(0, 10);
  const to = toISO.slice(0, 10);
  const tashkentDay = (col: string) => sql.raw(`(${col} AT TIME ZONE 'Asia/Tashkent')::date`);

  const producedP = db.execute(sql`
    SELECT
      pt.id AS type_id,
      pt.name_uz_latn AS uz,
      pt.name_uz_cyrl AS cy,
      pt.name_ru AS ru,
      pt.order_index AS ord,
      count(p.id)::int AS c
    FROM projects p
    LEFT JOIN project_types pt ON pt.id = p.project_type_id
    WHERE p.status = 'completed'
      AND p.completed_at IS NOT NULL
      AND ${tashkentDay("p.completed_at")} BETWEEN ${from}::date AND ${to}::date
    GROUP BY pt.id, pt.name_uz_latn, pt.name_uz_cyrl, pt.name_ru, pt.order_index
    ORDER BY pt.order_index ASC NULLS LAST, pt.name_uz_latn ASC
  `) as unknown as Promise<TypeSqlRow[]>;

  const budgetP = db.execute(sql`
    SELECT
      p.budget_currency AS currency,
      coalesce(sum(ps.planned_amount), 0)::text AS planned,
      coalesce(sum(pay.paid), 0)::text AS paid
    FROM projects p
    JOIN project_stages ps ON ps.project_id = p.id
    LEFT JOIN LATERAL (
      SELECT sum(sp.amount) FILTER (WHERE sp.status = 'paid' AND sp.currency = p.budget_currency) AS paid
      FROM stage_payments sp
      WHERE sp.stage_id = ps.id
    ) pay ON true
    WHERE p.status = 'completed'
      AND p.completed_at IS NOT NULL
      AND ${tashkentDay("p.completed_at")} BETWEEN ${from}::date AND ${to}::date
    GROUP BY p.budget_currency
  `) as unknown as Promise<BudgetSqlRow[]>;

  const disciplineP = db.execute(sql`
    SELECT
      count(*) FILTER (WHERE ps.planned_deadline IS NOT NULL)::int AS with_deadline,
      count(*) FILTER (WHERE ps.planned_deadline IS NOT NULL AND ${tashkentDay("ps.completed_at")} <= ps.planned_deadline)::int AS on_time,
      count(*) FILTER (WHERE ps.planned_deadline IS NOT NULL AND ${tashkentDay("ps.completed_at")} > ps.planned_deadline)::int AS late,
      count(*)::int AS total_completed
    FROM project_stages ps
    WHERE ps.status = 'completed'
      AND ps.completed_at IS NOT NULL
      AND ${tashkentDay("ps.completed_at")} BETWEEN ${from}::date AND ${to}::date
  `) as unknown as Promise<DisciplineSqlRow[]>;

  const studiosP = db.execute(sql`
    SELECT count(DISTINCT p.external_company_id)::int AS c
    FROM projects p
    WHERE p.status = 'completed'
      AND p.completed_at IS NOT NULL
      AND p.external_company_id IS NOT NULL
      AND ${tashkentDay("p.completed_at")} BETWEEN ${from}::date AND ${to}::date
  `) as unknown as Promise<CountSqlRow[]>;

  const [producedRows, budgetRows, disciplineRows, studioRows, inProduction] = await Promise.all([
    producedP,
    budgetP,
    disciplineP,
    studiosP,
    getProjectsActiveCount(),
  ]);

  let total = 0;
  const byType: MinistryTypeRow[] = [];
  for (const r of producedRows) {
    const c = num(r.c);
    total += c;
    if (r.type_id && c > 0) {
      byType.push({
        name: localizedTypeName({ nameUzLatn: r.uz ?? "", nameUzCyrl: r.cy ?? "", nameRu: r.ru ?? "" }, locale),
        count: c,
      });
    }
  }

  const budget: MinistryBudgetRow[] = [...budgetRows]
    .map((r) => {
      const planned = num(r.planned);
      const paid = num(r.paid);
      return { currency: r.currency, planned, paid, remaining: Math.max(0, planned - paid) };
    })
    .filter((r) => r.planned > 0 || r.paid > 0)
    .sort((a, b) => (a.currency === "UZS" ? -1 : b.currency === "UZS" ? 1 : a.currency.localeCompare(b.currency)));

  const d = disciplineRows[0] ?? { with_deadline: 0, on_time: 0, late: 0, total_completed: 0 };
  const withDeadline = num(d.with_deadline);
  const onTime = num(d.on_time);
  const discipline: MinistryDiscipline = {
    onTimePercent: withDeadline > 0 ? Math.round((onTime / withDeadline) * 100) : null,
    onTime,
    late: num(d.late),
    withDeadline,
    completedStages: num(d.total_completed),
  };

  return {
    period: { from, to },
    produced: { total, byType },
    inProduction,
    budget,
    discipline,
    studiosEngaged: num(studioRows[0]?.c),
  };
}
