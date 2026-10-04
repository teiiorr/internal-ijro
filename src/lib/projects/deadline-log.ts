import { stageDeadlineChanges, type NewStageDeadlineChange } from "@/lib/db/tables/deadline-slippage";
import { deltaDays, normalizeIsoDay } from "@/lib/projects/slippage";

/**
 * Bosqich muddati oʻzgarishini stage_deadline_changes jadvaliga yozadi.
 *
 * "server-only" EMAS va `db`'ni oʻzi import qilmaydi — chaqiruvchi ijrochini beradi:
 * oddiy `db` yoki tashqi tranzaksiyaning `tx`'i. Yozuv har doim ichki
 * `executor.transaction(...)` ichida bajariladi: `tx` uchun bu SAVEPOINT boʻladi, shuning
 * uchun jadval hali yoʻq boʻlsa (0031 qoʻllanmagan) xato faqat savepoint'ni bekor qiladi —
 * chaqiruvchining tranzaksiyasi ham, muddatning oʻzgarishi ham buzilmaydi.
 */

type DeadlineLogInserter = {
  insert(table: typeof stageDeadlineChanges): { values(value: NewStageDeadlineChange): PromiseLike<unknown> };
};

/** `db` ham, `tx` ham mos keladi (ikkalasida `transaction` bor). */
export type DeadlineLogExecutor = {
  transaction<T>(fn: (sp: DeadlineLogInserter) => Promise<T>): Promise<T>;
};

export type DeadlineChangeEvent = {
  stageId: string;
  projectId: string;
  oldDeadline: string | null;
  newDeadline: string | null;
  source: "manual" | "edit" | "studio_request";
  reason?: string | null;
  stageRequestId?: string | null;
  changedByUserId: string | null;
};

export async function recordDeadlineChange(executor: DeadlineLogExecutor, e: DeadlineChangeEvent): Promise<void> {
  const oldDeadline = normalizeIsoDay(e.oldDeadline);
  const newDeadline = normalizeIsoDay(e.newDeadline);
  if (oldDeadline === newDeadline) return;
  const reason = typeof e.reason === "string" ? e.reason.trim().slice(0, 1000) || null : null;
  try {
    await executor.transaction(async (sp) => {
      await sp.insert(stageDeadlineChanges).values({
        stageId: e.stageId,
        projectId: e.projectId,
        oldDeadline,
        newDeadline,
        deltaDays: deltaDays(oldDeadline, newDeadline),
        source: e.source,
        stageRequestId: e.stageRequestId ?? null,
        reason,
        changedByUserId: e.changedByUserId,
      });
    });
  } catch (err) {
    // Jadval hali yaratilmagan boʻlishi mumkin — muddat tahririni toʻxtatmaymiz.
    console.warn("[deadline-log] stage_deadline_changes yozilmadi:", err instanceof Error ? err.message : err);
  }
}
