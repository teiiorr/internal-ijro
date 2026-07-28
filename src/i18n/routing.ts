import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz-latn", "uz-cyrl", "ru"] as const,
  // "always" prefixes EVERY URL with the locale (eg /uz-latn/login). The
  // previous "as-needed" mode caused an infinite redirect loop in production
  // — next-intl 4.12 + Next.js 16 emit both an `x-middleware-rewrite` header
  // AND a `Location:` set to the original URL for default-locale paths,
  // which browsers honour as a self-redirect (ERR_TOO_MANY_REDIRECTS).
  // Always-prefixed URLs sidestep that interaction entirely.
  localePrefix: "always",
  // Anonymous visitors (login / register / "/") land on Uzbek Latin ("O'zbek")
  // by default. Language can be switched only inside the app (after login).
  // "/" -> "/uz-latn".
  defaultLocale: "uz-latn",
});

export type AppLocale = (typeof routing.locales)[number];
