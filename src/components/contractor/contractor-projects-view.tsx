"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconSearch as Search, IconAlertTriangle as Alert, IconLoader2 as Loader, IconCircleCheck as Check } from "@tabler/icons-react";
import { StatCard } from "@/components/ui/stat-card";
import { ContractorProjectCard } from "./contractor-project-card";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { formatDate } from "@/lib/dates";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<DerivedStatus, StatusTone> = {
  completed: "green",
  in_progress: "amber",
  on_hold: "red",
  not_started: "muted",
};

// deliberately loose — matches listProjectsForContractor() rows
type Proj = {
  id: string;
  name: string;
  status: string;
  statusOverride: string | null;
  progressPercentage: number;
  deadline: string | null;
  posterUrl: string | null;
  genre: string | null;
  projectTypeName?: string | null;
  activeStageName?: string | null;
  activeStageIndex?: number | null;
  totalStages?: number;
};

type Filter = "all" | "overdue" | "in_progress" | "completed";

export function ContractorProjectsView({ projects }: { projects: Proj[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const decorated = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const PRIORITY: Record<DerivedStatus, number> = { in_progress: 0, not_started: 1, on_hold: 2, completed: 3 };
    return projects
      .map((p) => {
        const derived = derivedStatus(p.progressPercentage, p.statusOverride);
        const due = p.deadline ? new Date(p.deadline) : null;
        const overdue = !!due && due < today && derived !== "completed" && derived !== "on_hold";
        return { ...p, derived, overdue };
      })
      .sort((a, b) => (a.overdue !== b.overdue ? (a.overdue ? -1 : 1) : PRIORITY[a.derived] - PRIORITY[b.derived]));
  }, [projects]);

  const counts = useMemo(() => ({
    overdue: decorated.filter((p) => p.overdue).length,
    in_progress: decorated.filter((p) => p.derived === "in_progress" && !p.overdue).length,
    completed: decorated.filter((p) => p.derived === "completed").length,
  }), [decorated]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return decorated.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (filter === "overdue") return p.overdue;
      if (filter === "in_progress") return p.derived === "in_progress";
      if (filter === "completed") return p.derived === "completed";
      return true;
    });
  }, [decorated, q, filter]);

  const toggle = (f: Filter) => setFilter((cur) => (cur === f ? "all" : f));

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--muted)]">{t("contractor.dashboard.noProjects")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI tiles — clickable filters. "What needs me" first. */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button type="button" onClick={() => toggle("overdue")} className={cn("text-left transition-transform active:scale-[0.98]", filter === "overdue" && "ring-2 ring-[var(--danger)] rounded-2xl")}>
          <StatCard label={t("projects.atRisk")} value={counts.overdue} tone="danger" icon={<Alert className="size-4" />} />
        </button>
        <button type="button" onClick={() => toggle("in_progress")} className={cn("text-left transition-transform active:scale-[0.98]", filter === "in_progress" && "ring-2 ring-[var(--warning)] rounded-2xl")}>
          <StatCard label={t("projects.derivedStatus.in_progress")} value={counts.in_progress} tone="warning" icon={<Loader className="size-4" />} />
        </button>
        <button type="button" onClick={() => toggle("completed")} className={cn("text-left transition-transform active:scale-[0.98]", filter === "completed" && "ring-2 ring-[var(--success)] rounded-2xl")}>
          <StatCard label={t("projects.derivedStatus.completed")} value={counts.completed} tone="success" icon={<Check className="size-4" />} />
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search")}
          className="h-11 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
        />
      </div>

      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <StatusTag tone={filter === "overdue" ? "red" : filter === "completed" ? "green" : "amber"} size="sm">
            {shown.length}
          </StatusTag>
          <button type="button" onClick={() => setFilter("all")} className="text-xs font-semibold text-[var(--primary)] hover:underline">
            {t("common.all")}
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">{t("common.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {shown.map((p) => (
            <ContractorProjectCard
              key={p.id}
              href={`/contractor/projects/${p.id}`}
              name={p.name}
              posterUrl={p.posterUrl}
              progress={p.progressPercentage}
              statusLabel={t(`projects.derivedStatus.${p.derived}` as "projects.derivedStatus.in_progress")}
              statusTone={STATUS_TONE[p.derived]}
              typeName={isProjectGenre(p.genre) ? t(`projects.genre.${p.genre}` as "projects.genre.film") : p.projectTypeName}
              stageLabel={p.activeStageName ? `${p.activeStageIndex}/${p.totalStages} · ${p.activeStageName}` : null}
              deadlineLabel={p.deadline ? formatDate(p.deadline, locale) : null}
              overdue={p.overdue}
              overdueLabel={t("projects.atRisk")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
