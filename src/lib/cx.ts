import { clsx, type ClassValue } from "clsx";

/**
 * Yengil birlashtirish (tailwind-merge'siz): BIIB primitivlari oʻz nomli sinflariga
 * tayanadi, utilita toʻqnashuvi boʻlmaydi. Toʻqnashuv yechish kerak boʻlsa `cn` ishlatiladi.
 */
export function cx(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
