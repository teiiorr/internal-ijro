"use client";
import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconChevronDown as ChevronDown, IconFilterOff as FilterOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { controlHref, type ControlFilter, type ControlScope } from "./control-logic";

const FIELD =
  "h-10 w-full min-w-0 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--foreground)] " +
  "transition-[border-color,box-shadow] focus:border-[var(--primary)] focus:outline-none focus:shadow-[0_0_0_2px_var(--primary-soft)]";

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
 * Board filters ("Ijro nazorati"): quick chips + project / priority / deadline range.
 * Every change replaces the URL (page reset), which re-renders the server board.
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

  const chips: Array<{ value: ControlFilter | null; label: string; tone: string }> = [
    { value: null, label: tc("filterAll"), tone: "text-[var(--foreground)]" },
    { value: "no_response", label: tc("filterNoResponse"), tone: "text-[var(--primary)]" },
    { value: "late", label: tc("filterLate"), tone: "text-[var(--danger)]" },
    { value: "to_review", label: tc("filterToReview"), tone: "text-[var(--warning)]" },
  ];

  const hasExtra = !!(current.filter || current.projectId || current.priority || current.from || current.to);

  return (
    <div className={cn("space-y-3 transition-opacity", pending && "opacity-70")}>
      <div className="flex min-w-0 items-center gap-2">
        <div
          role="tablist"
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 [scrollbar-width:none] sm:flex-initial [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((c) => {
            const active = (current.filter ?? null) === c.value;
            return (
              <button
                key={c.value ?? "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => push({ filter: c.value })}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-all sm:px-4 sm:text-sm",
                  active ? `bg-[var(--surface)] shadow-[var(--shadow-1)] ${c.tone}` : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {hasExtra && (
          <button
            type="button"
            onClick={() => push({ filter: null, projectId: null, priority: null, from: null, to: null })}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
            title={tc("clearFilters")}
          >
            <FilterOff className="size-4" />
            <span className="hidden sm:inline">{tc("clearFilters")}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <label className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
          <span className="block text-xs font-semibold text-[var(--muted)]">{tc("project")}</span>
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
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          </span>
        </label>

        <label className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
          <span className="block text-xs font-semibold text-[var(--muted)]">{tc("priority")}</span>
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
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          </span>
        </label>

        <label className="min-w-0 space-y-1">
          <span className="block truncate text-xs font-semibold text-[var(--muted)]">{tc("from")}</span>
          <input
            key={`from-${current.from ?? ""}`}
            type="date"
            defaultValue={current.from ?? ""}
            max={current.to}
            onChange={(e) => push({ from: e.target.value || null })}
            className={FIELD}
          />
        </label>

        <label className="min-w-0 space-y-1">
          <span className="block truncate text-xs font-semibold text-[var(--muted)]">{tc("to")}</span>
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
    </div>
  );
}
