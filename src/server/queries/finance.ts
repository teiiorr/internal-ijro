import "server-only";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { externalCompanies, projects, projectStages, stagePayments, users } from "@/lib/db/schema";
import { monthKey, nextMonths, shiftMonth } from "@/lib/finance/forecast";

// Moliya: toʻlovlar reestri, qarzdorlik, pul oqimi prognozi va anomaliyalar.
// Faqat MAVJUD jadvallar (stage_payments / project_stages / projects / external_companies)
// oʻqiladi — yangi jadval yoʻq. Summalar JS number sifatida qaytadi va HECH QACHON
// valyutalar orasida qoʻshilmaydi. Kirish huquqi (canSeeMoney) chaqiruvchida tekshiriladi.

export const REGISTER_PAGE_SIZE = 50;
export const REGISTER_EXPORT_LIMIT = 5000;
export const REGISTER_MAX_PAGE = 100_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
/** timestamptz → UTC ISO matn (postgres-js drizzle ostida vaqtlarni xom matn qilib qaytaradi). */
const ISO_FMT = `'YYYY-MM-DD"T"HH24:MI:SS"Z"'`;

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v == null ? null : num(v));
const toIso = (d: Date | string | null | undefined): string | null =>
  d == null ? null : d instanceof Date ? d.toISOString() : new Date(d).toISOString();

// ---------------------------------------------------------------------------
// Filtrlar
// ---------------------------------------------------------------------------

export type RegisterSort = "date" | "amount" | "project";
export type RegisterStatus = "paid" | "pending";

export type RegisterFilters = {
  status: RegisterStatus | null;
  studioId: string | null;
  projectId: string | null;
  typeId: string | null;
  /** 'YYYY-MM' — coalesce(paid_at, created_at) oy oraligʻi (Toshkent), ikkala chegara ham kiradi. */
  from: string | null;
  to: string | null;
  contract: string | null;
  sort: RegisterSort;
};

/** URL parametrlaridan xavfsiz filtr obyekti (notoʻgʻri uuid/oy qiymatlari tashlab yuboriladi). */
export function parseRegisterFilters(get: (key: string) => string | null | undefined): RegisterFilters {
  const str = (k: string) => {
    const v = get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const uuid = (k: string) => {
    const v = str(k);
    return v && UUID_RE.test(v) ? v : null;
  };
  const month = (k: string) => {
    const v = str(k);
    return v && MONTH_RE.test(v) ? v : null;
  };
  const statusRaw = str("status");
  const sortRaw = str("sort");
  let from = month("from");
  let to = month("to");
  if (from && to && from > to) [from, to] = [to, from];
  return {
    status: statusRaw === "paid" || statusRaw === "pending" ? statusRaw : null,
    studioId: uuid("studioId"),
    projectId: uuid("projectId"),
    typeId: uuid("typeId"),
    from,
    to,
    contract: str("contract")?.slice(0, 50) ?? null,
    sort: sortRaw === "amount" || sortRaw === "project" ? sortRaw : "date",
  };
}

/** Filtrlarni URL parametrlariga qaytaradi (faqat standart boʻlmaganlari) — Excel havolasi uchun. */
export function registerFiltersToParams(f: RegisterFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.studioId) p.set("studioId", f.studioId);
  if (f.projectId) p.set("projectId", f.projectId);
  if (f.typeId) p.set("typeId", f.typeId);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.contract) p.set("contract", f.contract);
  if (f.sort !== "date") p.set("sort", f.sort);
  return p;
}

const monthStartIso = (month: string) => `${month}-01T00:00:00+05:00`;
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const paymentDate = sql`coalesce(${stagePayments.paidAt}, ${stagePayments.createdAt})`;

