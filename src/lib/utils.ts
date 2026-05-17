import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null | undefined, locale = "ru-RU") {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
