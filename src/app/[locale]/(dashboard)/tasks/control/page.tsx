import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  IconAlertTriangle as AlertTriangle,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconDownload as Download,
  IconHourglass as Hourglass,
  IconListCheck as ListCheck,
  IconSend as Send,
  IconTarget as Target,
} from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { StatCard } from "@/components/ui/stat-card";
import { ControlFilters } from "@/components/staff/task-control/control-filters";
import { ControlTable } from "@/components/staff/task-control/control-table";
import {
  CONTROL_PAGE_SIZE,
  controlHref,
  parseFilter,
  parseIsoDate,
  parsePage,
  parsePriority,
  parseUuid,
  resolveScope,
  type ControlScope,
} from "@/components/staff/task-control/control-logic";
import { allowedScopes, getControlBoard, getControlKpis, listControlProjects } from "@/server/queries/task-control";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TaskControlPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const me = await requireUser();
  const { locale } = await params;
  const t = await getTranslations("staffX.taskControl");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const scopes = allowedScopes(me);
  const scope = resolveScope(get("scope"), scopes);
  const filter = parseFilter(get("filter"));
  const projectId = parseUuid(get("projectId"));
  const priority = parsePriority(get("priority"));
  const from = parseIsoDate(get("from"));
  const to = parseIsoDate(get("to"));
  const page = parsePage(get("page"));

  const [board, kpis, projects] = await Promise.all([
    getControlBoard(me, { scope, filter, projectId, priority, from, to, page }),
    getControlKpis(me, scope),
    listControlProjects(me, scope),
  ]);

  const isLeadership = me.position === "direktor" || me.position === "orinbosar";
  const base = { scope: scope === "mine" ? null : scope, filter, projectId, priority, from, to };
  // Past the last page (e.g. after approving the last rows there): COUNT OVER() yields no total,
  // so the pager would vanish and strand the user on an empty page — go back to page 1.
  if (page > 1 && board.rows.length === 0) redirect(controlHref(base, `/${locale}/tasks/control`));
  const pages = Math.max(1, Math.ceil(board.total / CONTROL_PAGE_SIZE));
  // StatCard uses next/link directly, so its hrefs carry the locale prefix themselves.
  const kpiHref = (f: string | null) => controlHref({ ...base, filter: f }, `/${locale}/tasks/control`);
  const exportHref = controlHref({ scope, from, to }, "/api/export/task-control");

  const scopeLabel: Record<ControlScope, string> = {
    mine: t("scopeMine"),
    department: t("scopeDepartment"),
    all: t("scopeAll"),
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton fallbackHref="/tasks" className="mt-0.5" />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm font-medium text-[var(--muted)]">{t("subtitle")}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="self-start sm:shrink-0">
          <a href={exportHref}>
            <Download className="size-4" /> {t("export")}
          </a>
        </Button>
      </div>

      {/* Scope pills */}
      {scopes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {scopes.map((s) => (
            <Link
              key={s}
              href={controlHref({ scope: s === "mine" ? null : s })}
              replace
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[10px] px-4 py-2.5 text-[14px] font-semibold transition-all",
                s === scope
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-1)]"
                  : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {scopeLabel[s]}
            </Link>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t("kpiOpen")} value={kpis.openGiven} icon={<Send className="size-4" />} tone="default" href={kpiHref(null)} />
        <StatCard
          label={t("kpiAwaitingAnswer")}
          value={kpis.awaitingAnswer}
          icon={<Hourglass className="size-4" />}
          tone="primary"
          href={kpiHref("no_response")}
        />
        <StatCard
          label={t("kpiToReview")}
          value={kpis.awaitingMyApproval}
          icon={<ListCheck className="size-4" />}
          tone="warning"
          href={kpiHref("to_review")}
          filled={kpis.awaitingMyApproval > 0}
        />
        <StatCard
          label={t("kpiLate")}
          value={kpis.lateAssignees}
          icon={<AlertTriangle className="size-4" />}
          tone="danger"
          href={kpiHref("late")}
          filled={kpis.lateAssignees > 0}
        />
        <StatCard
          label={t("kpiOnTime")}
          value={kpis.onTimeRate90d === null ? "—" : `${kpis.onTimeRate90d}%`}
          icon={<Target className="size-4" />}
          tone={kpis.onTimeRate90d === null ? "default" : kpis.onTimeRate90d >= 80 ? "success" : kpis.onTimeRate90d >= 50 ? "warning" : "danger"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <ControlFilters current={{ scope, filter, projectId, priority, from, to }} projects={projects} />

      <ControlTable rows={board.rows} currentUserId={me.id} isLeadership={isLeadership} />

      {/* Pagination */}
      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="pagination">
          <PageLink disabled={page <= 1} href={controlHref({ ...base, page: page - 1 > 1 ? page - 1 : null })}>
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">{t("prevPage")}</span>
          </PageLink>
          <span className="text-sm font-semibold tabular-nums text-[var(--muted)]">
            {t("pageOf", { page: Math.min(page, pages), pages })}
          </span>
          <PageLink disabled={page >= pages} href={controlHref({ ...base, page: page + 1 })}>
            <span className="hidden sm:inline">{t("nextPage")}</span>
            <ChevronRight className="size-4" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls =
    "inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-semibold transition-colors";
  if (disabled) return <span className={cn(cls, "pointer-events-none opacity-40")}>{children}</span>;
  return (
    <Link href={href} className={cn(cls, "hover:border-[var(--primary)] hover:text-[var(--primary)]")}>
      {children}
    </Link>
  );
}
