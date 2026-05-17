import "server-only";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, users } from "@/lib/db/schema";

export type AuditFilters = {
  userId?: string | null;
  action?: string | null;
  entityType?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  scope?: "all" | "hr";
};

export async function listAudit(f: AuditFilters) {
  const conds = [] as ReturnType<typeof eq>[];
  if (f.userId) conds.push(eq(activityLog.userId, f.userId));
  if (f.action) conds.push(ilike(activityLog.action, `${f.action}%`));
  if (f.entityType) conds.push(eq(activityLog.entityType, f.entityType));
  if (f.from) conds.push(gte(activityLog.createdAt, new Date(f.from)));
  if (f.to) conds.push(lte(activityLog.createdAt, new Date(f.to)));
  if (f.search) {
    const s = `%${f.search.toLowerCase()}%`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conds.push(or(ilike(activityLog.action, s), ilike(activityLog.entityType, s)) as any);
  }
  if (f.scope === "hr") {
    conds.push(sql`${activityLog.action} like 'employee.%' OR ${activityLog.action} like 'department.%' OR ${activityLog.action} like 'coordinator.%'`);
  }
  const where = conds.length > 0 ? and(...conds) : undefined;
  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      oldValue: activityLog.oldValue,
      newValue: activityLog.newValue,
      ipAddress: activityLog.ipAddress,
      createdAt: activityLog.createdAt,
      userId: activityLog.userId,
      userName: users.fullName,
    })
    .from(activityLog)
    .leftJoin(users, eq(users.id, activityLog.userId))
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(500);
}
