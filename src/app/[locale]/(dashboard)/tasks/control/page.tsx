import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconDownload as Download,
} from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented, type SegmentedItem } from "@/components/ui-biib/Segmented";
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

const SCROLL = "max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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
  const exportHref = controlHref({ scope, from, to }, "/api/export/task-control");

  const scopeLabel: Record<ControlScope, string> = {
    mine: t("scopeMine"),
    department: t("scopeDepartment"),
    all: t("scopeAll"),
  };
  const scopeItems: SegmentedItem[] = scopes.map((s) => ({
    href: controlHref({ scope: s === "mine" ? null : s }),
    active: s === scope,
    label: scopeLabel[s],
  }));

  // Sarhisob — plita emas, Holat tanlovlarining ichida xotirjam matn.
  const withCount = (label: string, n: number): SegmentedItem["label"] => (
    <>
      {label}
      <span className="t-micro tabular-nums text-[var(--ink-3)]">{n}</span>
    </>
  );
  const filterHref = (f: string | null) => controlHref({ scope: scope === "mine" ? null : scope, projectId, priority, from, to, filter: f });
  const statusItems: SegmentedItem[] = [
    { href: filterHref(null), active: !filter, label: withCount(t("filterAll"), kpis.openGiven) },
    { href: filterHref("no_response"), active: filter === "no_response", label: withCount(t("filterNoResponse"), kpis.awaitingAnswer) },
    { href: filterHref("late"), active: filter === "late", label: withCount(t("filterLate"), kpis.lateAssignees) },
    { href: filterHref("to_review"), active: filter === "to_review", label: withCount(t("filterToReview"), kpis.awaitingMyApproval) },
  ];

  return (
    <div>
      <PageHeader
        title={t("title")}
        back={<BackButton fallbackHref="/tasks" />}
        actions={
          <Button asChild variant="glass" size="40" icon={Download}>
            <a href={exportHref}>{t("export")}</a>
          </Button>
        }
        tools={scopes.length > 1 ? <div className={SCROLL}><Segmented items={scopeItems} /></div> : undefined}
      />

      <div className="flex min-w-0 flex-col gap-5">
        <div className={SCROLL}>
          <Segmented items={statusItems} />
        </div>

        <ControlFilters current={{ scope, filter, projectId, priority, from, to }} projects={projects} />

        <ControlTable rows={board.rows} currentUserId={me.id} isLeadership={isLeadership} />

        {pages > 1 && (
          <nav className="flex items-center justify-between gap-3" aria-label="pagination">
            <PageLink disabled={page <= 1} href={controlHref({ ...base, page: page - 1 > 1 ? page - 1 : null })}>
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">{t("prevPage")}</span>
            </PageLink>
            <span className="t-small font-semibold tabular-nums text-[var(--ink-3)]">
              {t("pageOf", { page: Math.min(page, pages), pages })}
            </span>
            <PageLink disabled={page >= pages} href={controlHref({ ...base, page: page + 1 })}>
              <span className="hidden sm:inline">{t("nextPage")}</span>
              <ChevronRight className="size-4" />
            </PageLink>
          </nav>
        )}
      </div>
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls =
    "inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-3.5 text-sm font-semibold text-[var(--ink)] transition-colors";
  if (disabled) return <span className={cn(cls, "pointer-events-none opacity-40")}>{children}</span>;
  return (
    <Link href={href} className={cn(cls, "hover:border-[var(--tint)] hover:text-[var(--tint)]")}>
      {children}
    </Link>
  );
}
