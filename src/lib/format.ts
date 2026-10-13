/**
 * Locale-aware formatting helpers built on the native `Intl.*` APIs.
 *
 * These replace the hand-rolled month tables / string concatenation in
 * `src/lib/dates.ts` and the duplicated `toLocaleString("ru-RU")` calls
 * scattered across pages and components. Everything here routes locale codes
 * through {@link toBcp47}, so there is one correct locale→BCP-47 mapping.
 *
 * Design contract:
 *  - **Pure & SSR-safe.** No "use client", no "server-only" — callable from
 *    Server Components, Client Components, route handlers, scripts and tests.
 *    The only module-level state is a formatter cache (a pure memoization that
 *    produces identical results on server and client).
 *  - **Forgiving inputs.** Accept `Date | string | number` where a value is
 *    expected; `null` / `undefined` / unparseable input yield `""` so callers
 *    never have to guard before rendering.
 *  - **Tashkent dates.** Date-only values are stored at UTC midnight and mean a
 *    calendar date in Asia/Tashkent (UTC+5, no DST). Date/time formatting pins
 *    that timezone so the displayed day matches the stored day.
 */

import { toBcp47 } from "@/i18n/bcp47";

/** The timezone the app's date-only values are anchored to. */
export const APP_TIME_ZONE = "Asia/Tashkent";

/** Values accepted anywhere a date is expected. */
export type DateInput = Date | string | number | null | undefined;
/** Values accepted anywhere a number is expected. */
export type NumberInput = number | string | null | undefined;

/** Coerce a {@link DateInput} to a valid `Date`, or `null` if absent/unparseable. */
function toDate(value: DateInput): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce a {@link NumberInput} to a finite `number`, or `null` if absent/invalid. */
function toNumber(value: NumberInput): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

// ── Formatter cache ────────────────────────────────────────────────────────
// Constructing an Intl formatter is comparatively expensive; cache by a stable
// key so repeated calls (tables, long lists) reuse one instance. Pure: the key
// fully determines the formatter, so this is transparent memoization.

const dateTimeCache = new Map<string, Intl.DateTimeFormat>();
const numberCache = new Map<string, Intl.NumberFormat>();
const relativeCache = new Map<string, Intl.RelativeTimeFormat>();

function dateTimeFormatter(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = toBcp47(locale);
  const key = `${tag}|${JSON.stringify(opts)}`;
  let f = dateTimeCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(tag, opts);
    dateTimeCache.set(key, f);
  }
  return f;
}

function numberFormatter(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const tag = toBcp47(locale);
  const key = `${tag}|${JSON.stringify(opts)}`;
  let f = numberCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(tag, opts);
    numberCache.set(key, f);
  }
  return f;
}

function relativeFormatter(locale: string, opts: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
  const tag = toBcp47(locale);
  const key = `${tag}|${JSON.stringify(opts)}`;
  let f = relativeCache.get(key);
  if (!f) {
    f = new Intl.RelativeTimeFormat(tag, opts);
    relativeCache.set(key, f);
  }
  return f;
}

// ── Dates ────────────────────────────────────────────────────────────────

/**
 * Format a calendar date (no time) in the given locale, anchored to Asia/Tashkent.
 *
 * Use for stored date-only values (deadlines, planned dates) that live at UTC
 * midnight: the Tashkent timezone makes the rendered day match the stored day.
 *
 * @param d Date, ISO string, epoch ms, or `null`/`undefined`.
 * @param locale App locale code ("uz-latn" | "uz-cyrl" | "oz" | "ru").
 * @param opts Optional `Intl.DateTimeFormatOptions` overrides (merged over the
 *   `{ day, month: "long", year }` default; `timeZone` defaults to Tashkent).
 * @returns Localized date string, or `""` when the input is absent/invalid.
 *
 * @example
 * formatDate("2026-01-15T00:00:00Z", "uz-latn"); // "15-yanvar, 2026"
 * formatDate("2026-01-15T00:00:00Z", "ru");      // "15 января 2026 г."
 */
