"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IconSearch, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { DOC_TYPES, DEFAULT_REGISTRY_FILTER, isFilterActive, type RegistryFilter } from "./logic";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-[var(--radius-control)] px-3 t-label transition-colors",
        active
          ? "bg-[var(--tint)] text-[var(--on-tint)]"
          : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
      )}
    >
      {children}
    </button>
  );
}

/** One scrollable chip row on phones, wrapping on wider screens. */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
      {children}
    </div>
  );
}

/**
 * Registry search + chips (type, status, year). Controlled: NormativeDocuments owns the
 * filter state and filters client-side (logic.ts filterRegistry).
 */
export function RegistryFilters({
  value,
  onChange,
  years,
  shown,
  total,
}: {
  value: RegistryFilter;
  onChange: (next: RegistryFilter) => void;
  years: number[];
  shown: number;
  total: number;
}) {
  const t = useTranslations("staffX.normativeAck");
  const tc = useTranslations("common");
  const set = (patch: Partial<RegistryFilter>) => onChange({ ...value, ...patch });
  const active = isFilterActive(value);

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
        <input
          type="search"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={t("search")}
          aria-label={t("search")}
          className="t-body h-12 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-11 pr-4 text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--focus)] focus:outline-none"
        />
      </div>

      <ChipRow label={t("docType")}>
        <Chip active={value.type === "all"} onClick={() => set({ type: "all" })}>{t("allTypes")}</Chip>
        {DOC_TYPES.map((ty) => (
          <Chip key={ty} active={value.type === ty} onClick={() => set({ type: ty })}>
            {t(`type.${ty}`)}
          </Chip>
        ))}
      </ChipRow>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
        <ChipRow label={t("status")}>
          <Chip active={value.status === "all"} onClick={() => set({ status: "all" })}>{t("allStatuses")}</Chip>
          <Chip active={value.status === "active"} onClick={() => set({ status: "active" })}>{t("statusActive")}</Chip>
          <Chip active={value.status === "repealed"} onClick={() => set({ status: "repealed" })}>{t("statusRepealed")}</Chip>
        </ChipRow>
        {years.length > 1 && (
          <ChipRow label={tc("year")}>
            <Chip active={value.year === "all"} onClick={() => set({ year: "all" })}>{t("allYears")}</Chip>
            {years.map((y) => (
              <Chip key={y} active={value.year === y} onClick={() => set({ year: y })}>
                {y}
              </Chip>
            ))}
          </ChipRow>
        )}
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 t-small text-[var(--ink-3)]">
          <span className="tabular-nums">{t("found", { shown, total })}</span>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_REGISTRY_FILTER)}
            className="inline-flex items-center gap-1 font-medium text-[var(--tint)] hover:underline"
          >
            <IconX className="size-3.5" aria-hidden />
            {t("clearFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
