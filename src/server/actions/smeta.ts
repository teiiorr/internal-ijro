"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, projectSmetaItems } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { canEditMoney } from "@/lib/permissions/money";
import { logActivity } from "@/lib/audit";
import { type ActionResult } from "@/lib/action-result";

// Loyiha sahifasini yangilaydi (smeta bo'limi shu yerda renderlanadi).
function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

// Modda maydonlari — qo'shish va tahrirlash uchun umumiy shakl. Pul manfiy bo'lmaydi.
const fieldsSchema = {
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  plannedAmount: z.number().nonnegative().default(0),
  actualAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().min(1).max(10).default("UZS"),
};

const addSchema = z.object({ projectId: z.string().uuid(), ...fieldsSchema });
const updateSchema = z.object({ id: z.string().uuid(), ...fieldsSchema });

/** Yangi smeta moddasi qo'shadi (ro'yxat oxiriga). Faqat pulni tahrirlay oladigan muharrir. */
export async function addSmetaItem(input: z.infer<typeof addSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await requireUser();
  if (!(await canEditMoney(me))) return { ok: false, error: "forbidden" };
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, data.projectId)).limit(1);
  if (!project) return { ok: false, error: "not_found" };

  // Keyingi tartib raqami — mavjud eng kattasidan bitta ko'p (bo'sh bo'lsa 0).
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${projectSmetaItems.orderIndex}), -1)` })
    .from(projectSmetaItems)
    .where(eq(projectSmetaItems.projectId, data.projectId));
  const nextOrder = Number(maxRow?.max ?? -1) + 1;

  const [row] = await db
    .insert(projectSmetaItems)
    .values({
      projectId: data.projectId,
      category: data.category,
      description: data.description?.trim() || null,
      plannedAmount: String(data.plannedAmount),
      actualAmount: data.actualAmount != null ? String(data.actualAmount) : null,
      currency: data.currency,
      orderIndex: nextOrder,
    })
    .returning({ id: projectSmetaItems.id });

  await logActivity({
    userId: me.id,
    action: "project.smeta_item_added",
    entityType: "project",
    entityId: data.projectId,
    newValue: { category: data.category, plannedAmount: data.plannedAmount, currency: data.currency },
  });
  revalidate(data.projectId);
  return { ok: true, id: row.id };
}

/** Mavjud moddani tahrirlaydi. Faqat pulni tahrirlay oladigan muharrir. */
export async function updateSmetaItem(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const me = await requireUser();
  if (!(await canEditMoney(me))) return { ok: false, error: "forbidden" };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const [row] = await db
    .select({ id: projectSmetaItems.id, projectId: projectSmetaItems.projectId })
    .from(projectSmetaItems)
    .where(eq(projectSmetaItems.id, data.id))
    .limit(1);
  if (!row) return { ok: false, error: "not_found" };

  await db
    .update(projectSmetaItems)
    .set({
      category: data.category,
      description: data.description?.trim() || null,
      plannedAmount: String(data.plannedAmount),
      actualAmount: data.actualAmount != null ? String(data.actualAmount) : null,
      currency: data.currency,
      updatedAt: new Date(),
    })
    .where(eq(projectSmetaItems.id, data.id));

  await logActivity({
    userId: me.id,
    action: "project.smeta_item_updated",
    entityType: "project",
    entityId: row.projectId,
    newValue: { id: data.id, category: data.category, plannedAmount: data.plannedAmount },
  });
  revalidate(row.projectId);
  return { ok: true };
}

/** Moddani o'chiradi. Faqat pulni tahrirlay oladigan muharrir. */
export async function deleteSmetaItem(id: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!(await canEditMoney(me))) return { ok: false, error: "forbidden" };
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const [row] = await db
    .select({ projectId: projectSmetaItems.projectId })
    .from(projectSmetaItems)
    .where(eq(projectSmetaItems.id, parsed.data))
    .limit(1);
  if (!row) return { ok: false, error: "not_found" };

  await db.delete(projectSmetaItems).where(eq(projectSmetaItems.id, parsed.data));

  await logActivity({
    userId: me.id,
    action: "project.smeta_item_deleted",
    entityType: "project",
    entityId: row.projectId,
  });
  revalidate(row.projectId);
  return { ok: true };
}
