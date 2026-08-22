"use client";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconFolder as Folder,
  IconCalendar as Calendar,
  IconUser as User,
  IconArrowRight as ArrowRight,
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
  const locale = useLocale();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
        <Folder className="size-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">{t("contractors.detail.noProjects")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
      {projects.map((p) => {
        const progress = p.progressPercentage ?? 0;
        return (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:bg-[var(--surface-2)]"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="font-bold text-base truncate flex-1">{p.name}</p>
              <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="shrink-0">
                {t(`status.${p.status}` as "status.planning")}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)] mb-3">
              {p.curatorName && (
                <span className="flex items-center gap-1">
                  <User className="size-3.5" /> {p.curatorName}
                </span>
              )}
              {p.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(p.deadline, locale)}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--muted)] mb-1">
                <span>{t("contractors.detail.progress")}</span>
                <span className="font-bold text-[var(--foreground)]">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] animate-progress"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-auto">
              <Link href={`/projects/${p.id}`}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  {t("contractors.detail.goToProject")}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
