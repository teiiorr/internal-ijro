// Sof formatlash yordamchilari (server va mijoz komponentlari uchun umumiy).

/** Raqam guruhlari orasidagi ingichka boʻlinmas boʻshliq (U+202F) — "120 000 000". */
const THIN_SPACE = " ";
/** Summa va valyuta orasidagi boʻlinmas boʻshliq — "UZS" alohida qatorga tushib qolmasin. */
const NBSP = " ";

export function groupThousands(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  return `${sign}${grouped}${frac && frac !== "00" ? `,${frac}` : ""}`;
}

export function formatMoney(n: number, currency: string): string {
  return `${groupThousands(n)}${NBSP}${currency}`;
}

/** 'YYYY-MM' → [yil, oy (1..12)] */
export function splitMonth(month: string): [number, number] {
  const [y, m] = month.split("-").map(Number);
  return [y || 0, m || 1];
}
