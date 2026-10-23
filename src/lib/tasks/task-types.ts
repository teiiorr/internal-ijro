// "Topşiriq turi" erkin matn: forma taklif qiladigan boşlanğiç turlar (keyin işlatilganlari qöşiladi).
export const TASK_TYPE_SEEDS = ["Xat", "Buyruq", "Bildirgi", "Majlis bayoni", "Hisobot", "Ogʻzaki topshiriq"];

/** Takliflar: avval işlatilganlar, keyin boşlanğiç turlar; takrorsiz (registrga befarq). */
export function mergeTaskTypeSuggestions(used: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...used, ...TASK_TYPE_SEEDS]) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}
