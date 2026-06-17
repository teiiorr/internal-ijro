import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, AlertTriangle } from "lucide-react";
import { can } from "@/lib/permissions";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { formatDate } from "@/lib/dates";

type Sort = "created" | "name" | "deadline" | "progress";
type StatusFilter = "all" | "not_started" | "in_progress" | "completed" | "on_hold" | "at_risk";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const sort: Sort = ((get("sort") as Sort | undefined) ?? "created");
  const statusFilter: StatusFilter = ((get("status") as StatusFilter | undefined) ?? "all");

  const rows = await listProjects({});
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

  const FilterTab = ({ value, label, count }: { value: StatusFilter; label: string; count: number }) => (
    <Link
      href={`/projects?status=${value}&sort=${sort}`}
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("projects.pageTitle")}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="default">
            <a href="/api/export/projects"><Download className="size-4" /> XLSX</a>
          </Button>
          {canCreate && (
            <Button asChild size="default">
              <Link href="/projects/new"><Plus className="size-4" /> {t("projects.newTitle")}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[var(--surface-3)] rounded-[10px] p-1 overflow-x-auto no-scrollbar">
          <FilterTab value="all"         label={t("common.all")} count={counts.all} />
          <FilterTab value="not_started" label={t("projects.derivedStatus.not_started")} count={counts.not_started} />
          <FilterTab value="in_progress" label={t("projects.derivedStatus.in_progress")} count={counts.in_progress} />
          <FilterTab value="completed"   label={t("projects.derivedStatus.completed")} count={counts.completed} />
          <FilterTab value="on_hold"     label={t("projects.derivedStatus.on_hold")} count={counts.on_hold} />
          <FilterTab value="at_risk"     label={t("projects.atRisk")} count={counts.at_risk} />
        </div>

        <form className="ml-auto" action="/projects">
          <input type="hidden" name="status" value={statusFilter} />
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-md border border-[var(--input)] bg-[var(--surface)] px-3 text-sm font-medium"
            // Form auto-submits on change via reflected URL (use a controlled approach client-side normally)
          >
            <option value="created">{t("projects.sort.created")}</option>
            <option value="name">{t("projects.sort.name")}</option>
            <option value="deadline">{t("projects.sort.deadline")}</option>
            <option value="progress">{t("projects.sort.progress")}</option>
          </select>
          <noscript><Button type="submit" size="sm" className="ml-2">{t("common.apply")}</Button></noscript>
          <Button type="submit" size="sm" variant="ghost" className="ml-1">
            {t("common.apply")}
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("projects.headers.name")}</TableHead>
                <TableHead>{t("projects.headers.type")}</TableHead>
                <TableHead>{t("projects.headers.curator")}</TableHead>
                <TableHead>{t("projects.headers.progress")}</TableHead>
                <TableHead>{t("projects.headers.deadline")}</TableHead>
                <TableHead>{t("projects.headers.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const variant: "default" | "secondary" | "warning" | "success" =
                  p.derived === "completed" ? "success"
                  : p.derived === "on_hold" ? "warning"
                  : p.derived === "in_progress" ? "default"
                  : "secondary";
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/projects/${p.id}`} className="font-semibold hover:text-[var(--primary)] transition-colors inline-flex items-center gap-2">
                        {p.name}
                        {p.atRisk && (
                          <span title={t("projects.atRisk")} aria-label={t("projects.atRisk")}>
                            <AlertTriangle className="size-3.5 text-[var(--danger)]" />
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>{t(`projects.type.${p.type}` as "projects.type.internal")}</TableCell>
                    <TableCell>{p.curatorName ?? t("common.emptyValue")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--foreground)]" style={{ width: `${p.progressPercentage}%` }} />
                        </div>
                        <span className="text-xs font-semibold tabular w-8 text-right">{p.progressPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.deadline ? formatDate(p.deadline) : t("common.emptyValue")}</TableCell>
                    <TableCell>
                      <Badge variant={variant}>{t(`projects.derivedStatus.${p.derived}` as `projects.derivedStatus.${DerivedStatus}`)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-[var(--muted)]">{t("projects.empty")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
