import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  IconAlertTriangle as AlertTriangle,
  IconChartBar as ChartBar,
  IconClockDollar as ClockDollar,
  IconDownload as Download,
  IconListDetails as ListDetails,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";
import { requireUser, type SessionUser } from "@/lib/session";
import { canEditMoney, canSeeMoney } from "@/lib/permissions/money";
import { bucketForecast } from "@/lib/finance/forecast";
import { listProjectTypes } from "@/server/queries/stages";
import {
  REGISTER_MAX_PAGE,
  REGISTER_PAGE_SIZE,
  getCashflow,
  getFinanceAnomalies,
  getRegisterFilterOptions,
  listPayables,
  listPaymentsRegister,
  parseRegisterFilters,
  registerFiltersToParams,
  type RegisterFilters,
} from "@/server/queries/finance";
import { RegisterTable } from "@/components/staff/payments-register/register-table";
import { PayablesList } from "@/components/staff/payments-register/payables-list";
import { CashflowChart } from "@/components/staff/payments-register/cashflow-chart";
import { AnomaliesPanel } from "@/components/staff/payments-register/anomalies-panel";

const TABS = ["register", "payables", "forecast", "anomalies"] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { icon: typeof ListDetails; key: string }> = {
  register: { icon: ListDetails, key: "tabRegister" },
  payables: { icon: ClockDollar, key: "tabPayables" },
  forecast: { icon: ChartBar, key: "tabForecast" },
  anomalies: { icon: AlertTriangle, key: "tabAnomalies" },
};

function isTab(v: string | undefined): v is Tab {
  return !!v && (TABS as readonly string[]).includes(v);
}

/**
 * Toʻlovlar reestri, qarzdorlik, pul oqimi prognozi va anomaliyalar.
 * Kirish: loyiha sahifalarida pulni koʻradiganlar (canSeeMoney); qolganlar /projects ga qaytariladi.
 * Har bir tab faqat oʻz maʼlumotini yuklaydi.
 */
export default async function PaymentsRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Layout ham kontragentni qaytaradi, lekin layout va sahifa parallel render qilinadi —
  // pul maʼlumotlari uchun shu yerda ham tekshiramiz (familiya allowlist'i domenni tekshirmaydi).
  if (user.position === "kontragent") redirect("/contractor/dashboard");
  if (!(await canSeeMoney(user))) redirect("/projects");

  const [t, sp] = await Promise.all([getTranslations("staffX.paymentsRegister"), searchParams]);
  const get = (k: string): string | undefined => {
    const v = sp[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };
  const rawTab = get("tab");
  const tab: Tab = isTab(rawTab) ? rawTab : "register";
  const filters = parseRegisterFilters(get);
  const page = Math.min(REGISTER_MAX_PAGE, Math.max(1, Math.floor(Number(get("page")) || 1)));

  const exportQs = registerFiltersToParams(filters).toString();
  const exportHref = `/api/export/payments${exportQs ? `?${exportQs}` : ""}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton fallbackHref="/projects" />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
            <p className="break-words text-sm text-[var(--muted)]">{t("subtitle")}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-auto">
          {/* API marshruti — locale prefiksisiz, oddiy <a> */}
          <a href={exportHref}>
            <Download className="size-4" />
            {t("export")}
          </a>
        </Button>
      </div>

      <nav
        aria-label={t("title")}
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1"
      >
        {TABS.map((key) => {
          const { icon: Icon, key: labelKey } = TAB_META[key];
          const active = key === tab;
          return (
            <Link
              key={key}
              href={key === "register" ? "/projects/payments" : `/projects/payments?tab=${key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition-all sm:px-4 sm:text-[14px]",
                active
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-1)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Faqat tab boʻyicha kalitlanadi: filtr oʻzgarganda filtr paneli qayta oʻrnatilmaydi (fokus saqlanadi). */}
      <Suspense key={tab} fallback={<TabSkeleton />}>
        {tab === "register" && <RegisterSection filters={filters} page={page} user={user} />}
        {tab === "payables" && <PayablesSection />}
        {tab === "forecast" && <ForecastSection />}
        {tab === "anomalies" && <AnomaliesSection />}
      </Suspense>
    </div>
  );
}

async function RegisterSection({ filters, page, user }: { filters: RegisterFilters; page: number; user: SessionUser }) {
  const locale = await getLocale();
  const [first, options, types, canEdit] = await Promise.all([
    listPaymentsRegister(filters, page),
    getRegisterFilterOptions(),
    listProjectTypes(locale),
    canEditMoney(user),
  ]);
  // URL'dagi sahifa raqami mavjud sahifalardan katta boʻlsa — oxirgi sahifani koʻrsatamiz.
  const pages = Math.max(1, Math.ceil(first.total / REGISTER_PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const data = currentPage === page ? first : await listPaymentsRegister(filters, currentPage);

  return (
    <RegisterTable
      rows={data.rows}
      total={data.total}
      totals={data.totals}
      page={currentPage}
      pageSize={REGISTER_PAGE_SIZE}
      canEdit={canEdit}
      studios={options.studios}
      projects={options.projects}
      types={types.map(({ id, name }) => ({ id, name }))}
    />
  );
}

async function PayablesSection() {
  const { accepted, upcoming } = await listPayables();
  return <PayablesList accepted={accepted} upcoming={upcoming} />;
}

async function ForecastSection() {
  const cf = await getCashflow();
  // Prognoz joriy oydan boshlanadi: undan oldingi reja muddatlari 'overdue' savatiga tushadi.
  const forecastMonths = cf.months.filter((m) => m >= cf.currentMonth);
  const buckets = bucketForecast(cf.forecastStages, forecastMonths);
  return (
    <CashflowChart
      months={cf.months}
      currentMonth={cf.currentMonth}
      actual={cf.actual}
      buckets={buckets}
      byStudio={cf.byStudio}
    />
  );
}

async function AnomaliesSection() {
  const a = await getFinanceAnomalies();
  return <AnomaliesPanel overpaid={a.overpaid} budgetMismatch={a.budgetMismatch} missingAmounts={a.missingAmounts} />;
}

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-11 w-full rounded-lg skeleton-shimmer" />
      <div className="h-24 w-full rounded-2xl skeleton-shimmer" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 w-full rounded-xl skeleton-shimmer" />
      ))}
    </div>
  );
}