function registerWhere(f: RegisterFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (f.status === "paid") conds.push(eq(stagePayments.status, "paid"));
  if (f.status === "pending") conds.push(sql`${stagePayments.status} <> 'paid'`);
  if (f.studioId) conds.push(eq(projects.externalCompanyId, f.studioId));
  if (f.projectId) conds.push(eq(projects.id, f.projectId));
  if (f.typeId) conds.push(eq(projects.projectTypeId, f.typeId));
  if (f.from) conds.push(sql`${paymentDate} >= ${monthStartIso(f.from)}::timestamptz`);
  if (f.to) conds.push(sql`${paymentDate} < ${monthStartIso(shiftMonth(f.to, 1))}::timestamptz`);
  if (f.contract) conds.push(ilike(projectStages.contractNumber, `%${escapeLike(f.contract)}%`));
  return conds.length ? and(...conds) : undefined;
}

function registerOrder(sort: RegisterSort): SQL[] {
  if (sort === "amount") return [desc(stagePayments.amount), desc(paymentDate), asc(stagePayments.id)];
  if (sort === "project") return [asc(projects.name), desc(paymentDate), asc(stagePayments.id)];
  return [desc(paymentDate), asc(stagePayments.id)];
}

// ---------------------------------------------------------------------------
// Reestr
// ---------------------------------------------------------------------------

export type RegisterRow = {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  /** ISO (UTC) */
  paidAt: string | null;
  createdAt: string;
  note: string | null;
  createdByName: string | null;
  stageId: string;
  stageName: string;
  contractNumber: string | null;
  plannedAmount: number | null;
  /** Loyiha byudjet valyutasi — reja summasi (planned_amount) shu valyutada. */
  projectCurrency: string;
  stageStatus: string;
  projectId: string;
  projectName: string;
  studioName: string | null;
};

export type CurrencyTotal = { currency: string; paid: number; pending: number };

async function selectRegisterRows(f: RegisterFilters, limit: number, offset: number): Promise<RegisterRow[]> {
  const rows = await db
    .select({
      paymentId: stagePayments.id,
      amount: stagePayments.amount,
      currency: stagePayments.currency,
      status: stagePayments.status,
      paidAt: stagePayments.paidAt,
      createdAt: stagePayments.createdAt,
      note: stagePayments.note,
      createdByName: users.fullName,
      stageId: projectStages.id,
      stageName: projectStages.name,
      contractNumber: projectStages.contractNumber,
      plannedAmount: projectStages.plannedAmount,
      projectCurrency: projects.budgetCurrency,
      stageStatus: projectStages.status,
      projectId: projects.id,
      projectName: projects.name,
      studioName: externalCompanies.name,
    })
    .from(stagePayments)
    .innerJoin(projectStages, eq(projectStages.id, stagePayments.stageId))
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .leftJoin(users, eq(users.id, stagePayments.createdByUserId))
    .where(registerWhere(f))
    .orderBy(...registerOrder(f.sort))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    paymentId: r.paymentId,
    amount: num(r.amount),
    currency: r.currency,
    status: r.status,
    paidAt: toIso(r.paidAt),
    createdAt: toIso(r.createdAt) ?? new Date(0).toISOString(),
    note: r.note,
    createdByName: r.createdByName ?? null,
    stageId: r.stageId,
    stageName: r.stageName,
    contractNumber: r.contractNumber,
    plannedAmount: numOrNull(r.plannedAmount),
    projectCurrency: r.projectCurrency,
    stageStatus: r.stageStatus,
    projectId: r.projectId,
    projectName: r.projectName,
    studioName: r.studioName ?? null,
  }));
}

/** Xuddi shu filtr boʻyicha valyuta kesimidagi jami (toʻlangan / kutilayotgan) va umumiy son. */
async function selectRegisterTotals(f: RegisterFilters): Promise<{ total: number; totals: CurrencyTotal[] }> {
  const rows = await db
    .select({
      currency: stagePayments.currency,
      n: sql<number>`count(*)::int`,
      paid: sql<string>`coalesce(sum(${stagePayments.amount}) filter (where ${stagePayments.status} = 'paid'), 0)`,
      pending: sql<string>`coalesce(sum(${stagePayments.amount}) filter (where ${stagePayments.status} <> 'paid'), 0)`,
    })
    .from(stagePayments)
    .innerJoin(projectStages, eq(projectStages.id, stagePayments.stageId))
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(registerWhere(f))
    .groupBy(stagePayments.currency);

  const totals = rows
    .map((r) => ({ currency: r.currency, paid: num(r.paid), pending: num(r.pending) }))
    .sort((a, b) => (a.currency === "UZS" ? -1 : b.currency === "UZS" ? 1 : a.currency.localeCompare(b.currency)));
  return { total: rows.reduce((s, r) => s + num(r.n), 0), totals };
}

