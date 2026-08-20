"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  IconFolder as Folder,
  IconCalendar as Calendar,
  IconUser as User,
} from "@tabler/icons-react";

type Project = {
  id: string;
  name: string;
  status: string;
  progressPercentage: number | null;
  deadline: string | Date | null;
  startDate: string | Date | null;
  curatorName: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  completed: "success",
  active: "warning",
  planning: "secondary",
  cancelled: "danger",
};

export function StudioProjectsList({ projects }: { projects: Project[] }) {
  const t = useTranslations();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
        <Folder className="size-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">{t("contractors.detail.noProjects")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((p) => {
        const progress = p.progressPercentage ?? 0;
        return (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block rounded-2xl border border-[var(--border)] p-3 sm:p-4 transition-colors hover:bg-[var(--surface-2)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{p.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                  {p.curatorName && (
                    <span className="flex items-center gap-1">
                      <User className="size-3.5" /> {p.curatorName}
                    </span>
                  )}
                  {p.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {new Date(p.deadline).toLocaleDateString("uz-Latn", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="shrink-0">
                {t(`status.${p.status}` as "status.planning")}
              </Badge>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--muted)] mb-1">
                <span>{t("contractors.detail.progress")}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
