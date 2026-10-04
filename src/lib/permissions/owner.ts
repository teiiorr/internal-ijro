/**
 * Platforma egasi(lari). Ular direktor sifatida qaraladi (eng yuqori rol → barça
 * qobiliyatlar) va boşqaruv panelida şaxsiylaştirilgan salomlaşuv oladi. Email
 * böyiça kalitlanadi, şuning uçun akkaunt qayta qurilsa ham saqlanib qoladi. Sof
 * modul (DB yöq / server-only yöq) — istalgan joyda import qiliş xavfsiz.
 */
export const OWNER_EMAILS = ["murodxojayev.baxtiyorxoja@bkrm.uz"];

/** Boşqaruv panelidagi salomlaşuvda egasining ismidan keyin körsatiladigan sharafli unvon. */
export const OWNER_TITLE = "The Godfather";

export function isOwner(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Ruxsatlar uçun amaldagi lavozim. Egasi bazada öz haqiqiy lavozimi bilan saqlanadi va
 * hamma joyda şunday körsatiladi (masalan, Tahlil bölimi mutaxassisi), biroq platforma
 * yaratuvçisi sifatida sessiyada direktor huquqlarini oladi — barça funksiyalar oçiq qoladi.
 */
export function effectivePosition<P extends string>(email: string | null | undefined, position: P): P | "direktor" {
  return isOwner(email) ? "direktor" : position;
}
