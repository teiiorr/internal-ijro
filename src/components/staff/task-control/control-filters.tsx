"use client";
import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconChevronDown as ChevronDown, IconFilterOff as FilterOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { controlHref, type ControlFilter, type ControlScope } from "./control-logic";

const FIELD =
  "h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--ink)] " +
  "transition-[border-color] focus:border-[var(--tint)] focus:outline-none";

const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export type ControlFilterState = {
  scope: ControlScope;
  filter?: ControlFilter;
  projectId?: string;
  priority?: string;
  from?: string;
  to?: string;
};

/**
 * Nazorat taxtasining qoʻshimcha filtrlari: loyiha, ustuvorlik, muddat oraligʻi.
 * Holat tanlovi (sarhisob bilan) sahifaning yuqorisidagi segmentli boshqaruvda.
 * Har bir oʻzgarish URL'ni almashtiradi (sahifa qayta tiklanadi) — quti ichida quti yoʻq.
 */
export function ControlFilters({
  current,
  projects,
}: {
  current: ControlFilterState;
  projects: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations();
  const tc = useTranslations("staffX.taskControl");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function push(patch: Partial<Record<keyof ControlFilterState, string | null>>) {
    const next = { ...current, ...patch } as Record<string, string | null | undefined>;
    startTransition(() => router.replace(controlHref(next, pathname), { scroll: false }));
  }

  const hasExtra = !!(current.filter || current.projectId || current.priority || current.from || current.to);

  return (
    <div className={cn("transition-opacity", pending && "opacity-70")}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
        <label className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
          <span className="block t-micro text-[var(--ink-3)]">{tc("project")}</span>
          <span className="relative block">
            <select
              value={current.projectId ?? ""}
              onChange={(e) => push({ projectId: e.target.value || null })}
              className={cn(FIELD, "appearance-none truncate pr-9")}
            >
              <option value="">{tc("allProjects")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" />
          </span>
        </label>

        <label className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
          <span className="block t-micro text-[var(--ink-3)]">{tc("priority")}</span>
          <span className="relative block">
            <select
              value={current.priority ?? ""}
              onChange={(e) => push({ priority: e.target.value || null })}
              className={cn(FIELD, "appearance-none pr-9")}
            >
              <option value="">{tc("allPriorities")}</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`tasks.priority.${p}`)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" />
          </span>
        </label>

        <label className="min-w-0 space-y-1.5">
          <span className="block truncate t-micro text-[var(--ink-3)]">{tc("from")}</span>
          <input
            key={`from-${current.from ?? ""}`}
            type="date"
            defaultValue={current.from ?? ""}
            max={current.to}
            onChange={(e) => push({ from: e.target.value || null })}
            className={FIELD}
          />
        </label>

        <label className="min-w-0 space-y-1.5">
          <span className="block truncate t-micro text-[var(--ink-3)]">{tc("to")}</span>
          <input
            key={`to-${current.to ?? ""}`}
            type="date"
            defaultValue={current.to ?? ""}
            min={current.from}
            onChange={(e) => push({ to: e.target.value || null })}
            className={FIELD}
          />
        </label>
      </div>

      {hasExtra && (
        <button
          type="button"
          onClick={() => push({ filter: null, projectId: null, priority: null, from: null, to: null })}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-sm font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >
          <FilterOff className="size-4" />
          {tc("clearFilters")}
        </button>
      )}
    </div>
  );
}
