/** Loyihaning kontent janri (asosan «Eksklyuziv loyihalar» uçun, çunki bu
 *  turdagi loyihaning pipeline turi uni film, kitob, multfilm va hokazolardan
 *  ajratmaydi). Yorliqlar i18n `projects.genre.<code>` ostida saqlanadi. */
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
