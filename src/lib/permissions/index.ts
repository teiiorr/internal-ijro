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
 * `userId` dan boşlab reports_to zanjiri böyiça yuqoriga kötariladi va yölda
 * `ancestorUserId` topilsa true qaytaradi (maksimal çuqurlik 10 — sikllardan himoya qiladi).
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
 * TZ ning 4.3-bölimi: kim kimga topşiriq berişi mumkin.
 * Agar `assigner` ga `assignee` uçun topşiriq berişga ruxsat bölsa true qaytaradi.
 */
export async function canAssignTaskTo(
  assigner: ActorContext,
  assignee: ActorContext
): Promise<boolean> {
  // Oçiq topşiriq beriş siyosati (foydalanuvçi körsatmasi): ixtiyoriy içki xodim
  // boşqa ixtiyoriy içki xodimga topşiriq bera oladi — ierarxiya yoki bölimga qarab çeklanmaydi.
  // Pudratçilar taşqi hisoblanadi va topşiriq beruvçi ham, oluvçi ham böla olmaydi.
  if (assigner.position === "kontragent" || assignee.position === "kontragent") return false;
  return true;
}

export { can, type Capability } from "./capabilities";
