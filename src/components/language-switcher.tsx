"use client";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition, useEffect, useRef, useState } from "react";
import { routing, type AppLocale } from "@/i18n/routing";
import { Globe, Check } from "lucide-react";
import { Button } from "./ui/button";

const LABEL: Record<string, string> = {
  "uz-latn": "O'zbek",
  "uz-cyrl": "Ўзбек",
  ru: "Русский",
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
    // NOTE: do NOT call router.refresh() here. next-intl performs the locale
    // switch as a soft navigation via router.replace(); a refresh() fired in
    // the same transition re-fetches the CURRENT url and cancels the pending
    // locale navigation, so the language never actually changes.
    startTransition(() => {
      router.replace(href, { locale: next });
    });
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="size-4" />
        <span className="hidden sm:inline">{LABEL[locale]}</span>
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-2xl border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-xl z-[100]"
        >
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[var(--glass-fill)] transition-colors"
              onClick={() => switchTo(l as AppLocale)}
            >
              <span>{LABEL[l]}</span>
              {l === locale && <Check className="size-4 text-[var(--primary)]" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
