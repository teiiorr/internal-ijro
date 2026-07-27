import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { listProjectTypes, listStageNameOptions } from "@/server/queries/stages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { Plus, Download, AlertTriangle, ChevronDown } from "lucide-react";
import { can } from "@/lib/permissions";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";

type Sort = "created" | "name" | "deadline" | "progress";
type StatusFilter = "all" | "not_started" | "in_progress" | "completed" | "on_hold" | "at_risk";

// Airy filter control: dashed border, no fill — same language as the file dropzone.
const FILTER_FIELD =
  "h-11 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none";

// Native <select> with the browser arrow removed and a custom chevron that keeps
// clear space from the border — fixes the arrow/text colliding with the edge.
function FilterSelect({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select name={name} defaultValue={defaultValue} className={`${FILTER_FIELD} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
    </div>
  );
}

// Status tone: green done, amber ongoing, red paused, muted not-started.
const STATUS_TONE: Record<DerivedStatus, StatusTone> = {
  completed: "green",
  in_progress: "amber",
  on_hold: "red",
  not_started: "muted",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const sort: Sort = ((get("sort") as Sort | undefined) ?? "created");
  const statusFilter: StatusFilter = ((get("status") as StatusFilter | undefined) ?? "all");
  const projectTypeId = get("typeId") || null;
  const payment = (get("payment") as "paid" | "unpaid" | undefined) ?? null;
  const overdue = get("overdue") === "1";
  const stage = get("stage") || null;

  const [rows, projectTypeOptions, stageOptions] = await Promise.all([
    listProjects({ projectTypeId, payment, overdue: overdue || null, stage }, locale),
    listProjectTypes(locale),
    listStageNameOptions(locale),
  ]);
  const canCreate = can(session.user.position, "projects.create");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Decorate every row with its derived status + at-risk flag
  const decorated = rows.map((p) => {
    const status = derivedStatus(p.progressPercentage, p.statusOverride);
    const due = p.deadline ? new Date(p.deadline) : null;
    const atRisk = !!due && due < today && status !== "completed" && status !== "on_hold";
    return { ...p, derived: status, atRisk };
  });

  // Filter
  const filtered = decorated.filter((p) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "at_risk") return p.atRisk;
    return p.derived === statusFilter;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "progress") return b.progressPercentage - a.progressPercentage;
    if (sort === "deadline") {
      const ax = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bx = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return ax - bx;
    }
    return 0; // "created" — keep API order
  });

  const counts = {
    all: decorated.length,
    not_started: decorated.filter((p) => p.derived === "not_started").length,
    in_progress: decorated.filter((p) => p.derived === "in_progress").length,
    completed: decorated.filter((p) => p.derived === "completed").length,
    on_hold: decorated.filter((p) => p.derived === "on_hold").length,
    at_risk: decorated.filter((p) => p.atRisk).length,
  };

  const extra = new URLSearchParams();
  if (projectTypeId) extra.set("typeId", projectTypeId);
  if (payment) extra.set("payment", payment);
  if (overdue) extra.set("overdue", "1");
  if (stage) extra.set("stage", stage);
  const extraQs = extra.toString() ? `&${extra.toString()}` : "";

  const FilterTab = ({ value, label, count }: { value: StatusFilter; label: string; count: number }) => (
    <Link
      href={`/projects?status=${value}&sort=${sort}${extraQs}`}
      replace
      className={
        "px-3 sm:px-4 py-2 rounded-[8px] text-[13px] sm:text-[14px] font-semibold transition-all flex items-center gap-2 shrink-0 " +
        (statusFilter === value
          ? "bg-[var(--surface)] shadow-[var(--shadow-1)] text-[var(--foreground)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]")
      }
    >
      <span>{label}</span>
      <span className="text-[11px] rounded-full px-1.5 py-0 tabular font-bold bg-[var(--surface-3)] text-[var(--muted)]">
        {count}
      </span>
    </Link>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("projects.pageTitle")}</h1>
        <div className="flex gap-2 shrink-0">
          <Button asChild variant="outline" size="default" className="hidden sm:inline-flex">
            <a href="/api/export/projects"><Download className="size-4" /> XLSX</a>
          </Button>
          {canCreate && (
            <Button asChild size="default">
              <Link href="/projects/new"><Plus className="size-4" /> <span className="hidden sm:inline">{t("projects.newTitle")}</span><span className="sm:hidden">{t("common.create")}</span></Link>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 bg-[var(--surface-3)] rounded-[10px] p-1 overflow-x-auto no-scrollbar">
          <FilterTab value="all"         label={t("common.all")} count={counts.all} />
          <FilterTab value="not_started" label={t("projects.derivedStatus.not_started")} count={counts.not_started} />
          <FilterTab value="in_progress" label={t("projects.derivedStatus.in_progress")} count={counts.in_progress} />
          <FilterTab value="completed"   label={t("projects.derivedStatus.completed")} count={counts.completed} />
          <FilterTab value="on_hold"     label={t("projects.derivedStatus.on_hold")} count={counts.on_hold} />
          <FilterTab value="at_risk"     label={t("projects.atRisk")} count={counts.at_risk} />
        </div>

        {/* even grid — dashed, airy controls (full-width on mobile so labels never clip) */}
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-3" action="/projects">
          <input type="hidden" name="status" value={statusFilter} />
          <FilterSelect name="typeId" defaultValue={projectTypeId ?? ""}>
            <option value="">{t("projects.filters.allTypes")}</option>
            {projectTypeOptions.map((pt) => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="stage" defaultValue={stage ?? ""}>
            <option value="">{t("projects.filters.allStages")}</option>
            {stageOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="payment" defaultValue={payment ?? ""}>
            <option value="">{t("projects.filters.payment")}</option>
            <option value="paid">{t("projects.filters.paid")}</option>
            <option value="unpaid">{t("projects.filters.unpaid")}</option>
          </FilterSelect>
          <FilterSelect name="sort" defaultValue={sort}>
            <option value="created">{t("projects.sort.created")}</option>
            <option value="name">{t("projects.sort.name")}</option>
            <option value="deadline">{t("projects.sort.deadline")}</option>
            <option value="progress">{t("projects.sort.progress")}</option>
          </FilterSelect>
          <label className={`${FILTER_FIELD} inline-flex items-center gap-2 cursor-pointer`}>
            <input type="checkbox" name="overdue" value="1" defaultChecked={overdue} className="accent-[var(--warning)]" />
            {t("projects.filters.overdue")}
          </label>
          <Button type="submit" variant="outline" className="h-11 w-full">
            {t("common.apply")}
          </Button>
        </form>
      </div>

      {/* Poster grid — big square covers */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-[var(--muted)]">{t("projects.empty")}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-1)] transition-shadow group-hover:shadow-[var(--shadow-2)]">
                {p.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.posterUrl} alt={p.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                    <span className="select-none text-5xl font-black text-[var(--subtle)]">{p.name.trim().charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
                  {p.progressPercentage}%
                </span>
                {p.atRisk && (
                  <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-[var(--danger)] text-white shadow-sm" title={t("projects.atRisk")}>
                    <AlertTriangle className="size-4" />
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/15">
                  <div className="h-full bg-[var(--success)]" style={{ width: `${p.progressPercentage}%` }} />
                </div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                <p className="line-clamp-2 min-h-[2.75em] text-sm font-semibold leading-snug">{p.name}</p>
                <StatusTag tone={STATUS_TONE[p.derived]}>{t(`projects.derivedStatus.${p.derived}` as `projects.derivedStatus.${DerivedStatus}`)}</StatusTag>
                <p className="truncate text-xs text-[var(--muted)]">{p.projectTypeName ?? t(`projects.type.${p.type}` as "projects.type.internal")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
