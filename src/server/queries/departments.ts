import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, users, coordinatorAssignments } from "@/lib/db/schema";

export type DepartmentRow = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
  headFullName: string | null;
  memberCount: number;
};

export async function listDepartments(): Promise<DepartmentRow[]> {
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      parentDepartmentId: departments.parentDepartmentId,
      headUserId: departments.headUserId,
      headFullName: users.fullName,
      memberCount: sql<number>`(select count(*)::int from users u where u.department_id = ${departments.id})`,
    })
    .from(departments)
    .leftJoin(users, eq(users.id, departments.headUserId))
    .orderBy(asc(departments.name));
  return rows as DepartmentRow[];
}

export async function getDepartment(id: string) {
  const row = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return row[0] ?? null;
}

export async function listCoordinators(departmentId: string) {
  return db
    .select({ userId: users.id, fullName: users.fullName, email: users.email })
    .from(coordinatorAssignments)
    .innerJoin(users, eq(users.id, coordinatorAssignments.coordinatorUserId))
    .where(eq(coordinatorAssignments.departmentId, departmentId));
}
