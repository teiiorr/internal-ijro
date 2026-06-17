/**
 * Pure overall-progress calculation for a project.
 *
 * overallProgress(stages) =
 *   stages.length === 0
 *     ? 0
 *     : round( Σ(stage.progress × stage.weight) / Σ(stage.weight) )
 *
 * Invariants the function tolerates safely:
 *   - empty list → 0
 *   - any stage.progress outside 0..100 → clamped before averaging
 *   - any stage.weight <= 0 → treated as 1 (defensive; server actions should also reject)
 *   - non-finite numbers → coerced to 0/1
 * The result is always an integer in [0, 100].
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

export type DerivedStatus = "on_hold" | "not_started" | "in_progress" | "completed";

/** Derived status used to drive the badge so it can never contradict the bar. */
export function derivedStatus(
  progress: number,
  statusOverride?: string | null
): DerivedStatus {
  if (statusOverride === "on_hold") return "on_hold";
  if (progress >= 100) return "completed";
  if (progress <= 0) return "not_started";
  return "in_progress";
}
