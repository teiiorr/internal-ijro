/**
 * Only a fixed set of senior staff may create / edit / delete projects and stages.
 * Everyone else has read-only access to projects. Matched by the surname part of
 * the corporate email (`surname.name@bkrm.uz`); spelling variants (x/h) included.
 */
const PROJECT_EDITOR_SURNAMES = new Set([
  "murodxojayev",
  "yuldashev",
  "akromov",
  "bosimov",
  "bobomurodov",
  "xasanova",
  "hasanova",
  "mirzaliyev",
  "madraximov",
  "madrahimov",
  "serobov",
  "kuralov",
  "toshxodjayev",
]);

export function canEditProjects(email: string | null | undefined): boolean {
  if (!email) return false;
  const surname = email.split("@")[0]?.split(".")[0]?.toLowerCase() ?? "";
  return PROJECT_EDITOR_SURNAMES.has(surname);
}

/**
 * Money visibility. Budgets and payment sums (in figures) are shown ONLY to this
 * same fixed allowlist; everyone else sees {@link MONEY_MASK} instead. The one
 * exception is the dashboard "To'lovlar ko'rinishi" card, which keeps its own
 * broader audience (director + Moliya dept + department heads).
 */
export function canViewMoney(email: string | null | undefined): boolean {
  return canEditProjects(email);
}

/** Placeholder shown in place of any budget/amount for users without money access. */
export const MONEY_MASK = "***";
