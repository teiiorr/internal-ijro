"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconChevronDown as ChevronDown,
  IconFilter as Filter,
  IconSearch as Search,
  IconX as X,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

// Loyihalar sahifasidagi filtr paneli bilan bir xil BIIB maydon uslubi.
const FIELD =
  "h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 text-sm font-medium text-[var(--ink)] transition-colors focus:border-[var(--line-strong)] focus:outline-none";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const FILTER_KEYS = ["status", "studioId", "projectId", "typeId", "from", "to", "contract", "sort"] as const;

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
        className={`${FIELD} appearance-none truncate pr-10`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
    </div>
  );
}

/**
 * Reestr filtrlari ("Qoʻllash" tugmasisiz): har bir oʻzgarish URL'ni yangilaydi va
 * server sahifani qayta render qiladi (filtrlash SQL'da). Har qanday oʻzgarish
 * sahifalashni birinchi sahifaga qaytaradi.
 */
export function RegisterFiltersBar({
  studios,
  projects,
  types,
}: {
  studios: Opt[];
  projects: (Opt & { studioId: string | null })[];
  types: Opt[];
}) {
  const t = useTranslations("staffX.paymentsRegister");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [contract, setContract] = useState(params.get("contract") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kechiktirilgan qidiruv komponent yopilgandan keyin (masalan, boshqa tabga oʻtilganda)
  // URL'ni eski parametrlar bilan qayta yozib yubormasin.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const status = params.get("status") ?? "";
  const studioId = params.get("studioId") ?? "";
  const projectId = params.get("projectId") ?? "";
  const typeId = params.get("typeId") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const sort = params.get("sort") ?? "date";
  const activeCount = [status, studioId, projectId, typeId, from, to, sort !== "date" ? sort : ""].filter(Boolean).length;
  const hasAny = activeCount > 0 || !!params.get("contract");

  function replace(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  /** Joriy URL parametrlari (kechiktirilgan chaqiruvlarda render vaqtidagi eski `params` emas). */
  function liveParams(): URLSearchParams {
    return new URLSearchParams(typeof window !== "undefined" ? window.location.search : params.toString());
  }

  function push(patch: Record<string, string | null>) {
    const next = liveParams();
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    replace(next);
  }

  function onContractChange(v: string) {
    setContract(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ contract: v.trim() || null }), 400);
  }

  function onMonth(key: "from" | "to", v: string) {
    if (v === "" || MONTH_RE.test(v)) push({ [key]: v || null });
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setContract("");
    const next = liveParams();
    for (const k of FILTER_KEYS) next.delete(k);
    replace(next);
  }

  // Studiya tanlansa, loyihalar roʻyxati shu studiyaga toraytiriladi.
  const projectOpts = studioId ? projects.filter((p) => p.studioId === studioId) : projects;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={contract}
            onChange={(e) => onContractChange(e.target.value)}
            placeholder={t("contractSearch")}
            aria-label={t("contractSearch")}
            className={`${FIELD} pl-10 placeholder:text-[var(--muted)]`}
          />
        </div>
        {hasAny && (
          <button
            type="button"
            onClick={reset}
            className={`${FIELD} hidden w-auto shrink-0 items-center justify-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] sm:inline-flex`}
          >
            <X className="size-4" />
            {t("reset")}
          </button>
        )}
      </div>

      {/* Mobil'da selektlar bitta "Filtrlar" tugmasi ostiga yigʻiladi */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${FIELD} flex items-center justify-between sm:hidden`}
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="size-4 text-[var(--ink-3)]" />
          {t("filters")}
          {activeCount > 0 && (
            <span className="t-micro tabular-nums text-[var(--tint)]">{activeCount}</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 text-[var(--muted)] transition-transform", open && "rotate-180")} />
      </button>

      <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4", !open && "hidden sm:grid")}>
        <Sel label={t("status")} value={status} onChange={(v) => push({ status: v || null })}>
          <option value="">{t("allStatuses")}</option>
          <option value="paid">{t("paid")}</option>
          <option value="pending">{t("pending")}</option>
        </Sel>

        <Sel
          label={t("studio")}
          value={studioId}
          onChange={(v) => {
            // Tanlangan loyiha yangi studiyaga tegishli boʻlmasa, uni ham tozalaymiz.
            const keepProject = !v || projects.some((p) => p.id === projectId && p.studioId === v);
            push({ studioId: v || null, projectId: keepProject ? projectId || null : null });
          }}
        >
          <option value="">{t("allStudios")}</option>
          {studios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Sel>

        <Sel label={t("project")} value={projectId} onChange={(v) => push({ projectId: v || null })}>
          <option value="">{t("allProjects")}</option>
          {projectOpts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Sel>

        <Sel label={t("type")} value={typeId} onChange={(v) => push({ typeId: v || null })}>
          <option value="">{t("allTypes")}</option>
          {types.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.name}
            </option>
          ))}
        </Sel>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--muted)]">{t("fromMonth")}</span>
          {/* Boshqarilmaydigan input + key: brauzer oy tanlagichi boʻlmasa ham (Safari) yozish mumkin. */}
          <input
            key={`from-${from}`}
            type="month"
            defaultValue={from}
            max={to || undefined}
            placeholder="YYYY-MM"
            onChange={(e) => onMonth("from", e.target.value)}
            className={FIELD}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--muted)]">{t("toMonth")}</span>
          <input
            key={`to-${to}`}
            type="month"
            defaultValue={to}
            min={from || undefined}
            placeholder="YYYY-MM"
            onChange={(e) => onMonth("to", e.target.value)}
            className={FIELD}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 lg:col-span-2">
          <span className="text-xs font-semibold text-[var(--muted)]">{t("sort")}</span>
          <Sel label={t("sort")} value={sort} onChange={(v) => push({ sort: v === "date" ? null : v })}>
            <option value="date">{t("sortDate")}</option>
            <option value="amount">{t("sortAmount")}</option>
            <option value="project">{t("sortProject")}</option>
          </Sel>
        </label>

        {hasAny && (
          <button
            type="button"
            onClick={reset}
            className={`${FIELD} inline-flex items-center justify-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] sm:hidden`}
          >
            <X className="size-4" />
            {t("reset")}
          </button>
        )}
      </div>
    </div>
  );
}
