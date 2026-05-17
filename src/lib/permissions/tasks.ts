import type { Position } from "@/lib/db/schema";

export const TASK_STATUSES = ["todo", "in_progress", "under_review", "completed", "rejected"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Allowed status transitions, role-aware.
 *  - assignee/creator can move forward
 *  - creator can reject/approve from under_review
 */
export function canTransition(
  current: TaskStatus,
  next: TaskStatus,
  actor: { id: string; position: Position; isCreator: boolean; isAssignee: boolean }
): boolean {
  if (current === next) return false;

  // Anyone allowed in the task can move todo↔in_progress
  if (actor.isAssignee || actor.isCreator) {
    if (current === "todo" && next === "in_progress") return true;
    if (current === "in_progress" && next === "under_review") return true;
    if (current === "rejected" && next === "in_progress") return true;
  }

  if (actor.isCreator) {
    if (current === "under_review" && (next === "completed" || next === "rejected")) return true;
  }

  // Direktor and O'rinbosar can move anything anywhere (override)
  if (actor.position === "direktor" || actor.position === "orinbosar") return true;

  return false;
}