export async function listPaymentsRegister(
  f: RegisterFilters,
  page = 1,
): Promise<{ rows: RegisterRow[]; total: number; totals: CurrencyTotal[] }> {
  // Juda katta sahifa raqami OFFSET'ni bigint chegarasidan oshirmasin.
  const safePage = Number.isFinite(page) && page >= 1 ? Math.min(Math.floor(page), REGISTER_MAX_PAGE) : 1;
  const [rows, agg] = await Promise.all([
    selectRegisterRows(f, REGISTER_PAGE_SIZE, (safePage - 1) * REGISTER_PAGE_SIZE),
    selectRegisterTotals(f),
  ]);
  return { rows, total: agg.total, totals: agg.totals };
}

/** Excel eksporti uchun: xuddi shu filtrlar, 5000 qatorgacha. */
export async function listPaymentsRegisterForExport(
  f: RegisterFilters,
): Promise<{ rows: RegisterRow[]; total: number; totals: CurrencyTotal[] }> {
  const [rows, agg] = await Promise.all([selectRegisterRows(f, REGISTER_EXPORT_LIMIT, 0), selectRegisterTotals(f)]);
  return { rows, total: agg.total, totals: agg.totals };
}

export type FilterOption = { id: string; name: string };
export type ProjectFilterOption = FilterOption & { studioId: string | null };

/** Reestr filtrlari uchun studiyalar va (bosqichi bor) loyihalar roʻyxati. */
export async function getRegisterFilterOptions(): Promise<{ studios: FilterOption[]; projects: ProjectFilterOption[] }> {
  const [studios, projectRows] = await Promise.all([
    db
      .selectDistinct({ id: externalCompanies.id, name: externalCompanies.name })
      .from(externalCompanies)
      .innerJoin(projects, eq(projects.externalCompanyId, externalCompanies.id))
      .orderBy(asc(externalCompanies.name)),
    db
      .select({ id: projects.id, name: projects.name, studioId: projects.externalCompanyId })
      .from(projects)
      .where(sql`exists (select 1 from project_stages ps where ps.project_id = ${projects.id})`)
      .orderBy(asc(projects.name)),
  ]);
  return { studios, projects: projectRows.map((p) => ({ id: p.id, name: p.name, studioId: p.studioId ?? null })) };
}

// ---------------------------------------------------------------------------
// Toʻlanishi kerak (qarzdorlik)
// ---------------------------------------------------------------------------

export type PayableRow = {
  stageId: string;
  stageName: string;
  projectId: string;
  projectName: string;
  studioName: string | null;
  /** Loyiha byudjet valyutasi — toʻlangan/qoldiq shu valyutada hisoblanadi. */
  currency: string;
  planned: number;
  paid: number;
  remaining: number;
  completedAt: string | null;
  daysSinceCompleted: number | null;
  submittedAt: string | null;
  daysSinceSubmitted: number | null;
};

type PayableSqlRow = {
  stage_id: string;
  stage_name: string;
  stage_status: string;
  project_id: string;
  project_name: string;
  studio_name: string | null;
  currency: string;
  planned: string | null;
  paid: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  days_completed: number | string | null;
  days_submitted: number | string | null;
};

/**
 * Har bir bosqich uchun: paid = Σ toʻlangan (faqat loyiha valyutasida), remaining = planned − paid.
 * accepted = qabul qilingan (completed) va qoldigʻi bor bosqichlar, eng eskisi birinchi.
 * upcoming = koʻrib chiqishga topshirilgan (active + submitted) va qoldigʻi bor bosqichlar.
 */
