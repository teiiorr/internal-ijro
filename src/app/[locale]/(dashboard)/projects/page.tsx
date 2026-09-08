import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { listProjectTypes, listStageOptionsByType } from "@/server/queries/stages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { SmoothImage } from "@/components/ui/smooth-image";
import { ScrollMemory } from "@/components/scroll-memory";
import { Marquee } from "@/components/ui/marquee";
import { IconPlus as Plus, IconDownload as Download, IconAlertTriangle as AlertTriangle } from "@tabler/icons-react";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";
import { canEditProjects, canViewMoney } from "@/lib/permissions/project-editors";

type Sort = "created" | "name" | "deadline" | "progress";
type StatusFilter = "all" | "not_started" | "in_progress" | "completed" | "on_hold" | "at_risk";

// Status ranglari: yaşil — yakunlangan, sariq — jarayonda, qizil — töxtatilgan, xira — başlanmagan.
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
  const search = get("search")?.trim() || null;

  const [rows, projectTypeOptions, stagesByType] = await Promise.all([
    listProjects({ search, projectTypeId, payment, overdue: overdue || null, stage }, locale),
    listProjectTypes(locale),
    listStageOptionsByType(locale),
  ]);
  const canCreate = canEditProjects(session.user.email);
  const canExport = canViewMoney(session.user.email); // hisobotda summalar bör → faqat allowlist uçun
  // Excel eksporti hozir qöllangan filtrlarni aynan takrorlaydi.
  const exportParams = new URLSearchParams();
  if (search) exportParams.set("search", search);
  if (statusFilter !== "all") exportParams.set("status", statusFilter);
  if (projectTypeId) exportParams.set("typeId", projectTypeId);
  if (payment) exportParams.set("payment", payment);
  if (overdue) exportParams.set("overdue", "1");
  if (stage) exportParams.set("stage", stage);
  const exportHref = `/api/export/projects${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Har bir qatorni hisoblangan statusi + xavf ostidagi (at-risk) belgisi bilan böyitamiz
  const decorated = rows.map((p) => {
    const status = derivedStatus(p.progressPercentage, p.statusOverride);
    const due = p.deadline ? new Date(p.deadline) : null;
    const atRisk = !!due && due < today && status !== "completed" && status !== "on_hold";
    return { ...p, derived: status, atRisk };
  });

  // Filtr
  const filtered = decorated.filter((p) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "at_risk") return p.atRisk;
    return p.derived === statusFilter;
  });

  // Status ustuvorligi — har doim birinchi qöllanadi: jarayondagilar (Jarayonda) tepada,
  // yakunlanganlar (Yakunlangan) esa eng pastda, tanlangan saralaşdan qat'i nazar.
  const STATUS_PRIORITY: Record<DerivedStatus, number> = {
    in_progress: 0,
    not_started: 1,
    on_hold: 2,
    completed: 3,
  };

  // Saralaş: avval xavf ostidagi (qizil / muddati ötgan) loyihalar, keyin status ustuvorligi,
  // söngra har bir guruh içida tanlangan saralaş tartibi.
  filtered.sort((a, b) => {
    if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
    const byStatus = STATUS_PRIORITY[a.derived] - STATUS_PRIORITY[b.derived];
    if (byStatus !== 0) return byStatus;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "progress") return b.progressPercentage - a.progressPercentage;
    if (sort === "deadline") {
      const ax = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bx = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return ax - bx;
    }
    return 0; // "created" — API tartibini saqlab qolamiz
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
  if (search) extra.set("search", search);
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
    <div className="space-y-5 sm:space-y-6 stagger-children">
      {/* Loyihadan qaytganda röyxatning skroll holatini tiklaydi. */}
      <ScrollMemory />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("projects.pageTitle")}</h1>
        <div className="flex gap-2 shrink-0">
          {canExport && (
            <Button asChild variant="outline" size="default" className="hidden sm:inline-flex">
              <a href={exportHref}><Download className="size-4" /> Excel hisoboti</a>
            </Button>
          )}
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

        {/* Real vaqt filtrlari — "Qöllaş" tugmasi yöq. Bosqiç röyxati tur böyiça çeklangan. */}
        <ProjectsFilters types={projectTypeOptions} stagesByType={stagesByType} />
      </div>

      {/* Poster töri — katta kvadrat muqovalar */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-[var(--muted)]">{t("projects.empty")}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow-1)] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:shadow-[var(--shadow-2)]"
            >
              {/* Kursor ustiga kelganda poster özgarmaydi — faqat uning ortidagi/atrofidagi plitka binafşa rangga ötadi. */}
              <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                {p.posterUrl ? (
                  <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover" />
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
              {/* Futer — plitka ustida turadi, şuning uçun kursor kelib plitka binafşa rangga
                  ötganda matn on-primary rangiga özgaradi. Sarlavha markazda; tur çapda, status
                  belgisi öngda; kursor kelganda belgi punktir ramka bölib qolmay, töliq böyaladi. */}
              <div className="space-y-2 px-1.5 pb-1 pt-2.5">
                <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-semibold leading-snug transition-colors duration-300 group-hover:text-[var(--primary-foreground)]">{p.name}</p>
                <div className="flex items-center justify-between gap-2">
                  {/* Agar janr belgilangan bölsa öşani körsatamiz (masalan, eksklyuziv loyihalar); aks holda pipeline turini. Uzun nomlar suriladi. */}
                  <Marquee className="min-w-0 flex-1 text-xs text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--primary-foreground)] group-hover:opacity-80">
                    {isProjectGenre(p.genre)
                      ? t(`projects.genre.${p.genre}` as "projects.genre.film")
                      : (p.projectTypeName ?? t(`projects.type.${p.type}` as "projects.type.internal"))}
                  </Marquee>
                  <StatusTag
                    tone={STATUS_TONE[p.derived]}
                    className="shrink-0 transition-all duration-300 group-hover:border-transparent group-hover:bg-[var(--primary-foreground)] group-hover:text-[var(--primary)]"
                  >
                    {t(`projects.derivedStatus.${p.derived}` as `projects.derivedStatus.${DerivedStatus}`)}
                  </StatusTag>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
