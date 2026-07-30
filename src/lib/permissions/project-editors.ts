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
]);

export function canEditProjects(email: string | null | undefined): boolean {
  if (!email) return false;
  const surname = email.split("@")[0]?.split(".")[0]?.toLowerCase() ?? "";
  return PROJECT_EDITOR_SURNAMES.has(surname);
}
