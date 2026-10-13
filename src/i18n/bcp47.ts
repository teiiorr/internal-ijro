/**
 * Ilova tili kodi → haqiqiy BCP-47 yorlig'i.
 * "uz-latn"/"uz-cyrl"/"oz" — ilovaning ichki kodlari, ular BCP-47 emas; <html lang>,
 * Intl.DateTimeFormat va Intl.NumberFormat uchun shu yerda normallashtiriladi.
 */
export const BCP47: Record<string, string> = {
  "uz-latn": "uz-Latn",
  oz: "uz-Latn",
  "uz-cyrl": "uz-Cyrl",
  ru: "ru",
};

export function toBcp47(locale: string): string {
  return BCP47[locale] ?? "uz-Latn";
}
