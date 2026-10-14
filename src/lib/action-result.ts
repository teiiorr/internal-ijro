/**
 * Server action natijasining YAGONA shartnomasi — muvaffaqiyat (+ ixtiyoriy payload)
 * yoki kutilgan xato kodi. Kutilgan xatolar (huquq yo'q, noto'g'ri kiritish, cheklov)
 * `throw` emas, shu qiymat sifatida qaytarilishi kerak: prod build'da Next server
 * action'dan tashlangan Error xabarini yashiradi, shuning uchun `throw new Error("code")`
 * + client'da `(err as Error).message` — prod'da bo'sh/umumiy xabar beradi.
 *
 * Toza modul (server-only emas) — ham server action, ham client komponent import qiladi.
 * Ilgari bu tur ikki komponent faylida dublikat edi (va server komponentlardan import
 * qilardi — qatlam buzilishi); endi yagona manba shu yerda.
 */
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Muvaffaqiyatli natija (ixtiyoriy payload bilan). */
export function ok<T extends object = object>(data?: T): ActionResult<T> {
  return { ok: true, ...(data ?? ({} as T)) };
}

/** Kutilgan xato — `code` client tomonda lokalizatsiya kaliti sifatida ishlatiladi. */
export function err(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