export function formatDate(d: DateInput, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = toDate(d);
  if (!date) return "";
  // `dateStyle`/`timeStyle` presets cannot be combined with individual
  // component options, so when a caller opts into a preset we drop our
  // day/month/year defaults and keep only the timezone anchor.
  const usesPreset = opts != null && ("dateStyle" in opts || "timeStyle" in opts);
  const base: Intl.DateTimeFormatOptions = usesPreset
    ? { timeZone: APP_TIME_ZONE }
    : { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" };
  return dateTimeFormatter(locale, { ...base, ...opts }).format(date);
}

/**
 * Format a date together with its time (24-hour) in the given locale, anchored
 * to Asia/Tashkent. Use for timestamps that carry a meaningful time of day.
 *
 * @param d Date, ISO string, epoch ms, or `null`/`undefined`.
 * @param locale App locale code.
 * @returns Localized date+time string, or `""` when the input is absent/invalid.
 *
 * @example
 * formatDateTime("2026-01-15T09:30:00Z", "uz-latn"); // "15-yanvar, 2026, 14:30"
 */
export function formatDateTime(d: DateInput, locale: string): string {
  const date = toDate(d);
  if (!date) return "";
  return dateTimeFormatter(locale, {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// ── Relative time ──────────────────────────────────────────────────────────

/**
 * Format a day offset as localized relative time via `Intl.RelativeTimeFormat`.
 *
 * Positive = future, negative = past. With `numeric: "auto"` the formatter
 * produces idiomatic words where the locale has them ("tomorrow", "вчера").
 *
 * @param days Whole-day offset from "now" (e.g. `-3`, `0`, `1`), or
 *   `null`/`undefined`. Non-integers are rounded toward zero.
 * @param locale App locale code.
 * @returns Localized relative-time string, or `""` when `days` is absent/invalid.
 *
 * @example
 * formatRelativeDays(-3, "ru");      // "3 дня назад"
 * formatRelativeDays(1, "uz-latn");  // "ertaga"
 */
export function formatRelativeDays(days: number | null | undefined, locale: string): string {
  if (days == null || !Number.isFinite(days)) return "";
  return relativeFormatter(locale, { numeric: "auto" }).format(Math.trunc(days), "day");
}

// ── Numbers & currency ───────────────────────────────────────────────────

/**
 * Format a number with locale-aware grouping and decimal separators.
 *
 * @param n Number, numeric string, or `null`/`undefined`.
 * @param locale App locale code.
 * @param opts Optional `Intl.NumberFormatOptions` overrides.
 * @returns Localized number string, or `""` when the input is absent/invalid.
 *
 * @example
 * formatNumber(1234567.89, "ru"); // "1 234 567,89"
 */
export function formatNumber(n: NumberInput, locale: string, opts?: Intl.NumberFormatOptions): string {
  const num = toNumber(n);
  if (num == null) return "";
  return numberFormatter(locale, { ...opts }).format(num);
}

/**
 * Format a monetary amount with its currency, locale-aware.
 *
 * Replaces the hardcoded `` `${n.toLocaleString("ru-RU")} UZS` `` pattern. The
 * currency symbol/placement follows the locale (e.g. UZS renders as "soʻm" in
 * Uzbek, "UZS" in Russian).
 *
 * @param amount Number, numeric string, or `null`/`undefined`.
 * @param locale App locale code.
 * @param currency ISO 4217 currency code; defaults to "UZS".
 * @param opts Optional `Intl.NumberFormatOptions` overrides (e.g. to drop the
 *   fraction digits via `{ maximumFractionDigits: 0 }`).
 * @returns Localized currency string, or `""` when the amount is absent/invalid.
 *
 * @example
 * formatCurrency(1234567, "uz-latn"); // "1 234 567,00 soʻm"
 * formatCurrency(1234567, "ru");      // "1 234 567,00 UZS"
 */
export function formatCurrency(
  amount: NumberInput,
  locale: string,
  currency = "UZS",
  opts?: Intl.NumberFormatOptions,
): string {
  const num = toNumber(amount);
  if (num == null) return "";
  return numberFormatter(locale, { style: "currency", currency, ...opts }).format(num);
}

// ── Enum labels ────────────────────────────────────────────────────────────

/** Minimal shape of a next-intl translator (`useTranslations` / `getTranslations`). */
type NextIntlTranslator = (key: string, values?: Record<string, unknown>) => string;

/**
 * Convention helper for localizing an enum value (status / priority / type)
 * through next-intl message keys.
 *
 * Store enum labels under a flat namespace in the message files, keyed by the
 * raw enum value, e.g.:
 *
 * ```jsonc
 * // messages/<locale>.json
 * "status": { "IN_PROGRESS": "В работе", "DONE": "Готово" }
 * ```
 *
 * and resolve them at a call site that already has a translator:
 *
 * ```ts
 * const t = useTranslations();              // or getTranslations() on the server
 * tEnum(t, "status", task.status);          // -> "В работе"
 * ```
 *
 * Returns `""` for a nullish value instead of throwing, so optional enum
 * columns render cleanly.
 *
 * @param t A next-intl translator bound to the root (so `namespace.key` resolves).
 * @param namespace Message namespace holding the enum labels (e.g. "status").
 * @param key The raw enum value, or `null`/`undefined`.
 */
export function tEnum(
  t: NextIntlTranslator,
  namespace: string,
  key: string | null | undefined,
): string {
  if (!key) return "";
  return t(`${namespace}.${key}`);
}
