"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useTransition } from "react";
import { IconChevronDown as ChevronDown, IconSearch as Search, IconFilter as Filter } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// Havodor punktir uslubidagi element — fayl taşlash maydoni bilan bir xil uslubda.
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
 * Real vaqt rejimida işlaydigan loyihalar filtri paneli ("Qöllash" tugmasisiz): har bir
 * özgariş URL ni yangilaydi, bu esa röyxatni serverda qaytadan render qiladi. "stage" röyxati
 * tanlangan turga boğliq va tur tanlanmaguncha nofaol turadi.
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
  // Mobil'da barcha filtrlar bitta "Filtrlar" tugmasi ostiga yiğiladi.
  const [open, setOpen] = useState(false);
  const activeCount = [typeId, stage, payment, overdue ? "1" : "", sort && sort !== "created" ? sort : ""].filter(Boolean).length;

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  // Qidiruv maydonini debounce qilamiz — foydalanuvçi yozişni töxtatgandan söng ötamiz.
  useEffect(() => {
    if (search === searchParam) return;
    const id = setTimeout(() => push({ search: search || null }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stageOpts = typeId ? stagesByType[typeId] ?? [] : [];

  return (
    <div className="space-y-2">
      {/* Qidiruv — doim körinadi */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("projects.searchPlaceholder")}
          className="h-11 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent pl-10 pr-3.5 text-sm font-medium text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      {/* Mobil'da bitta "Filtrlar" tugmasi — bosilganda barcha selektlar chiqadi */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${FIELD} flex items-center justify-between sm:hidden`}
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="size-4 text-[var(--muted)]" />
          {t("projects.filters.title")}
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-bold text-white tabular-nums">{activeCount}</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 text-[var(--muted)] transition-transform", open && "rotate-180")} />
      </button>

      {/* Selektlar: mobil'da yopiq bo'lsa yashiringan; sm+ da doim ko'rinadi (tör) */}
      <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", !open && "hidden sm:grid")}>
        {/* Tur tanlanganda bosqiç ham tozalanadi (variantlar turga boğliq). */}
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
    </div>
  );
}
