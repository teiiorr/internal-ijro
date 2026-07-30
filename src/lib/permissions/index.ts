import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coordinatorAssignments, users, type Position } from "@/lib/db/schema";

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
  // Open assignment policy (user directive): any internal staff member can assign
  // a task to any other internal staff member — no hierarchy/department scoping.
  // Contractors are external and are excluded both as assigner and assignee.
  if (assigner.position === "kontragent" || assignee.position === "kontragent") return false;
  return true;
}

export { can, type Capability } from "./capabilities";
