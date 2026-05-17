"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, coordinatorAssignments, users } from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";

const departmentSchema = z.object({
  name: z.string().min(2).max(255),
  nameUzLatn: z.string().max(255).nullable().optional(),
  nameUzCyrl: z.string().max(255).nullable().optional(),
  nameRu: z.string().max(255).nullable().optional(),
  nameEn: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  headUserId: z.string().uuid().nullable().optional(),
});

export async function createDepartment(input: z.infer<typeof departmentSchema>) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  const parsed = departmentSchema.parse(input);
  const row = await db
    .insert(departments)
    .values({ ...parsed, parentDepartmentId: parsed.parentDepartmentId ?? null, headUserId: parsed.headUserId ?? null })
    .returning({ id: departments.id });
  await logActivity({
    userId: me.id,
    action: "department.created",
    entityType: "department",
    entityId: row[0].id,
    newValue: parsed,
  });
  revalidatePath("/departments");
  return { id: row[0].id };
}

export async function updateDepartment(id: string, input: z.infer<typeof departmentSchema>) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  const parsed = departmentSchema.parse(input);
  await db
    .update(departments)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(departments.id, id));
  await logActivity({
    userId: me.id,
    action: "department.updated",
    entityType: "department",
    entityId: id,
    newValue: parsed,
  });
  revalidatePath("/departments");
  revalidatePath(`/departments/${id}`);
}

export async function deleteDepartment(id: string) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  await db.delete(departments).where(eq(departments.id, id));
  await logActivity({ userId: me.id, action: "department.deleted", entityType: "department", entityId: id });
  revalidatePath("/departments");
}

export async function assignCoordinator(departmentId: string, coordinatorUserId: string) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  // Verify user is a coordinator
  const u = await db.select({ position: users.position }).from(users).where(eq(users.id, coordinatorUserId)).limit(1);
  if (u.length === 0 || u[0].position !== "koordinator") throw new Error("not_a_coordinator");
  await db
    .insert(coordinatorAssignments)
    .values({ departmentId, coordinatorUserId })
    .onConflictDoNothing();
  await logActivity({
    userId: me.id,
    action: "coordinator.assigned",
    entityType: "department",
    entityId: departmentId,
    newValue: { coordinatorUserId },
  });
  revalidatePath(`/departments`);
  revalidatePath(`/departments/${departmentId}`);
}

export async function unassignCoordinator(departmentId: string, coordinatorUserId: string) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  await db
    .delete(coordinatorAssignments)
    .where(
      and(
        eq(coordinatorAssignments.departmentId, departmentId),
        eq(coordinatorAssignments.coordinatorUserId, coordinatorUserId)
      )
    );
  await logActivity({
    userId: me.id,
    action: "coordinator.unassigned",
    entityType: "department",
    entityId: departmentId,
    newValue: { coordinatorUserId },
  });
  revalidatePath(`/departments/${departmentId}`);
}
