/** Content genres for a project (mainly for "Eksklyuziv loyihalar", whose
 *  pipeline type doesn't say whether it's a film, a book, a cartoon, etc.).
 *  Labels live under i18n `projects.genre.<code>`. */
export const PROJECT_GENRES = [
  "film",
  "multserial",
  "serial",
  "kitob",
  "anime",
  "spektakl",
  "teledastur",
  "oyin",
  "dublyaj",
  "boshqa",
] as const;

export type ProjectGenre = (typeof PROJECT_GENRES)[number];

export function isProjectGenre(v: string | null | undefined): v is ProjectGenre {
  return !!v && (PROJECT_GENRES as readonly string[]).includes(v);
}
