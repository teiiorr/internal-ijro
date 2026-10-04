// Eʼlonlar uchun sof (DB'siz, server-only'siz) yordamchilar — ham server action /
// query'larda, ham mijoz komponentlarida, ham vitest'da ishlatiladi.
import { isOwner } from "@/lib/permissions/owner";

/** Server action natijasi: kutilgan xatolar throw emas, qiymat sifatida qaytadi (prod'da xabar yashirilmasligi uchun). */
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

type Actor = { id: string; position: string; email?: string | null };

/** Eʼlon yozishi mumkin boʻlgan lavozimlar (cheklovlar audience.ts → canSendToAudience'da). */
export const POST_ROLES = ["direktor", "orinbosar", "hr", "bolim_boshligi", "koordinator"] as const;
/** Koʻrilganlik roʻyxati va ovoz berganlar ismlarini koʻra oladigan lavozimlar (muallifdan tashqari). */
export const RECEIPT_ROLES = ["direktor", "orinbosar", "hr"] as const;

export function canPostAnnouncements(me: Actor): boolean {
  if (me.position === "kontragent") return false;
  return (POST_ROLES as readonly string[]).includes(me.position) || isOwner(me.email);
}

/** Tahrirlash / oʻchirish: muallif, direktor yoki platforma egasi. */
export function canManageAnnouncement(me: Actor, authorId: string | null): boolean {
  if (me.position === "kontragent") return false;
  return (!!authorId && authorId === me.id) || me.position === "direktor" || isOwner(me.email);
}

/** Koʻrilganlik (Koʻrildi X/Y), "Qayta eslatish" va ochiq soʻrovnomada ovoz berganlar: muallif, direktor, oʻrinbosar, HR, egasi. */
export function canSeeReceipts(me: Actor, authorId: string | null): boolean {
  if (me.position === "kontragent") return false;
  return (
    (!!authorId && authorId === me.id) ||
    (RECEIPT_ROLES as readonly string[]).includes(me.position) ||
    isOwner(me.email)
  );
}

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ANNOUNCEMENTS_PAGE_SIZE = 20;
export const ANNOUNCEMENT_MAX_FILE_BYTES = 30 * 1024 * 1024;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
export const REMIND_COOLDOWN_HOURS = 12;

/** "YYYY-MM-DD" shaklidagi va kalendarda mavjud sana boʻlsa true. */
export function isYmd(s: unknown): s is string {
  if (typeof s !== "string" || !YMD_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** "YYYY-MM-DD" → oʻsha kunning Toshkent boʻyicha oxiri (23:59:59.999 +05:00) sifatida timestamptz. */
export function endOfDayTashkent(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999+05:00`);
}

/** Vaqt belgisini Toshkent kalendar sanasiga ("YYYY-MM-DD") aylantiradi. */
export function tashkentYmd(d: Date | string): string {
  return new Date(new Date(d).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Bugungi sana Toshkent boʻyicha. */
export function todayTashkentYmd(now: Date = new Date()): string {
  return tashkentYmd(now);
}

/** Soʻrovnoma yopilganmi: closes_at oʻtib ketgan boʻlsa. */
export function isPollClosed(closesAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!closesAt) return false;
  return new Date(closesAt).getTime() <= now.getTime();
}

/**
 * Markdown matndan qisqa, oddiy matnli parcha yasaydi (kartalar, bildirishnomalar uchun):
 * kod bloklari, rasmlar, havola manzillari, sarlavha/roʻyxat belgilari olib tashlanadi,
 * boʻshliqlar yigʻiladi va soʻz chegarasida "…" bilan qirqiladi.
 */
export function makeExcerpt(body: string | null | undefined, max = 280): string {
  if (!body) return "";
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/(\*\*|__|~~|`)/g, "")
    .replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}

/** Soʻrovnoma variantlarini tozalaydi: boʻsh qatorlar va (registrga befarq) takrorlar olib tashlanadi. */
export function normalizePollOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const v = raw.replace(/\s+/g, " ").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export type VoteError = "no_option" | "single_choice" | "invalid_option";

/** Ovoz tanlovini tekshiradi: kamida bitta, bitta tanlovli soʻrovnomada aynan bitta, hammasi shu soʻrovnomaniki. */
export function validateVoteSelection(input: {
  multi: boolean;
  optionIds: string[];
  validOptionIds: string[];
}): VoteError | null {
  const picked = Array.from(new Set(input.optionIds));
  if (picked.length === 0) return "no_option";
  if (!input.multi && picked.length !== 1) return "single_choice";
  const valid = new Set(input.validOptionIds);
  if (!picked.every((id) => valid.has(id))) return "invalid_option";
  return null;
}

/** Foiz (butun songa yaxlitlangan); jami 0 boʻlsa 0. */
export function percent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** Massivni teng boʻlaklarga ajratadi (masalan, 200 tadan insert qilish uchun). */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Oxirgi eslatmadan beri 12 soat oʻtmagan boʻlsa true (qayta eslatish cheklovi). */
export function remindedTooRecently(lastRemindedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!lastRemindedAt) return false;
  return now.getTime() - new Date(lastRemindedAt).getTime() < REMIND_COOLDOWN_HOURS * 3600_000;
}

/** Server action xato kodi → "staffX.announcements" ichidagi tarjima kaliti. */
export const ERROR_KEYS: Record<string, string> = {
  forbidden_audience: "forbiddenAudience",
  empty_audience: "errors.emptyAudience",
  invalid_audience: "errors.invalidAudience",
  invalid_input: "errors.invalidInput",
  invalid_date: "errors.invalidDate",
  date_in_past: "errors.dateInPast",
  poll_invalid: "errors.pollInvalid",
  poll_closed: "pollClosed",
  no_poll: "errors.invalidInput",
  no_option: "errors.noOption",
  single_choice: "errors.singleChoice",
  invalid_option: "errors.invalidInput",
  file_too_large: "errors.fileTooLarge",
  file_empty: "errors.fileEmpty",
  ext_forbidden: "errors.extForbidden",
  too_soon: "tooSoon",
  forbidden: "errors.forbidden",
  not_found: "errors.notFound",
};

export function errorKey(code: string | undefined | null): string {
  return (code && ERROR_KEYS[code]) || "errors.generic";
}