export async function listPayables(): Promise<{ accepted: PayableRow[]; upcoming: PayableRow[] }> {
  const rows = (await db.execute(sql`
    SELECT
      ps.id AS stage_id,
      ps.name AS stage_name,
      ps.status AS stage_status,
      p.id AS project_id,
      p.name AS project_name,
      ec.name AS studio_name,
      p.budget_currency AS currency,
      ps.planned_amount::text AS planned,
      coalesce(pay.paid, 0)::text AS paid,
      to_char(ps.completed_at AT TIME ZONE 'UTC', ${sql.raw(ISO_FMT)}) AS completed_at,
      to_char(ps.submitted_at AT TIME ZONE 'UTC', ${sql.raw(ISO_FMT)}) AS submitted_at,
      ((now() AT TIME ZONE 'Asia/Tashkent')::date - (ps.completed_at AT TIME ZONE 'Asia/Tashkent')::date) AS days_completed,
      ((now() AT TIME ZONE 'Asia/Tashkent')::date - (ps.submitted_at AT TIME ZONE 'Asia/Tashkent')::date) AS days_submitted
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    LEFT JOIN external_companies ec ON ec.id = p.external_company_id
    LEFT JOIN LATERAL (
      SELECT sum(sp.amount) FILTER (WHERE sp.status = 'paid' AND sp.currency = p.budget_currency) AS paid
      FROM stage_payments sp
      WHERE sp.stage_id = ps.id
    ) pay ON true
    WHERE ps.planned_amount IS NOT NULL
      AND ps.planned_amount - coalesce(pay.paid, 0) > 0
      AND (ps.status = 'completed' OR (ps.status = 'active' AND ps.review_status = 'submitted'))
    ORDER BY ps.completed_at ASC NULLS LAST, ps.submitted_at ASC NULLS LAST, p.name ASC
  `)) as unknown as PayableSqlRow[];

  const accepted: PayableRow[] = [];
  const upcoming: PayableRow[] = [];
  for (const r of rows) {
    const planned = num(r.planned);
    const paid = num(r.paid);
    const row: PayableRow = {
      stageId: r.stage_id,
      stageName: r.stage_name,
      projectId: r.project_id,
      projectName: r.project_name,
      studioName: r.studio_name ?? null,
      currency: r.currency,
      planned,
      paid,
      remaining: planned - paid,
      completedAt: r.completed_at ?? null,
      daysSinceCompleted: r.days_completed == null ? null : Math.max(0, num(r.days_completed)),
      submittedAt: r.submitted_at ?? null,
      daysSinceSubmitted: r.days_submitted == null ? null : Math.max(0, num(r.days_submitted)),
    };
    (r.stage_status === "completed" ? accepted : upcoming).push(row);
  }
  return { accepted, upcoming };
}

// ---------------------------------------------------------------------------
// Pul oqimi (prognoz)
// ---------------------------------------------------------------------------

export type CashflowActual = { month: string; currency: string; amount: number };
export type CashflowForecastStage = {
  remaining: number;
  currency: string;
  plannedDeadline: string | null;
  studioName: string | null;
};
export type CashflowStudioRow = { studioName: string | null; currency: string; paid12m: number; remaining: number };

/**
 * 12 oylik oyna: oxirgi 6 oy (joriy oydan oldingi) + joriy oy bilan keyingi 5 oy.
 * actual — toʻlangan toʻlovlar (Toshkent oyi + valyuta boʻyicha); forecastStages —
 * yakunlanmagan, qoldigʻi bor bosqichlar (bekor qilingan loyihalar hisobga olinmaydi).
 */
