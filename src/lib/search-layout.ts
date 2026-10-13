// Klaviatura joylashuvini sezmaydigan qidiruv: foydalanuvchi notoʻgʻri tilda yozsa ham
// (masalan RU ЙЦУКЕН'da "еушшщк" = US QWERTY'dagi "teiior") baribir topiladi.
// Bir xil fizik tugma RU<->US orasida almashtiriladi. Barcha qidiruv maydonlari uchun.

const LAT_TO_CYR: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ", p: "з", "[": "х", "]": "ъ",
  a: "ф", s: "ы", d: "в", f: "а", g: "п", h: "р", j: "о", k: "л", l: "д", ";": "ж", "'": "э",
  z: "я", x: "ч", c: "с", v: "м", b: "и", n: "т", m: "ь", ",": "б", ".": "ю", "/": ".", "`": "ё",
};
const CYR_TO_LAT: Record<string, string> = Object.fromEntries(
  Object.entries(LAT_TO_CYR).map(([lat, cyr]) => [cyr, lat]),
);

/** Har bir belgini qarama-qarshi klaviatura joylashuviga oʻtkazadi (RU<->US). */
export function swapKeyboardLayout(s: string): string {
  let out = "";
  for (const ch of s) {
    const lower = ch.toLowerCase();
    out += LAT_TO_CYR[lower] ?? CYR_TO_LAT[lower] ?? ch;
  }
  return out;
}

/** Qidiruv variantlari: asl + joylashuvi almashtirilgani (agar farq qilsa). Hammasi kichik harf. */
export function queryVariants(q: string): string[] {
  const base = q.toLowerCase().trim();
  if (!base) return [];
  const swapped = swapKeyboardLayout(base);
  return swapped !== base ? [base, swapped] : [base];
}

/** Matn qidiruvga mos keladimi — har ikki klaviatura joylashuvida ham tekshiradi. */
export function matchesLayoutQuery(haystack: string, query: string): boolean {
  const h = haystack.toLowerCase();
  return queryVariants(query).some((v) => h.includes(v));
}
