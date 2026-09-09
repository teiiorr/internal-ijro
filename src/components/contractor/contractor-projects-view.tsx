"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconSearch as Search, IconAlertTriangle as AlertTriangle } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { Marquee } from "@/components/ui/marquee";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<DerivedStatus, StatusTone> = {
  completed: "green",
  in_progress: "amber",
  on_hold: "red",
  not_started: "muted",
};

// ataylab erkin tuzilgan — listProjectsForContractor() qatorlariga mos keladi
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
  activeStageReviewStatus?: string | null;
  totalStages?: number;
};

type StatusFilter = "all" | "not_started" | "in_progress" | "completed" | "on_hold" | "at_risk";

// Studiya loyihalari — xodimlardagi "Loyihalar" bilan bir xil muqova-tör körinişida.
export function ContractorProjectsView({ projects }: { projects: Proj[] }) {
  const t = useTranslations();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const decorated = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const PRIORITY: Record<DerivedStatus, number> = { in_progress: 0, not_started: 1, on_hold: 2, completed: 3 };
    return projects
      .map((p) => {
        const derived = derivedStatus(p.progressPercentage, p.statusOverride);
        const due = p.deadline ? new Date(p.deadline) : null;
        const atRisk = !!due && due < today && derived !== "completed" && derived !== "on_hold";
        // Navbat studiyada bölsa (öz javobini kutmoqda) — röyxatda tepaga çiqadi (körinmas tartib).
        const rs = p.activeStageReviewStatus;
        const needsYou = derived !== "completed" && !!rs && rs !== "submitted";
        return { ...p, derived, atRisk, needsYou };
      })
      .sort((a, b) => {
        if (a.needsYou !== b.needsYou) return a.needsYou ? -1 : 1;
        if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
        return PRIORITY[a.derived] - PRIORITY[b.derived];
      });
  }, [projects]);

  const counts = useMemo(() => ({
    all: decorated.length,
    not_started: decorated.filter((p) => p.derived === "not_started").length,
    in_progress: decorated.filter((p) => p.derived === "in_progress").length,
    completed: decorated.filter((p) => p.derived === "completed").length,
    on_hold: decorated.filter((p) => p.derived === "on_hold").length,
    at_risk: decorated.filter((p) => p.atRisk).length,
  }), [decorated]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return decorated.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (filter === "all") return true;
      if (filter === "at_risk") return p.atRisk;
      return p.derived === filter;
    });
  }, [decorated, q, filter]);

  const tabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: t("common.all"), count: counts.all },
    { value: "not_started", label: t("projects.derivedStatus.not_started"), count: counts.not_started },
    { value: "in_progress", label: t("projects.derivedStatus.in_progress"), count: counts.in_progress },
    { value: "completed", label: t("projects.derivedStatus.completed"), count: counts.completed },
    { value: "on_hold", label: t("projects.derivedStatus.on_hold"), count: counts.on_hold },
    { value: "at_risk", label: t("projects.atRisk"), count: counts.at_risk },
  ];

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--muted)]">{t("contractor.dashboard.noProjects")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Holat yorliqlari — xodimlardagi Loyihalar kabi */}
      <div className="flex gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition-all sm:px-4 sm:text-[14px]",
              filter === tab.value ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-1)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0 text-[11px] font-bold tabular-nums">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Yopişqoq qidiruv — kartalar uning ostidan siljiydi */}
      <div className="sticky top-[68px] z-20 -mx-3 bg-[var(--background)] px-3 py-2 sm:-mx-4 sm:top-[84px] sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="relative mx-auto max-w-[1500px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">{t("common.noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((p) => (
            <Link
              key={p.id}
              href={`/contractor/projects/${p.id}`}
              className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow-1)] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:shadow-[var(--shadow-2)]"
            >
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
              <div className="space-y-2 px-1.5 pb-1 pt-2.5">
                <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-semibold leading-snug transition-colors duration-300 group-hover:text-[var(--primary-foreground)]">{p.name}</p>
                <div className="flex items-center justify-between gap-2">
                  <Marquee className="min-w-0 flex-1 text-xs text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--primary-foreground)] group-hover:opacity-80">
                    {isProjectGenre(p.genre)
                      ? t(`projects.genre.${p.genre}` as "projects.genre.film")
                      : (p.projectTypeName ?? t(`projects.derivedStatus.${p.derived}` as "projects.derivedStatus.in_progress"))}
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
