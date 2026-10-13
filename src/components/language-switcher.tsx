"use client";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition, useEffect, useRef, useState } from "react";
import { routing, type AppLocale } from "@/i18n/routing";
import { IconCheck as Check } from "@tabler/icons-react";
import { updateProfilePreferences } from "@/server/actions/settings";
import { Button } from "@/components/ui-biib/Button";
import { Status } from "@/components/ui-biib/Status";
import type { ReactNode } from "react";

const LANG: Record<string, { flag: string; label: ReactNode }> = {
  "uz-latn": { flag: "🇺🇿", label: "Lotin" },
  "uz-cyrl": { flag: "🇺🇿", label: "Кирилл" },
  oz: {
    flag: "🇺🇿",
    label: (
      <span className="inline-flex w-full items-center gap-2">
        Özbekça
        <Status tone="info" className="ml-auto">Yangi</Status>
      </span>
    ),
  },
  ru: { flag: "🇷🇺", label: "Русский" },
};

/**
 * Til tanlagich — ikki bosqichli: avval tilni tanlaysiz (belgilanadi), soʻng «Tasdiqlash».
 * Tanlov 1 yillik `NEXT_LOCALE` kukisiga (routing.localeCookie) va DB'dagi languagePreference'ga
 * yoziladi — brauzer qayta ochilsa ham, qurilma almashsa ham til eslab qolinadi. Staff va
 * studiya portallari bitta Header orqali shu komponentdan foydalanadi.
 */
export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AppLocale>(locale as AppLocale);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function toggleMenu() {
    setSelected(locale as AppLocale); // kutilayotgan tanlovni joriy tilga qaytaramiz
    setOpen((v) => !v);
  }

  function confirm() {
    setOpen(false);
    if (selected === locale) return;
    const qs = searchParams?.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { locale: selected });
      void updateProfilePreferences({ languagePreference: selected }).catch(() => {});
    });
  }

  const current = LANG[locale] ?? LANG["uz-latn"];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleMenu}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
      >
        <span className="text-xl sm:text-2xl leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-[13px]">{current.label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-overlay)] z-[100]"
        >
          {routing.locales.map((l) => {
            const lang = LANG[l] ?? { flag: "🌐", label: l };
            const picked = l === selected;
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={picked}
                className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
                onClick={() => setSelected(l as AppLocale)}
              >
                <span className="text-lg leading-none">{lang.flag}</span>
                <span className="flex-1">{lang.label}</span>
                {picked && <Check className="size-4 text-[var(--tint)]" aria-hidden />}
              </button>
            );
          })}
          <div className="mt-1.5 flex items-center justify-end gap-2 border-t border-[var(--line)] px-1 pt-2">
            <Button variant="ghost" size="40" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" size="40" onClick={confirm} disabled={selected === locale || isPending}>
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