export async function getCashflow(): Promise<{
  months: string[];
  currentMonth: string;
  actual: CashflowActual[];
  forecastStages: CashflowForecastStage[];
  byStudio: CashflowStudioRow[];
}> {
  const currentMonth = monthKey(new Date().toISOString());
  const months = nextMonths(shiftMonth(currentMonth, -6), 12);
  const startIso = monthStartIso(months[0]);
  const endIso = monthStartIso(shiftMonth(months[months.length - 1], 1));

  const [actualRows, stageRows, paidRows] = await Promise.all([
    db.execute(sql`
      SELECT
        to_char(sp.paid_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') AS month,
        sp.currency AS currency,
        sum(sp.amount)::text AS amount
      FROM stage_payments sp
      WHERE sp.status = 'paid'
        AND sp.paid_at >= ${startIso}::timestamptz
        AND sp.paid_at < ${endIso}::timestamptz
      GROUP BY 1, 2
      ORDER BY 1, 2
    `) as unknown as Promise<{ month: string; currency: string; amount: string }[]>,
    db.execute(sql`
      SELECT
        ps.planned_deadline::text AS planned_deadline,
        p.budget_currency AS currency,
        ec.id AS studio_id,
        ec.name AS studio_name,
        (ps.planned_amount - coalesce(pay.paid, 0))::text AS remaining
      FROM project_stages ps
      JOIN projects p ON p.id = ps.project_id
      LEFT JOIN external_companies ec ON ec.id = p.external_company_id
      LEFT JOIN LATERAL (
        SELECT sum(sp.amount) FILTER (WHERE sp.status = 'paid' AND sp.currency = p.budget_currency) AS paid
        FROM stage_payments sp
        WHERE sp.stage_id = ps.id
      ) pay ON true
      WHERE ps.status <> 'completed'
        AND p.status <> 'cancelled'
        AND ps.planned_amount IS NOT NULL
        AND ps.planned_amount - coalesce(pay.paid, 0) > 0
    `) as unknown as Promise<
      { planned_deadline: string | null; currency: string; studio_id: string | null; studio_name: string | null; remaining: string }[]
    >,
    db.execute(sql`
      SELECT
        ec.id AS studio_id,
        ec.name AS studio_name,
        sp.currency AS currency,
        sum(sp.amount)::text AS paid
      FROM stage_payments sp
      JOIN project_stages ps ON ps.id = sp.stage_id
      JOIN projects p ON p.id = ps.project_id
      LEFT JOIN external_companies ec ON ec.id = p.external_company_id
      WHERE sp.status = 'paid' AND sp.paid_at >= now() - interval '12 months'
      GROUP BY ec.id, ec.name, sp.currency
    `) as unknown as Promise<{ studio_id: string | null; studio_name: string | null; currency: string; paid: string }[]>,
  ]);

  const actual = [...actualRows].map((r) => ({ month: r.month, currency: r.currency, amount: num(r.amount) }));
  const forecastStages = [...stageRows].map((r) => ({
    remaining: num(r.remaining),
    currency: r.currency,
    plannedDeadline: r.planned_deadline ?? null,
    studioName: r.studio_name ?? null,
  }));

  // Studiya × valyuta: 12 oyda toʻlangan + qolgan majburiyatlar.
  const byKey = new Map<string, CashflowStudioRow>();
  const keyOf = (studioId: string | null, currency: string) => `${studioId ?? "-"}|${currency}`;
  for (const r of paidRows) {
    byKey.set(keyOf(r.studio_id, r.currency), {
      studioName: r.studio_name ?? null,
      currency: r.currency,
      paid12m: num(r.paid),
      remaining: 0,
    });
  }
  for (const r of stageRows) {
    const k = keyOf(r.studio_id, r.currency);
    const cur = byKey.get(k) ?? { studioName: r.studio_name ?? null, currency: r.currency, paid12m: 0, remaining: 0 };
    cur.remaining += num(r.remaining);
    byKey.set(k, cur);
  }
  const byStudio = [...byKey.values()].sort(
    (a, b) => b.remaining - a.remaining || b.paid12m - a.paid12m || (a.studioName ?? "").localeCompare(b.studioName ?? ""),
  );

  return { months, currentMonth, actual, forecastStages, byStudio };
}

// ---------------------------------------------------------------------------
// Anomaliyalar
// ---------------------------------------------------------------------------

