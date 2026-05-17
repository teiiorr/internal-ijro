import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

export type AuditEntry = {
  userId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};

export async function logActivity(entry: AuditEntry): Promise<void> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent") ?? null;
  await db.insert(activityLog).values({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    oldValue: entry.oldValue ? (JSON.parse(JSON.stringify(entry.oldValue)) as object) : null,
    newValue: entry.newValue ? (JSON.parse(JSON.stringify(entry.newValue)) as object) : null,
    ipAddress: ip,
    userAgent: ua,
  });
}
