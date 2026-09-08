import type { Position } from "@/lib/db/schema";

export const TASK_STATUSES = ["todo", "in_progress", "under_review", "completed", "rejected"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Ruxsat etilgan holat ötişlari, rolni hisobga oladi.
 *  - assignee/creator oldinga sura oladi
 *  - creator under_review dan rad etiş/tasdiqlaş qila oladi
 */
export function canTransition(
  current: TaskStatus,
  next: TaskStatus,
  actor: { id: string; position: Position; isCreator: boolean; isAssignee: boolean }
): boolean {
  if (current === next) return false;

  // Topşiriqqa ruxsati bor har kim todo↔in_progress ni ötkaza oladi
  if (actor.isAssignee || actor.isCreator) {
    if (current === "todo" && next === "in_progress") return true;
    if (current === "in_progress" && next === "under_review") return true;
    if (current === "rejected" && next === "in_progress") return true;
  }

  if (actor.isCreator) {
    if (current === "under_review" && (next === "completed" || next === "rejected")) return true;
  }

  // Direktor va Örinbosar hamma narsani istalgan holatga ötkaza oladi (override)
  if (actor.position === "direktor" || actor.position === "orinbosar") return true;

  return false;
}
