"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconSearch as Search, IconClipboardText as Board } from "@tabler/icons-react";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import type { DerivedStatus } from "@/lib/projects/progress";

export type ProjectStatusRow = {
  id: string;
  name: string;
  currentStatus: string | null;
  status: DerivedStatus;
};

const TONE: Record<DerivedStatus, StatusTone> = {
  completed: "green",
  in_progress: "amber",
  on_hold: "red",
  not_started: "muted",
};

export function ProjectStatusSearch({ projects }: { projects: ProjectStatusRow[] }) {
  const t = useTranslations();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const rows = useMemo(() => {
    if (term) {
      return projects.filter(
        (p) => p.name.toLowerCase().includes(term) || (p.currentStatus ?? "").toLowerCase().includes(term),
      );
    }
    // Default view: only projects that actually have a current-status note.
    return projects.filter((p) => (p.currentStatus ?? "").trim() !== "");
  }, [projects, term]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("dashboard.currentStatus.search")}
          className="h-11 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
        />
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          {term ? t("common.noResults") : t("dashboard.currentStatus.empty")}
        </p>
      ) : (
        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate font-semibold">{p.name}</p>
                <StatusTag tone={TONE[p.status]} className="shrink-0">
                  {t(`projects.derivedStatus.${p.status}` as "projects.derivedStatus.in_progress")}
                </StatusTag>
              </div>
              {p.currentStatus?.trim() ? (
                <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--muted)]">
                  {p.currentStatus}
                </p>
              ) : (
                <p className="mt-1.5 text-[13px] italic text-[var(--subtle)]">{t("dashboard.currentStatus.notSet")}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {!term && rows.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Board className="size-3.5" />
          {t("dashboard.currentStatus.count", { n: rows.length })}
        </p>
      )}
    </div>
  );
}
