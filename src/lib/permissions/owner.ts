/**
 * Platform owner(s). They are treated as directors (top role → all capabilities)
 * and get a personalized greeting on the dashboard. Keyed by email so it survives
 * account rebuilds. Pure module (no DB / no server-only) — safe to import anywhere.
 */
export const OWNER_EMAILS = ["murodxojayev.baxtiyorxoja@bkrm.uz"];

/** Honorific shown after the owner's name in the dashboard greeting. */
export const OWNER_TITLE = "The Godfather";

export function isOwner(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.trim().toLowerCase());
}
