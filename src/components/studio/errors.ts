// Server action xato kodlarini tarjima kalitiga aylantiradi (noma'lum → umumiy xabar).
const KNOWN = new Set([
  "forbidden",
  "stage_not_active",
  "stage_completed",
  "already_pending",
  "deadline_in_past",
  "deadline_not_later",
  "already_decided",
]);

export function studioErrorKey(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  return KNOWN.has(msg) ? `studio.errors.${msg}` : "studio.errors.generic";
}
