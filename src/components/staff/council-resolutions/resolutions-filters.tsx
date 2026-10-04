"use client";
import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { IconChevronDown as ChevronDown, IconFilterOff as FilterOff } from "@tabler/icons-react";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { COUNCIL_KINDS, resolutionsHref, type ResolutionFilters } from "@/lib/councils/resolution-status";
import { FIELD, NS } from "./shared";

/**
 * /kengashlar/ijro filters: council kind chips, responsible / department selects and
 * the "Faqat menga tegishli" toggle. Every change replaces the URL (server re-render).
 */
export function ResolutionsFilters({
  current,
  position,
  people,
  departments,
}: {
  current: ResolutionFilters;
  /** Needed to encode `mine` relative to the position's default. */
  position: string;
  people: Array<{ id: string; fullName: string }>;
  departments: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function push(patch: Partial<ResolutionFilters>) {
    const next = { ...current, ...patch };
    startTransition(() => router.replace(resolutionsHref(next, pathname, position), { scroll: false }));
  }

  const kinds: Array<{ value: ResolutionFilters["kind"]; label: string }> = [
    { value: undefined, label: t("allKinds") },
    ...COUNCIL_KINDS.map((k) => ({ value: k, label: t(k) })),
  ];
  const hasExtra = !!(current.kind || current.status || current.responsibleId || current.departmentId || current.mine);

  return (
    <div className={cn("space-y-3 transition-opacity", pending && "opacity-70")}>
      <div className="flex min-w-0 items-center gap-2">
        <div
          role="tablist"
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 [scrollbar-width:none] sm:flex-initial [&::-webkit-scrollbar]:hidden"
        >
          {kinds.map((k) => {
            const active = current.kind === k.value;
            return (
              <button
                key={k.value ?? "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => push({ kind: k.value })}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-all sm:px-4 sm:text-sm",
                  active
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-1)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>
        {hasExtra && (
          <button
            type="button"
            onClick={() =>
              push({ kind: undefined, status: undefined, responsibleId: undefined, departmentId: undefined, mine: false })
            }
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
            title={t("clearFilters")}
          >
            <FilterOff className="size-4" />
            <span className="hidden sm:inline">{t("clearFilters")}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="min-w-0 space-y-1">
          <span className="block text-xs font-semibold text-[var(--muted)]">{t("responsible")}</span>
          <span className="relative block">
            <select
              value={current.mine ? "" : (current.responsibleId ?? "")}
              onChange={(e) => push({ responsibleId: e.target.value || undefined, mine: false })}
              disabled={current.mine}
              className={cn(FIELD, "appearance-none truncate pr-9")}
            >
              <option value="">{t("allResponsible")}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {localizeName(p.fullName, locale)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          </span>
        </label>

        <label className="min-w-0 space-y-1">
          <span className="block text-xs font-semibold text-[var(--muted)]">{tg("common.department")}</span>
          <span className="relative block">
            <select
              value={current.departmentId ?? ""}
              onChange={(e) => push({ departmentId: e.target.value || undefined })}
              className={cn(FIELD, "appearance-none truncate pr-9")}
            >
              <option value="">{t("allDepartments")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          </span>
        </label>

        <label className="flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm font-semibold has-[:focus-visible]:border-[var(--primary)] has-[:focus-visible]:shadow-[0_0_0_2px_var(--primary-soft)]">
          <span
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              current.mine ? "bg-[var(--primary)]" : "bg-[var(--surface-3)]"
            )}
          >
            <span
              className={cn(
                "inline-block size-4 rounded-full bg-[var(--card)] shadow-[var(--shadow-1)] transition-transform",
                current.mine ? "translate-x-[18px]" : "translate-x-0.5"
              )}
            />
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={current.mine}
            onChange={(e) => push({ mine: e.target.checked, responsibleId: undefined })}
          />
          <span className="min-w-0 truncate">{t("mine")}</span>
        </label>
      </div>
    </div>
  );
}

