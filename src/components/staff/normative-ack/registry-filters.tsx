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
        "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors",
        active
          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

/** One scrollable chip row on phones, wrapping on wider screens. */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
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
    <div className="space-y-2.5">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
        <input
          type="search"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-11 w-full min-w-0 rounded-2xl border border-[var(--input)] bg-[var(--surface-2)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none"
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

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
          <span className="tabular-nums">{t("found", { shown, total })}</span>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_REGISTRY_FILTER)}
            className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
          >
            <IconX className="size-3.5" />
            {t("clearFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
