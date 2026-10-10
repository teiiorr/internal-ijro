"use client";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconChevronDown as ChevronDown, IconLoader2 as Loader2, IconX as X } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

// BIIB boshqaruv: qattiq chegara (--line-strong), radius-control, oyna emas (filtr paneli).
const FIELD =
  "h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 t-body text-[var(--ink)] transition-colors focus:border-[var(--tint)] focus:outline-none";

const KEYS = ["typeId", "studioId", "curatorId"] as const;
type Key = (typeof KEYS)[number];

function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="t-micro text-[var(--ink-2)]">{label}</span>
      <span className="relative min-w-0">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD} appearance-none truncate pr-10`}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" />
      </span>
    </label>
  );
}

/** Tur / studiya / kurator filtrlari — har bir oʻzgarish URL'ni yangilaydi, server sahifani qayta hisoblaydi. */
export function SlippageFilters({ types, studios, curators }: { types: Opt[]; studios: Opt[]; curators: Opt[] }) {
  const t = useTranslations("staffX.deadlineSlippage.filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const value = (k: Key) => params.get(k) ?? "";
  const hasAny = KEYS.some((k) => !!params.get(k));

  function apply(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function set(k: Key, v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    apply(next);
  }

  function reset() {
    const next = new URLSearchParams(params.toString());
    for (const k of KEYS) next.delete(k);
    apply(next);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
      <div className={cn("grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3", pending && "opacity-70")}>
        <Sel label={t("type")} value={value("typeId")} onChange={(v) => set("typeId", v)}>
          <option value="">{t("allTypes")}</option>
          {types.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Sel>
        <Sel label={t("studio")} value={value("studioId")} onChange={(v) => set("studioId", v)}>
          <option value="">{t("allStudios")}</option>
          {studios.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Sel>
        <Sel label={t("curator")} value={value("curatorId")} onChange={(v) => set("curatorId", v)}>
          <option value="">{t("allCurators")}</option>
          {curators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Sel>
      </div>
      {(hasAny || pending) && (
        <button
          type="button"
          onClick={reset}
          disabled={!hasAny}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-3.5 t-label text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-50 sm:w-auto"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          {t("reset")}
        </button>
      )}
    </div>
  );
}
