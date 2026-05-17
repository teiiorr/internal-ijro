import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz-latn", "uz-cyrl", "ru", "en"] as const,
  defaultLocale: "uz-latn",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
