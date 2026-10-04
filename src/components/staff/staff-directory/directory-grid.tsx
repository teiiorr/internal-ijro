"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconFilterOff, IconSearch, IconUserSearch, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { PersonRow } from "./logic";
import { PersonCard } from "./person-card";

export type DirectoryFilterState = { q: string; departmentId: string | null; skill: string | null };

const ALL = "__all__";

function buildHref(pathname: string, f: DirectoryFilterState): string {
  const p = new URLSearchParams();
  p.set("tab", "malumotnoma");
  if (f.q) p.set("q", f.q);
  if (f.departmentId) p.set("departmentId", f.departmentId);
  if (f.skill) p.set("skill", f.skill);
  return `${pathname}?${p.toString()}`;
}

/** Xodimlar maʼlumotnomasi: qidiruv (URL ?q, debounce), boʻlim tanlovi, koʻnikma chiplari va kartalar toʻri. */
export function DirectoryGrid({
  people,
  departments,
  skills,
  current,
}: {
  people: PersonRow[];
  departments: Array<{ id: string; name: string; depth: number }>;
  skills: string[];
  current: DirectoryFilterState;
}) {
  const t = useTranslations("staffX.staffDirectory");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(current.q);

  // Oxirgi soʻralgan filtrlar (server javobi hali kelmagan boʻlishi mumkin). Debounce taymeri
  // shu holatdan oladi — aks holda kechikkan taymer eski boʻlim/koʻnikma filtrini qaytarib qoʻyadi.
  const requested = useRef<DirectoryFilterState>(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { q: curQ, departmentId: curDept, skill: curSkill } = current;
  useEffect(() => {
    // Server tasdiqlagan holat (masalan, brauzerda "orqaga") — keyingi soʻrovlar uchun asos.
    requested.current = { q: curQ, departmentId: curDept, skill: curSkill };
  }, [curQ, curDept, curSkill]);
  // Unmount: kutilayotgan qidiruv taymeri foydalanuvchini /tuzilma ga qaytarmasligi kerak.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function cancelPending() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function push(next: DirectoryFilterState) {
    requested.current = next;
    startTransition(() => router.replace(buildHref(pathname, next), { scroll: false }));
  }

  function navigate(patch: Partial<DirectoryFilterState>) {
    cancelPending();
    push({ ...requested.current, q: text.trim(), ...patch });
  }

  // Qidiruv maydoni: yozish toʻxtagach 300 ms dan soʻng URL yangilanadi.
  function onSearchChange(value: string) {
    setText(value);
    cancelPending();
    timer.current = setTimeout(() => {
      timer.current = null;
      const q = value.trim();
      if (q !== requested.current.q) push({ ...requested.current, q });
    }, 300);
  }

  const skillChips = current.skill && !skills.includes(current.skill) ? [current.skill, ...skills] : skills;
  const hasFilters = !!(current.q || current.departmentId || current.skill || text.trim());

  function clearAll() {
    setText("");
    navigate({ q: "", departmentId: null, skill: null });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <IconSearch
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[var(--subtle)]"
            aria-hidden
          />
          <Input
            type="search"
            value={text}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            maxLength={100}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-64 sm:shrink-0">
          <Select
            value={current.departmentId ?? ALL}
            onValueChange={(v) => navigate({ departmentId: v === ALL ? null : v })}
          >
            <SelectTrigger aria-label={t("allDepartments")}>
              <SelectValue placeholder={t("allDepartments")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allDepartments")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id} style={{ paddingLeft: `${36 + Math.min(d.depth, 6) * 12}px` }}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {skillChips.length > 0 && (
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
          role="group"
          aria-label={t("skills")}
        >
          {skillChips.map((s) => {
            const active = current.skill === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => navigate({ skill: active ? null : s })}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {s}
                {active && <IconX className="size-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--muted)] tabular" aria-live="polite">
          {t("members", { count: people.length })}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)]"
          >
            <IconFilterOff className="size-4" aria-hidden />
            {t("clearFilters")}
          </button>
        )}
      </div>

      {people.length === 0 ? (
        <Card>
          <EmptyState icon={IconUserSearch} title={t("empty")} description={t("emptyHint")} />
        </Card>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
            pending && "opacity-60"
          )}
          aria-busy={pending}
        >
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      )}
      <span className="sr-only">{pending ? tc("loading") : ""}</span>
    </div>
  );
}
