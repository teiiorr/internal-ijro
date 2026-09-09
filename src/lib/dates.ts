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
  oz: { overdue: "Keçikdi", today: "Bugun", tomorrow: "Ertaga", daysLeft: "kun qoldi", dayUnit: "kun" },
  ru: { overdue: "Просрочено", today: "Сегодня", tomorrow: "Завтра", daysLeft: "дн. осталось", dayUnit: "дн." },
};

// Nisbiy vaqt — "3 soat oldin", "1 kun oldin". SERVER'da hisoblanadi (Date.now()),
// şuning uçun mijoz gidratsiyasida nomuvofiqlik bölmaydi. 30 kundan eskisi — absolyut sana.
const AGO: Record<string, { now: string; min: (n: number) => string; hour: (n: number) => string; day: (n: number) => string }> = {
  "uz-latn": { now: "hozirgina", min: (n) => `${n} daqiqa oldin`, hour: (n) => `${n} soat oldin`, day: (n) => `${n} kun oldin` },
  "uz-cyrl": { now: "ҳозиргина", min: (n) => `${n} дақиқа олдин`, hour: (n) => `${n} соат олдин`, day: (n) => `${n} кун олдин` },
  oz: { now: "hozirgina", min: (n) => `${n} daqiqa oldin`, hour: (n) => `${n} soat oldin`, day: (n) => `${n} kun oldin` },
  ru: { now: "только что", min: (n) => `${n} мин. назад`, hour: (n) => `${n} ч. назад`, day: (n) => `${n} дн. назад` },
};

export function timeAgo(d: Date | string, locale = "uz-latn") {
  const a = AGO[locale] ?? AGO["uz-latn"];
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return a.now;
  const min = Math.floor(ms / 60000);
  if (min < 60) return a.min(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return a.hour(hr);
  const day = Math.floor(hr / 24);
  if (day < 30) return a.day(day);
  return formatDate(d, locale);
}

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

/** Timestamp mazmunli (Toşkent yarim tunidan farqli) vaqtni saqlasa, true qaytaradi. */
export function hasTime(d: Date | string): boolean {
  const x = toTashkent(new Date(d));
  return x.getUTCHours() !== 0 || x.getUTCMinutes() !== 0;
}

/**
 * Sanani körsatadi; vaqtni faqat u haqiqatan belgilangan bölsagina qöşadi.
 * Şu tariqa faqat sanadan iborat yozuvlar (Toşkent yarim tunida saqlangan) toza körinadi.
 */
export function formatDateMaybeTime(d: Date | string, locale = "uz-latn") {
  return hasTime(d) ? formatDateTime(d, locale) : formatDate(d, locale);
}

/** Chat/röyxat qatorlari uçun ixçam, Telegram uslubidagi vaqt belgisi: bugun HH:mm,
 *  tarjima qilingan "Kecha", aks holda qisqa "D-oy" sanasi. */
export function formatChatTime(d: Date | string, locale = "uz-latn") {
  const x = toTashkent(new Date(d));
  const now = toTashkent(new Date());
  const startOf = (t: Date) => Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const diffDays = Math.round((startOf(now) - startOf(x)) / 86_400_000);
  const hh = String(x.getUTCHours()).padStart(2, "0");
  const mm = String(x.getUTCMinutes()).padStart(2, "0");
  if (diffDays <= 0) return `${hh}:${mm}`;
  if (diffDays === 1) return locale === "ru" ? "Вчера" : locale === "uz-cyrl" ? "Кеча" : locale === "oz" ? "Keça" : "Kecha";
  const months = MONTHS[locale] ?? MONTHS["uz-latn"];
  return `${x.getUTCDate()}-${months[x.getUTCMonth()]}`;
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
