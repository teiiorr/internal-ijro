/**
 * Loyihaning umumiy bajariliş foizini hisoblovçi sof (pure) funksiya.
 *
 * overallProgress(stages) =
 *   stages.length === 0
 *     ? 0
 *     : round( Σ(stage.progress × stage.weight) / Σ(stage.weight) )
 *
 * Funksiya bexatar qabul qiladigan holatlar (invariantlar):
 *   - boş röyxat → 0
 *   - stage.progress 0..100 oraliğidan çiqsa → örtaçani hisoblaşdan oldin çegaralanadi
 *   - stage.weight <= 0 bölsa → 1 deb qabul qilinadi (himoya çorasi; server action'lar ham buni rad etişi kerak)
 *   - çekli bölmagan (Infinity/NaN) sonlar → 0/1 ga keltiriladi
 * Natija hamişa [0, 100] oraliğidagi butun son böladi.
 */
export type StageInput = { progress: number | null | undefined; weight: number | null | undefined };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function overallProgress(stages: StageInput[]): number {
  if (!stages || stages.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of stages) {
    const rawW = typeof s.weight === "number" && Number.isFinite(s.weight) ? s.weight : 1;
    const w = rawW > 0 ? rawW : 1;
    const rawP = typeof s.progress === "number" && Number.isFinite(s.progress) ? s.progress : 0;
    const p = clamp(rawP, 0, 100);
    weightedSum += p * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return 0;
  return clamp(Math.round(weightedSum / totalWeight), 0, 100);
}

/**
 * Turlangan (şablonga asoslangan) loyiha uçun progress = tugallangan bosqiçlar ulushi.
 * Vaznsiz, texnik topşiriqqa köra: 4 bosqiçdan 1 tasi bajarilsa = 25%. Boş röyxat → 0.
 */
export type StageStatusInput = { status: "locked" | "active" | "completed" | string };

export function stageProgress(stages: StageStatusInput[]): number {
  if (!stages || stages.length === 0) return 0;
  const done = stages.filter((s) => s.status === "completed").length;
  return clamp(Math.round((100 * done) / stages.length), 0, 100);
}

export type DerivedStatus = "on_hold" | "not_started" | "in_progress" | "completed";

/** Badge'ni boşqariş uçun hosila status — u hech qaçon progress bar bilan ziddiyatga tuşmaydi. */
export function derivedStatus(
  progress: number,
  statusOverride?: string | null
): DerivedStatus {
  if (statusOverride === "on_hold") return "on_hold";
  if (progress >= 100) return "completed";
  // Qölda «in progress» qilib belgilaş — asosan bitta bosqiçli loyihalar uçun,
  // çunki ularning progressi faqat 0% (active) yoki 100% (done) böladi, aks holda
  // ular hech qaçon «in progress» körinmasdi. Loyiha haqiqatan tugagach, e'tiborga olinmaydi.
  if (statusOverride === "in_progress") return "in_progress";
  if (progress <= 0) return "not_started";
  return "in_progress";
}

/**
 * Töp kimning maydonida — «sizning navbatingiz» signali uçun yagona haqiqat
 * manbai, HAM studiya, HAM xodimlar tomonida. Faqat turlangan (bosqiçga
 * asoslangan) loyihalar uçun ma'noga ega; har bir köriniş şu ikki yordamçi
 * funksiyadan kelib çiqadi, şuning uçun ikki köriniş bir-biriga zid böla olmaydi.
 *
 *   'studio'  — navbat studiyada (tayyorlaş yoki özgartiriş söralgach tuzatiş)
 *   'bkrm'    — navbat BKRMda, körib çiqiş kerak (studiya topşirgan)
 *   'nobody'  — bu yerda qiladigan iş yöq (kelajakdagi/qulflangan yoki tugallangan)
 */
export type Turn = "studio" | "bkrm" | "nobody";

export function stageTurn(stage: { status: string; reviewStatus?: string | null }): Turn {
  if (stage.status !== "active") return "nobody"; // qulflangan (kelajak) yoki tugallangan (bajarilgan)
  return stage.reviewStatus === "submitted" ? "bkrm" : "studio";
}

export function projectTurn(stages: { status: string; reviewStatus?: string | null }[]): Turn {
  const active = stages.find((s) => s.status === "active");
  return active ? stageTurn(active) : "nobody";
}
