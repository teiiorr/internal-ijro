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
