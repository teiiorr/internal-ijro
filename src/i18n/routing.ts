import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz-latn", "uz-cyrl", "ru"] as const,
  // "always" HAR bir URL oldiga locale qöşadi (masalan /uz-latn/login). Avvalgi
  // "as-needed" rejimi productionda çeksiz redirect halqasini keltirib çiqargan
  // — next-intl 4.12 + Next.js 16 default-locale yöllar uçun ham `x-middleware-rewrite`
  // sarlavhasini, ham asl URL'ga yönaltirilgan `Location:`'ni yuboradi, brauzerlar esa
  // buni öz-özini redirect deb qabul qiladi (ERR_TOO_MANY_REDIRECTS).
  // Doim prefiksli URL'lar bu ziddiyatni butunlay çetlab ötadi.
  localePrefix: "always",
  // Anonim taşrif buyuruvçilar (login / register / "/") standart holatda özbek
  // lotin ("O'zbek") tiliga tuşadi. Tilni faqat ilova içida (tizimga kirgandan
  // söng) almaştirish mumkin. "/" -> "/uz-latn".
  defaultLocale: "uz-latn",
});

export type AppLocale = (typeof routing.locales)[number];
