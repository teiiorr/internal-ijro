import "server-only";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  departments,
  employeeProfiles,
  employeeDocuments,
  positionHistory,
  leaves,
  type Position,
  type UserStatus,
} from "@/lib/db/schema";

export type EmployeeListFilters = {
  search?: string;
  departmentId?: string | null;
  position?: Position | null;
  status?: UserStatus | null;
  hireDateFrom?: string | null;
  hireDateTo?: string | null;
  limit?: number;
  offset?: number;
};

export type EmployeeListRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: Position;
  status: UserStatus;
  hireDate: string | null;
  departmentId: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
};

export async function listEmployees(filters: EmployeeListFilters = {}): Promise<{ rows: EmployeeListRow[]; total: number }> {
  const where = [] as ReturnType<typeof eq>[];
  if (filters.search) {
    const s = `%${filters.search.toLowerCase()}%`;
    where.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      or(ilike(users.fullName, s), ilike(users.email, s), ilike(users.phone, s)) as any
    );
  }
  if (filters.departmentId) where.push(eq(users.departmentId, filters.departmentId));
  if (filters.position) where.push(eq(users.position, filters.position));
  if (filters.status) where.push(eq(users.status, filters.status));
  if (filters.hireDateFrom) where.push(gte(users.hireDate, filters.hireDateFrom));
  if (filters.hireDateTo) where.push(lte(users.hireDate, filters.hireDateTo));
  // Internal staff only — HR registry never shows contractors
  where.push(sql`${users.position} <> 'kontragent'`);

  const condition = where.length > 0 ? and(...where) : undefined;

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      position: users.position,
      status: users.status,
      hireDate: users.hireDate,
      departmentId: users.departmentId,
      departmentName: departments.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(condition)
    .orderBy(asc(users.fullName))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);

  const totalRow = await db.select({ c: sql<number>`count(*)::int` }).from(users).where(condition);

  return { rows: rows as EmployeeListRow[], total: Number(totalRow[0]?.c ?? 0) };
}

export async function getEmployee(id: string) {
  const row = await db
    .select({
      user: users,
      profile: employeeProfiles,
      department: departments,
    })
    .from(users)
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, id))
    .limit(1);
  return row[0] ?? null;
}

export async function listEmployeeDocuments(userId: string) {
  return db
    .select()
    .from(employeeDocuments)
    .where(eq(employeeDocuments.userId, userId))
    .orderBy(desc(employeeDocuments.uploadedAt));
}

export async function listPositionHistory(userId: string) {
  return db
    .select()
    .from(positionHistory)
    .where(eq(positionHistory.userId, userId))
    .orderBy(desc(positionHistory.changeDate));
}

export async function listEmployeeLeaves(userId: string) {
  return db.select().from(leaves).where(eq(leaves.userId, userId)).orderBy(desc(leaves.startDate));
}

export async function getEmployeeCounts() {
  const total = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.position} <> 'kontragent' AND ${users.status} = 'active'`);
  const pending = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.status} = 'pending'`);
  const newThisMonth = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.hireDate} >= date_trunc('month', now())::date`);
  const onLeaveNow = await db
    .select({ c: sql<number>`count(distinct ${leaves.userId})::int` })
    .from(leaves)
    .where(sql`${leaves.status} = 'approved' AND ${leaves.startDate} <= now()::date AND ${leaves.endDate} >= now()::date`);
  return {
    total: Number(total[0]?.c ?? 0),
    pending: Number(pending[0]?.c ?? 0),
    newThisMonth: Number(newThisMonth[0]?.c ?? 0),
    onLeaveNow: Number(onLeaveNow[0]?.c ?? 0),
  };
}

export async function getBirthdaysThisWeek() {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      birthDate: employeeProfiles.birthDate,
    })
    .from(users)
    .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .where(
      sql`${users.status} = 'active' AND extract(week from ${employeeProfiles.birthDate}) = extract(week from now())`
    )
    .orderBy(asc(employeeProfiles.birthDate));
}
