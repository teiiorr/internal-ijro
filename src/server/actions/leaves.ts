"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leaves } from "@/lib/db/schema";
import { requireUser, requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const requestSchema = z.object({
  type: z.enum(["vacation", "sick", "unpaid", "other"]),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(2000).nullable().optional(),
});

export async function requestLeave(formData: FormData) {
  const me = await requireUser();
  const parsed = requestSchema.parse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: (formData.get("reason") as string) || null,
  });
  await db.insert(leaves).values({
    userId: me.id,
    type: parsed.type,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    reason: parsed.reason ?? null,
  });
  await logActivity({ userId: me.id, action: "leave.requested", entityType: "leave" });
  revalidatePath("/leaves");
}

export async function approveLeave(id: string) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  const row = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
  if (row.length === 0) return;
  await db
    .update(leaves)
    .set({ status: "approved", approvedByUserId: me.id, approvedAt: new Date() })
    .where(eq(leaves.id, id));
  await logActivity({ userId: me.id, action: "leave.approved", entityType: "leave", entityId: id });
  await notify({
    userIds: [row[0].userId],
    type: "leave.approved",
    title: "Your leave has been approved",
    link: "/leaves",
  });
  revalidatePath("/leaves");
}

export async function rejectLeave(id: string, reason: string) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  const row = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
  if (row.length === 0) return;
  await db
    .update(leaves)
    .set({ status: "rejected", approvedByUserId: me.id, approvedAt: new Date(), rejectionReason: reason })
    .where(eq(leaves.id, id));
  await logActivity({ userId: me.id, action: "leave.rejected", entityType: "leave", entityId: id });
  await notify({
    userIds: [row[0].userId],
    type: "leave.rejected",
    title: "Your leave was rejected",
    message: reason,
    link: "/leaves",
  });
  revalidatePath("/leaves");
}
