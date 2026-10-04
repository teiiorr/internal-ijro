import { z } from "zod";
import { MAX_SKILLS, MAX_SKILL_LEN, PHONE_RE, TELEGRAM_RE, normalizeSkills, normalizeTelegram } from "./logic";

// saveContactCard uchun kirish sxemasi. Alohida faylda: "use server" moduli faqat
// async funksiyalarni eksport qila oladi, sxema esa unit-testlarda ham tekshiriladi.

/** undefined → oʻzgartirilmaydi; null / "" → tozalanadi; aks holda trim qilingan qiymat. */
function optText(max: number, re?: RegExp) {
  let s = z.string().trim().max(max);
  if (re) s = s.regex(re);
  return s.nullish().transform((v) => (v === undefined ? undefined : v ? v : null));
}

export const contactCardSchema = z.object({
  userId: z.guid().optional(),
  workPhone: optText(50, PHONE_RE),
  internalExt: optText(10),
  room: optText(50),
  telegramUsername: z
    .string()
    .max(100)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v === null ? null : normalizeTelegram(v) || null))
    .refine((v) => v == null || TELEGRAM_RE.test(v), { message: "invalid_telegram" }),
  bio: optText(500),
  skills: z
    .array(z.string().trim().max(MAX_SKILL_LEN))
    .max(MAX_SKILLS)
    .optional()
    .transform((v) => (v === undefined ? undefined : normalizeSkills(v))),
  showMobile: z.boolean().optional(),
  mobile: optText(50, PHONE_RE),
});

export type ContactCardInput = z.input<typeof contactCardSchema>;
export type ContactCardData = z.output<typeof contactCardSchema>;

export type SaveContactCardResult =
  | { ok: true }
  | { ok: false; error: "invalid_telegram" | "invalid_phone" | "invalid_input" };

/** Zod xatosidan foydalanuvchiga koʻrsatiladigan xato kodini tanlaydi. */
export function cardErrorCode(paths: Array<PropertyKey | undefined>): "invalid_telegram" | "invalid_phone" | "invalid_input" {
  if (paths.includes("telegramUsername")) return "invalid_telegram";
  if (paths.includes("workPhone") || paths.includes("mobile")) return "invalid_phone";
  return "invalid_input";
}