export type OverpaidRow = {
  stageId: string;
  stageName: string;
  projectId: string;
  projectName: string;
  studioName: string | null;
  currency: string;
  planned: number;
  paid: number;
  over: number;
};
export type BudgetMismatchRow = {
  projectId: string;
  projectName: string;
  budget: number;
  stagesTotal: number;
  currency: string;
};
export type MissingAmountsRow = { projectId: string; projectName: string; missingCount: number; totalStages: number };

const ANOMALY_LIMIT = 200;

export async function getFinanceAnomalies(): Promise<{
  overpaid: OverpaidRow[];
  budgetMismatch: BudgetMismatchRow[];
  missingAmounts: MissingAmountsRow[];
}> {
  const [overpaidRows, mismatchRows, missingRows] = await Promise.all([
    db.execute(sql`
      SELECT
        ps.id AS stage_id,
        ps.name AS stage_name,
        p.id AS project_id,
        p.name AS project_name,
        ec.name AS studio_name,
        p.budget_currency AS currency,
        ps.planned_amount::text AS planned,
        pay.paid::text AS paid
      FROM project_stages ps
      JOIN projects p ON p.id = ps.project_id
      LEFT JOIN external_companies ec ON ec.id = p.external_company_id
      JOIN LATERAL (
        SELECT sum(sp.amount) FILTER (WHERE sp.status = 'paid' AND sp.currency = p.budget_currency) AS paid
        FROM stage_payments sp
        WHERE sp.stage_id = ps.id
      ) pay ON true
      WHERE ps.planned_amount IS NOT NULL AND pay.paid > ps.planned_amount
      ORDER BY (pay.paid - ps.planned_amount) DESC
      LIMIT ${ANOMALY_LIMIT}
    `) as unknown as Promise<
      {
        stage_id: string;
        stage_name: string;
        project_id: string;
        project_name: string;
        studio_name: string | null;
        currency: string;
        planned: string;
        paid: string;
      }[]
    >,
    // sum(NULL…) = NULL → hamma bosqichi summasiz loyiha bu yerga tushmaydi (u "missingAmounts"da).
    db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.budget::text AS budget,
        p.budget_currency AS currency,
        sum(ps.planned_amount)::text AS stages_total
      FROM projects p
      JOIN project_stages ps ON ps.project_id = p.id
      WHERE p.project_type_id IS NOT NULL
        AND p.budget IS NOT NULL
        AND p.status <> 'cancelled'
      GROUP BY p.id
      HAVING sum(ps.planned_amount) <> p.budget
      ORDER BY abs(sum(ps.planned_amount) - p.budget) DESC
      LIMIT ${ANOMALY_LIMIT}
    `) as unknown as Promise<
      { project_id: string; project_name: string; budget: string; currency: string; stages_total: string }[]
    >,
    db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        (count(*) FILTER (WHERE ps.planned_amount IS NULL))::int AS missing_count,
        count(*)::int AS total_stages
      FROM projects p
      JOIN project_stages ps ON ps.project_id = p.id
      WHERE p.project_type_id IS NOT NULL
        AND p.status NOT IN ('completed', 'cancelled')
      GROUP BY p.id
      HAVING count(*) FILTER (WHERE ps.planned_amount IS NULL) > 0
      ORDER BY missing_count DESC, p.name ASC
      LIMIT ${ANOMALY_LIMIT}
    `) as unknown as Promise<{ project_id: string; project_name: string; missing_count: number; total_stages: number }[]>,
  ]);

  return {
    overpaid: [...overpaidRows].map((r) => {
      const planned = num(r.planned);
      const paid = num(r.paid);
      return {
        stageId: r.stage_id,
        stageName: r.stage_name,
        projectId: r.project_id,
        projectName: r.project_name,
        studioName: r.studio_name ?? null,
        currency: r.currency,
        planned,
        paid,
        over: paid - planned,
      };
    }),
    budgetMismatch: [...mismatchRows].map((r) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      budget: num(r.budget),
      stagesTotal: num(r.stages_total),
      currency: r.currency,
    })),
    missingAmounts: [...missingRows].map((r) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      missingCount: num(r.missing_count),
      totalStages: num(r.total_stages),
    })),
  };
}
