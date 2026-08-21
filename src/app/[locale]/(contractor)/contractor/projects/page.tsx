import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { SmoothImage } from "@/components/ui/smooth-image";
import { ScrollMemory } from "@/components/scroll-memory";
import { Marquee } from "@/components/ui/marquee";
import { IconAlertTriangle as AlertTriangle } from "@tabler/icons-react";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";

const STATUS_TONE: Record<DerivedStatus, StatusTone> = {
  completed: "green",
  in_progress: "amber",
  on_hold: "red",
  not_started: "muted",
};

export default async function ContractorProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { projects } = await listProjectsForContractor(session.user.id, locale);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const decorated = projects.map((p) => {
    const status = derivedStatus(p.progressPercentage, p.statusOverride);
    const due = p.deadline ? new Date(p.deadline) : null;
    const atRisk = !!due && due < today && status !== "completed" && status !== "on_hold";
    return { ...p, derived: status, atRisk };
  });

  const STATUS_PRIORITY: Record<DerivedStatus, number> = {
    in_progress: 0,
    not_started: 1,
    on_hold: 2,
    completed: 3,
  };

  decorated.sort((a, b) => {
    if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
    return STATUS_PRIORITY[a.derived] - STATUS_PRIORITY[b.derived];
  });

  return (
    <div className="space-y-5 sm:space-y-6 stagger-children">
      <ScrollMemory />
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("contractor.dashboard.myProjects")}</h1>

      {decorated.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-[var(--muted)]">{t("contractor.dashboard.noProjects")}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {decorated.map((p) => (
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
                      : (p.projectTypeName ?? t(`projects.type.${p.status === "completed" ? "external" : "internal"}` as "projects.type.internal"))}
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
