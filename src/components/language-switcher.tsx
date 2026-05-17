"use client";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { Button } from "./ui/button";
import * as React from "react";

const LABEL: Record<string, string> = {
  "uz-latn": "O'zbek",
  "uz-cyrl": "Ўзбек",
  ru: "Русский",
  en: "English",
};

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
        <Globe className="size-4" />
        <span className="hidden sm:inline">{LABEL[locale]}</span>
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border bg-[var(--popover)] p-1 shadow-md z-50">
          {routing.locales.map((l) => (
            <button
              key={l}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--accent)]"
              onClick={() => {
                setOpen(false);
                router.replace(pathname, { locale: l });
              }}
            >
              {LABEL[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
