"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useTransition } from "react";
import { ChevronDown, Search } from "lucide-react";

// Airy dashed control — same language as the file dropzone.
const FIELD =
  "h-11 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none";

function Sel({
  value,
  onChange,
  disabled,
  title,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" title={title}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
    </div>
  );
}

/**
 * Real-time projects filter bar (no "Apply" button): every change updates the
 * URL, which re-renders the list on the server. The "stage" dropdown is scoped
 * to the selected type and stays disabled until a type is picked.
 */
export function ProjectsFilters({
  types,
  stagesByType,
}: {
  types: { id: string; name: string }[];
  stagesByType: Record<string, { value: string; name: string }[]>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const typeId = params.get("typeId") ?? "";
  const stage = params.get("stage") ?? "";
  const payment = params.get("payment") ?? "";
  const sort = params.get("sort") ?? "created";
  const overdue = params.get("overdue") === "1";
  const searchParam = params.get("search") ?? "";

  const [search, setSearch] = useState(searchParam);

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  // Debounce the search box so we navigate once the user pauses typing.
  useEffect(() => {
    if (search === searchParam) return;
    const id = setTimeout(() => push({ search: search || null }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stageOpts = typeId ? stagesByType[typeId] ?? [] : [];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="relative sm:col-span-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("projects.searchPlaceholder")}
          className="h-11 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent pl-10 pr-3.5 text-sm font-medium text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      {/* Selecting a type also clears any stage (options are type-scoped). */}
      <Sel value={typeId} onChange={(v) => push({ typeId: v || null, stage: null })}>
        <option value="">{t("projects.filters.allTypes")}</option>
        {types.map((pt) => (
          <option key={pt.id} value={pt.id}>{pt.name}</option>
        ))}
      </Sel>

      <Sel
        value={stage}
        disabled={!typeId}
        title={!typeId ? t("projects.filters.selectTypeFirst") : undefined}
        onChange={(v) => push({ stage: v || null })}
      >
        <option value="">{typeId ? t("projects.filters.allStages") : t("projects.filters.selectTypeFirst")}</option>
        {stageOpts.map((s) => (
          <option key={s.value} value={s.value}>{s.name}</option>
        ))}
      </Sel>

      <Sel value={payment} onChange={(v) => push({ payment: v || null })}>
        <option value="">{t("projects.filters.payment")}</option>
        <option value="paid">{t("projects.filters.paid")}</option>
        <option value="unpaid">{t("projects.filters.unpaid")}</option>
      </Sel>

      <Sel value={sort} onChange={(v) => push({ sort: v })}>
        <option value="created">{t("projects.sort.created")}</option>
        <option value="name">{t("projects.sort.name")}</option>
        <option value="deadline">{t("projects.sort.deadline")}</option>
        <option value="progress">{t("projects.sort.progress")}</option>
      </Sel>

      <label className={`${FIELD} inline-flex items-center gap-2 cursor-pointer`}>
        <input
          type="checkbox"
          checked={overdue}
          onChange={(e) => push({ overdue: e.target.checked ? "1" : null })}
          className="accent-[var(--warning)]"
        />
        {t("projects.filters.overdue")}
      </label>
    </div>
  );
}
