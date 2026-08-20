"use client";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition, useEffect, useRef, useState } from "react";
import { routing, type AppLocale } from "@/i18n/routing";
import { IconCheck as Check } from "@tabler/icons-react";

const LANG: Record<string, { flag: string; label: string }> = {
  "uz-latn": { flag: "🇺🇿", label: "Lotin" },
  "uz-cyrl": { flag: "🇺🇿", label: "Кирилл" },
  ru:        { flag: "🇷🇺", label: "Русский" },
};

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function switchTo(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    const qs = searchParams?.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { locale: next });
    });
  }

  const current = LANG[locale] ?? LANG["uz-latn"];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold hover:bg-[var(--glass-fill)] transition-colors"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-[13px]">{current.label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-xl z-[100]"
        >
          {routing.locales.map((l) => {
            const lang = LANG[l] ?? { flag: "🌐", label: l };
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={l === locale}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[var(--glass-fill)] transition-colors"
                onClick={() => switchTo(l as AppLocale)}
              >
                <span className="text-lg leading-none">{lang.flag}</span>
                <span className="flex-1">{lang.label}</span>
                {l === locale && <Check className="size-4 text-[var(--primary)]" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
