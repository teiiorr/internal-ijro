"use client";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconChevronDown as ChevronDown, IconLoader2 as Loader2, IconX as X } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

// Loyihalar / reestr sahifalaridagi filtr paneli bilan bir xil punktir uslub.
const FIELD =
  "h-11 w-full min-w-0 rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none";

const KEYS = ["typeId", "studioId", "curatorId"] as const;
type Key = (typeof KEYS)[number];

function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
      <span className="relative min-w-0">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD} appearance-none truncate pr-10`}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
          className={`${FIELD} inline-flex shrink-0 items-center justify-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] sm:w-auto`}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          {t("reset")}
        </button>
      )}
    </div>
  );
}
