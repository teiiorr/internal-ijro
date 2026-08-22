const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const toTashkent = (d: Date) => new Date(d.getTime() + TASHKENT_OFFSET_MS);

const MONTHS: Record<string, string[]> = {
  "uz-latn": ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  "uz-cyrl": ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
};

const REL: Record<string, { overdue: string; today: string; tomorrow: string; daysLeft: string; dayUnit: string }> = {
  "uz-latn": { overdue: "Kechikdi", today: "Bugun", tomorrow: "Ertaga", daysLeft: "kun qoldi", dayUnit: "kun" },
  "uz-cyrl": { overdue: "Кечикди", today: "Бугун", tomorrow: "Эртага", daysLeft: "кун қолди", dayUnit: "кун" },
  ru: { overdue: "Просрочено", today: "Сегодня", tomorrow: "Завтра", daysLeft: "дн. осталось", dayUnit: "дн." },
};

export function formatDate(d: Date | string, locale = "uz-latn") {
  const x = toTashkent(new Date(d));
  const months = MONTHS[locale] ?? MONTHS["uz-latn"];
  return `${x.getUTCDate()}-${months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function formatDateTime(d: Date | string, locale = "uz-latn") {
  const x = toTashkent(new Date(d));
  const hh = String(x.getUTCHours()).padStart(2, "0");
  const mm = String(x.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(d, locale)}, ${hh}:${mm}`;
}

/** True when the timestamp carries a meaningful (non-midnight Tashkent) time. */
export function hasTime(d: Date | string): boolean {
  const x = toTashkent(new Date(d));
  return x.getUTCHours() !== 0 || x.getUTCMinutes() !== 0;
}

/**
 * Show the date; append the time only when one was actually set.
 * Lets date-only entries (stored at Tashkent midnight) render clean.
 */
export function formatDateMaybeTime(d: Date | string, locale = "uz-latn") {
  return hasTime(d) ? formatDateTime(d, locale) : formatDate(d, locale);
}

export function deadlineRelative(
  deadline: Date | string | null | undefined,
  opts?: { completed?: boolean },
  locale = "uz-latn",
): { text: string; tone: "default" | "soon" | "today" | "overdue" } {
  if (!deadline) return { text: "—", tone: "default" };
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return { text: "—", tone: "default" };

  const nowTz = toTashkent(new Date());
  const dTz = toTashkent(d);
  const startOfToday = Date.UTC(nowTz.getUTCFullYear(), nowTz.getUTCMonth(), nowTz.getUTCDate());
  const startOfDeadline = Date.UTC(dTz.getUTCFullYear(), dTz.getUTCMonth(), dTz.getUTCDate());
  const diffDays = Math.round((startOfDeadline - startOfToday) / 86_400_000);

  if (opts?.completed) {
    return { text: formatDate(d, locale), tone: "default" };
  }

  const l = REL[locale] ?? REL["uz-latn"];

  if (diffDays < 0) return { text: `${l.overdue} ${-diffDays} ${l.dayUnit}`, tone: "overdue" };
  if (diffDays === 0) return { text: l.today, tone: "today" };
  if (diffDays === 1) return { text: l.tomorrow, tone: "soon" };
  if (diffDays <= 3) return { text: `${diffDays} ${l.daysLeft}`, tone: "soon" };
  if (diffDays <= 14) return { text: `${diffDays} ${l.daysLeft}`, tone: "default" };
  return { text: formatDate(d, locale), tone: "default" };
}
