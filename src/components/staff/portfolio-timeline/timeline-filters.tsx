"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconChevronDown, IconFilter, IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { DEFAULT_ZOOM, parseGroup, parseZoom, type TimelineGroup, type Zoom } from "@/lib/projects/timeline";

// /projects filtrlari bilan bir xil BIIB maydon uslubi.
const FIELD =
  "h-11 w-full rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 text-sm font-medium text-[var(--ink)] transition-colors focus:border-[var(--line-strong)] focus:outline-none";

function Sel({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(FIELD, "appearance-none truncate pr-10")}
      >
        {children}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={cn(FIELD, "inline-flex min-w-0 cursor-pointer items-center gap-2")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="shrink-0 accent-[var(--tint)]"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden shrink-0 t-micro text-[var(--ink-3)] sm:inline">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-2)] p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[var(--radius-s)] px-3 py-1.5 t-label transition-all",
                active
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Xronologiya filtrlari. Butun holat URL parametrlarida (router.replace) — sahifa
 * serverda qayta chiziladi. Qidiruv 300ms debounce bilan.
 */
export function TimelineFilters({
  types,
  studios,
  curators,
}: {
  types: { id: string; name: string }[];
  studios: { id: string; name: string }[];
  curators: { id: string; fullName: string }[];
}) {
  const t = useTranslations("staffX.portfolioTimeline");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const typeId = params.get("typeId") ?? "";
  const studioId = params.get("studioId") ?? "";
  const curatorId = params.get("curatorId") ?? "";
  const overdue = params.get("overdue") === "1";
  const completed = params.get("completed") === "1";
  const group = parseGroup(params.get("group"));
  const zoom = parseZoom(params.get("zoom"));

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [open, setOpen] = useState(false);
  const activeCount = [typeId, studioId, curatorId, overdue ? "1" : "", completed ? "1" : ""].filter(Boolean).length;

  const push = useCallback(
    (patch: Record<string, string | null>) => {
      // Har doim joriy URL'dan — debounce paytida boshqa filtr oʻzgargan boʻlsa ham yoʻqolmaydi.
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router],
  );

  // Qidiruv: foydalanuvchi yozishni toʻxtatgandan 300ms keyin URL'ga yoziladi.
  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("search") ?? "";
    const value = search.trim();
    if (value === current) return;
    const id = setTimeout(() => push({ search: value || null }), 300);
    return () => clearTimeout(id);
  }, [search, push]);

  const groupOptions: { value: TimelineGroup; label: string }[] = [
    { value: "none", label: t("groupNone") },
    { value: "studio", label: t("groupStudio") },
    { value: "curator", label: t("groupCurator") },
    { value: "type", label: t("groupType") },
  ];
  const zoomOptions: { value: Zoom; label: string }[] = [
    { value: "month", label: t("zoomMonth") },
    { value: "quarter", label: t("zoomQuarter") },
    { value: "year", label: t("zoomYear") },
  ];

  return (
    <div className={cn("space-y-2 transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className={cn(FIELD, "pl-10 placeholder:text-[var(--ink-3)]")}
          />
        </div>
        {/* Mobil'da selektlar bitta tugma ostiga yigʻiladi */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={t("filters")}
          className={cn(FIELD, "inline-flex w-auto shrink-0 items-center gap-1.5 sm:hidden")}
        >
          <IconFilter className="size-4 text-[var(--ink-3)]" />
          {activeCount > 0 && (
            <span className="t-micro tabular-nums text-[var(--tint)]">{activeCount}</span>
          )}
          <IconChevronDown className={cn("size-4 text-[var(--ink-3)] transition-transform", open && "rotate-180")} />
        </button>
      </div>

      <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5", !open && "hidden sm:grid")}>
        <Sel value={typeId} onChange={(v) => push({ typeId: v || null })} label={t("type")}>
          <option value="">{t("allTypes")}</option>
          {types.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Sel>
        <Sel value={studioId} onChange={(v) => push({ studioId: v || null })} label={t("studio")}>
          <option value="">{t("allStudios")}</option>
          {studios.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Sel>
        <Sel value={curatorId} onChange={(v) => push({ curatorId: v || null })} label={t("curator")}>
          <option value="">{t("allCurators")}</option>
          {curators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.fullName}
            </option>
          ))}
        </Sel>
        <Toggle checked={overdue} onChange={(v) => push({ overdue: v ? "1" : null })} label={t("onlyLate")} />
        <Toggle checked={completed} onChange={(v) => push({ completed: v ? "1" : null })} label={t("showCompleted")} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Segmented
          label={t("group")}
          value={group}
          options={groupOptions}
          onChange={(v) => push({ group: v === "none" ? null : v })}
        />
        <Segmented
          label={t("zoom")}
          value={zoom}
          options={zoomOptions}
          onChange={(v) => push({ zoom: v === DEFAULT_ZOOM ? null : v })}
        />
      </div>
    </div>
  );
}
