import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { listProjectTypes, listStageOptionsByType } from "@/server/queries/stages";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui-biib/Button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented } from "@/components/ui-biib/Segmented";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { SmoothImage } from "@/components/ui/smooth-image";
import { ScrollMemory } from "@/components/scroll-memory";
import { Marquee } from "@/components/ui/marquee";
import { IconPlus as Plus, IconDownload as Download, IconAlertTriangle as AlertTriangle, IconTimeline as Timeline, IconLayoutGrid } from "@tabler/icons-react";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";
import { canEditProjects, canViewMoney } from "@/lib/permissions/project-editors";

type Sort = "created" | "name" | "deadline" | "progress";
type StatusFilter = "all" | "not_started" | "in_progress" | "completed" | "on_hold" | "at_risk";

// Holat ranglari BIIB tonlari bilan (manager donut bilan bir xil): koʻk — jarayonda,
// yashil — yakunlangan, sariq — toʻxtatilgan, neytral — boshlanmagan.
const STATUS_TONE: Record<DerivedStatus, StatusTone> = {
  completed: "success",
  in_progress: "warning",
  on_hold: "warning",
  not_started: "neutral",
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
  // Xronologiya (Gant) — joriy qidiruv/tur filtrlari bilan ochiladi.
  const tl = new URLSearchParams();
  if (search) tl.set("search", search);
  if (projectTypeId) tl.set("typeId", projectTypeId);
  const tlQs = tl.toString() ? `?${tl.toString()}` : "";
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

  // Holat — yagona segmented koʻlam oʻlchovi, sanoqlar oddiy matn (plashka emas).
  const statusDefs: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: t("common.all"), count: counts.all },
    { value: "not_started", label: t("projects.derivedStatus.not_started"), count: counts.not_started },
    { value: "in_progress", label: t("projects.derivedStatus.in_progress"), count: counts.in_progress },
    { value: "completed", label: t("projects.derivedStatus.completed"), count: counts.completed },
    { value: "on_hold", label: t("projects.derivedStatus.on_hold"), count: counts.on_hold },
    { value: "at_risk", label: t("projects.atRisk"), count: counts.at_risk },
  ];
  const statusItems = statusDefs.map((d) => ({
    href: `/projects?status=${d.value}&sort=${sort}${extraQs}`,
    active: statusFilter === d.value,
    label: (
      <span className="inline-flex items-center gap-1.5">
        {d.label}
        <span className="t-micro tabular-nums text-[var(--ink-3)]">{d.count}</span>
      </span>
    ),
  }));

  return (
    <div>
      {/* Loyihadan qaytganda röyxatning skroll holatini tiklaydi. */}
      <ScrollMemory />
      <PageHeader
        title={t("projects.pageTitle")}
        actions={
          <>
            {canExport && (
              <Button asChild variant="glass" size="40" icon={Download} className="max-sm:hidden">
                <a href={exportHref}>Excel</a>
              </Button>
            )}
            {canCreate && (
              <Button asChild variant="primary" size="40" icon={Plus}>
                <Link href="/projects/new">{t("projects.newTitle")}</Link>
              </Button>
            )}
          </>
        }
        tools={
          <Segmented
            items={[
              { href: "/projects", label: t("tasks.view.list"), active: true, icon: <IconLayoutGrid className="size-4" /> },
              { href: `/projects/timeline${tlQs}`, label: t("staffX.portfolioTimeline.title"), active: false, icon: <Timeline className="size-4" /> },
            ]}
          />
        }
      />

      <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
        {/* Holat — yagona segmented (mobil'da gorizontal suriladi) */}
        <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
          <Segmented className="min-w-max" items={statusItems} />
        </div>

        {/* Real vaqt filtrlari — "Qöllaş" tugmasi yöq. Bosqiç röyxati tur böyiça çeklangan. */}
        <ProjectsFilters types={projectTypeOptions} stagesByType={stagesByType} />

        {/* Poster töri — katta kvadrat muqovalar (tör va oʻlcham oʻzgarmaydi) */}
        {filtered.length === 0 ? (
          <Card className="py-16 text-center t-small text-[var(--ink-3)]">{t("projects.empty")}</Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group block rounded-[var(--radius-media)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-1)] transition-[transform,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--line-strong)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {p.posterUrl ? (
                    <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                      <span className="select-none text-5xl font-black text-[var(--ink-3)]">{p.name.trim().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  {p.atRisk && (
                    <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-[var(--danger)] text-white shadow-sm" title={t("projects.atRisk")}>
                      <AlertTriangle className="size-4" />
                    </span>
                  )}
                  {/* Bitta ingichka jarayon signali — posterning pastida */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                    <div className="h-full bg-[var(--tint)]" style={{ width: `${p.progressPercentage}%` }} />
                  </div>
                </div>
                {/* Poster ostidagi matn: nom markazda; tur çapda, holat öngda. */}
                <div className="space-y-2 px-1.5 pb-1 pt-2.5">
                  <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-semibold leading-snug text-[var(--ink)]">{p.name}</p>
                  <div className="flex items-center justify-between gap-2">
                    {/* Agar janr belgilangan bölsa öşani körsatamiz; aks holda pipeline turini. Uzun nomlar suriladi. */}
                    <Marquee className="min-w-0 flex-1 text-xs text-[var(--ink-2)]">
                      {isProjectGenre(p.genre)
                        ? t(`projects.genre.${p.genre}` as "projects.genre.film")
                        : (p.projectTypeName ?? t(`projects.type.${p.type}` as "projects.type.internal"))}
                    </Marquee>
                    <Status tone={STATUS_TONE[p.derived]} className="shrink-0">
                      {t(`projects.derivedStatus.${p.derived}` as `projects.derivedStatus.${DerivedStatus}`)}
                    </Status>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
