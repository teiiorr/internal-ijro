/**
 * App locale → BCP-47 language tag conversion.
 *
 * The app's internal locale codes ("uz-latn", "uz-cyrl", "oz", "ru") are NOT
 * valid BCP-47 tags that the `Intl.*` APIs understand. This module is the single
 * source of truth for mapping them onto the tags ICU actually knows, so the
 * conversion is not re-invented (and quietly diverged) at every call site.
 *
 * Notes:
 *  - "oz" is the new Uzbek Latin alphabet (ö, ğ, ş, ç). ICU has no distinct tag
 *    for it, so — like `routing.ts` treats it — it collapses onto "uz-Latn".
 *  - This file is pure and SSR-safe: no "use client", no "server-only", no I/O.
 */

/** The BCP-47 tags this app emits for `Intl.*`. */
export type Bcp47 = "uz-Latn" | "uz-Cyrl" | "ru";

/**
 * Convert an internal app locale code to a BCP-47 tag for the `Intl.*` APIs.
 *
 * @param locale One of the app locales ("uz-latn" | "uz-cyrl" | "oz" | "ru"),
 *   or any string. Unknown values fall back to the default "uz-Latn".
 * @returns A BCP-47 tag: "uz-Latn", "uz-Cyrl", or "ru".
 *
 * @example
 * toBcp47("ru");       // "ru"
 * toBcp47("uz-cyrl");  // "uz-Cyrl"
 * toBcp47("oz");       // "uz-Latn"
 */
export function toBcp47(locale: string): Bcp47 {
  switch (locale) {
    case "ru":
      return "ru";
    case "uz-cyrl":
      return "uz-Cyrl";
    case "uz-latn":
    case "oz":
    default:
      return "uz-Latn";
  }
}
