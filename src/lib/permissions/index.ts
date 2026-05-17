import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coordinatorAssignments, users, type Position } from "@/lib/db/schema";
import { getPositionLevel } from "./positions";

export * from "./positions";

export type ActorContext = {
  id: string;
  position: Position;
  departmentId: string | null;
};

export async function isInCoordinatedDepartments(
  coordinatorUserId: string,
  departmentId: string | null
): Promise<boolean> {
  if (!departmentId) return false;
  const rows = await db
    .select({ id: coordinatorAssignments.id })
    .from(coordinatorAssignments)
    .where(
      and(
        eq(coordinatorAssignments.coordinatorUserId, coordinatorUserId),
        eq(coordinatorAssignments.departmentId, departmentId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Walks the reports_to chain upward from `userId` and returns true if
 * `ancestorUserId` is found along the way (max depth 10 — guards against loops).
 */
export async function isSubordinate(ancestorUserId: string, userId: string): Promise<boolean> {
  let current: string | null = userId;
  for (let depth = 0; depth < 10; depth++) {
    if (!current) return false;
    const row = await db
      .select({ reportsTo: users.reportsToUserId })
      .from(users)
      .where(eq(users.id, current))
      .limit(1);
    if (row.length === 0) return false;
    if (row[0].reportsTo === ancestorUserId) return true;
    current = row[0].reportsTo;
  }
  return false;
}

/**
 * Section 4.3 of TZ: who can assign a task to whom.
 * Returns true if `assigner` is allowed to assign a task to `assignee`.
 */
export async function canAssignTaskTo(
  assigner: ActorContext,
  assignee: ActorContext
): Promise<boolean> {
  if (assigner.id === assignee.id) return false;
  if (assigner.position === "hr" || assigner.position === "mutaxassis") return false;
  if (assigner.position === "kontragent") return false;
  if (assignee.position === "kontragent") return false;

  // HR can receive tasks from any manager (cross-department support function).
  if (assignee.position === "hr") return true;

  if (assigner.position === "direktor") return true;
  if (assigner.position === "orinbosar") return assignee.position !== "direktor";

  if (assigner.position === "koordinator") {
    return (
      (await isInCoordinatedDepartments(assigner.id, assignee.departmentId)) &&
      getPositionLevel(assignee.position) > getPositionLevel(assigner.position)
    );
  }

  if (assigner.position === "bolim_boshligi") {
    return assigner.departmentId === assignee.departmentId && getPositionLevel(assignee.position) > 4;
  }

  if (assigner.position === "bosh_mutaxassis" || assigner.position === "yetakchi_mutaxassis") {
    return isSubordinate(assigner.id, assignee.id);
  }

  return false;
}

export { can, type Capability } from "./capabilities";
