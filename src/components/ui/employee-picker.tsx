"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { IconSearch as Search, IconCheck as Check, IconStar as Star } from "@tabler/icons-react";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";

export type PickerPerson = {
  id: string;
  fullName: string;
  position?: string | null;
  departmentName?: string | null;
  avatarUrl?: string | null;
};

interface EmployeePickerProps {
  people: PickerPerson[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Translate a raw position key to a label. */
  positionLabel?: (position: string) => string;
  /** Mark the first selected id as "primary" with a star badge. */
  primaryFirst?: boolean;
  /** Display-ready name transform (e.g. shortName). */
  formatName?: (name: string) => string;
  className?: string;
}

/**
 * Large visual employee cards for picking one or many people.
 * Photo-forward, selectable, with a checkmark in the bottom corner.
 */
export function EmployeePicker({
  people,
  selectedIds,
  onToggle,
  positionLabel,
  primaryFirst = false,
  formatName = (n) => n,
  className,
}: EmployeePickerProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter((p) => p.fullName.toLowerCase().includes(term));
  }, [people, search]);

  const primaryId = primaryFirst ? selectedIds[0] : undefined;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="h-11 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">{t("common.noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => {
            const selected = selectedIds.includes(p.id);
            const isPrimary = p.id === primaryId;
            const sub = [p.position ? (positionLabel?.(p.position) ?? p.position) : null, p.departmentName]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={selected}
                className={cn(
                  // pt-9 reserves a top band for the primary badge + checkmark so
                  // they never overlap the avatar or the text.
                  "group relative flex flex-col items-center rounded-2xl border p-3 pt-9 text-center transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] active:scale-[0.98]",
                  selected
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[0_0_0_1px_var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]",
                )}
              >
                {isPrimary && (
                  <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-2.5rem)] items-center gap-0.5 rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--primary-foreground)]">
                    <Star className="size-2.5 shrink-0 fill-current" />
                    <span className="truncate">{t("tasks.new.primary")}</span>
                  </span>
                )}
                <span
                  className={cn(
                    "absolute right-2 top-2 grid size-6 place-items-center rounded-full transition-all duration-200",
                    selected
                      ? "scale-100 bg-[var(--primary)] text-[var(--primary-foreground)] opacity-100"
                      : "scale-50 bg-[var(--surface-3)] text-transparent opacity-0 group-hover:scale-75 group-hover:opacity-40",
                  )}
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <UserAvatar name={p.fullName} avatarUrl={p.avatarUrl} size="lg" clickable={false} />
                {/* Fixed heights keep names/roles on the same baseline across all
                    cards (like table columns); break-words contains long surnames. */}
                <p className="mt-2 line-clamp-2 min-h-[2.5em] w-full break-words text-sm font-semibold leading-tight text-[var(--foreground)] [overflow-wrap:anywhere]">
                  {formatName(p.fullName)}
                </p>
                <p className="mt-0.5 line-clamp-2 min-h-[2.4em] w-full break-words text-[11px] leading-tight text-[var(--muted)]">
                  {sub || " "}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
