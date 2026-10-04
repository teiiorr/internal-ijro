"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, taskAssignees, tasks } from "@/lib/db/schema";
import { personalTodos } from "@/lib/db/tables/my-work";
import { requireUser, type SessionUser } from "@/lib/session";
import { isIsoDate } from "@/lib/my-work/buckets";

// Shaxsiy eslatmalar — faqat egasi uchun. Har bir amal user_id = men sharti bilan
// cheklanadi (begona id kelsa hech narsa oʻzgarmaydi → "not_found").
// Ataylab activity_log'ga yozilmaydi va bildirishnoma yuborilmaydi.

const dateSchema = z
  .string()
  .refine((s) => isIsoDate(s), "invalid_date")
  .nullable();

const idSchema = z.string().uuid();

async function requireStaff(): Promise<SessionUser> {
  const me = await requireUser();
  if (me.position === "kontragent") throw new Error("forbidden");
  return me;
}

function revalidate() {
  revalidatePath("/my-work");
  revalidatePath("/dashboard");
}

/** Topshiriq faqat men yaratgan yoki menga biriktirilgan boʻlsa bogʻlanadi. */
async function canLinkTask(userId: string, taskId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        sql`(${tasks.createdByUserId} = ${userId} OR EXISTS (
          SELECT 1 FROM ${taskAssignees}
          WHERE ${taskAssignees.taskId} = ${tasks.id} AND ${taskAssignees.userId} = ${userId}
        ))`,
      ),
    )
    .limit(1);
  return !!row;
}

async function projectExists(projectId: string): Promise<boolean> {
  const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return !!row;
}

// ---------------- qoʻshish ----------------

const addSchema = z.object({
  title: z.string().trim().min(1).max(500),
  dueDate: dateSchema.optional(),
  linkedTaskId: idSchema.nullable().optional(),
  linkedProjectId: idSchema.nullable().optional(),
});

export async function addTodo(input: {
  title: string;
  dueDate?: string | null;
  linkedTaskId?: string | null;
  linkedProjectId?: string | null;
}): Promise<{ id: string }> {
  const me = await requireStaff();
  const p = addSchema.parse(input);

  const linkedTaskId = p.linkedTaskId && (await canLinkTask(me.id, p.linkedTaskId)) ? p.linkedTaskId : null;
  const linkedProjectId = p.linkedProjectId && (await projectExists(p.linkedProjectId)) ? p.linkedProjectId : null;

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${personalTodos.orderIndex}), -1) + 1` })
    .from(personalTodos)
    .where(eq(personalTodos.userId, me.id));

  const [row] = await db
    .insert(personalTodos)
    .values({
      userId: me.id,
      title: p.title,
      dueDate: p.dueDate ?? null,
      linkedTaskId,
      linkedProjectId,
      orderIndex: Number(next) || 0,
    })
    .returning({ id: personalTodos.id });

  revalidate();
  return { id: row.id };
}

// ---------------- tahrirlash ----------------

const updateSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(500).optional(),
  note: z.string().max(5000).nullable().optional(),
  dueDate: dateSchema.optional(),
});

export async function updateTodo(input: {
  id: string;
  title?: string;
  note?: string | null;
  dueDate?: string | null;
}): Promise<void> {
  const me = await requireStaff();
  const p = updateSchema.parse(input);

  const patch: Partial<typeof personalTodos.$inferInsert> = { updatedAt: new Date() };
  if (p.title !== undefined) patch.title = p.title;
  if (p.note !== undefined) patch.note = p.note && p.note.trim() ? p.note : null;
  if (p.dueDate !== undefined) patch.dueDate = p.dueDate;

  const rows = await db
    .update(personalTodos)
    .set(patch)
    .where(and(eq(personalTodos.id, p.id), eq(personalTodos.userId, me.id)))
    .returning({ id: personalTodos.id });
  if (rows.length === 0) throw new Error("not_found");
  revalidate();
}

// ---------------- bajarildi / qayta ochish ----------------

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  const me = await requireStaff();
  const todoId = idSchema.parse(id);
  const isDone = z.boolean().parse(done);

  const rows = await db
    .update(personalTodos)
    .set({ doneAt: isDone ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(personalTodos.id, todoId), eq(personalTodos.userId, me.id)))
    .returning({ id: personalTodos.id });
  if (rows.length === 0) throw new Error("not_found");
  revalidate();
}

// ---------------- oʻchirish ----------------

export async function deleteTodo(id: string): Promise<void> {
  const me = await requireStaff();
  const todoId = idSchema.parse(id);

  const rows = await db
    .delete(personalTodos)
    .where(and(eq(personalTodos.id, todoId), eq(personalTodos.userId, me.id)))
    .returning({ id: personalTodos.id });
  if (rows.length === 0) throw new Error("not_found");
  revalidate();
}

// ---------------- tartiblash ----------------

const reorderSchema = z.array(idSchema).max(200);

/** order_index = massivdagi oʻrin; faqat mening qatorlarim yangilanadi (begona id'lar e'tiborsiz). */
export async function reorderTodos(ids: string[]): Promise<void> {
  const me = await requireStaff();
  const list = [...new Set(reorderSchema.parse(ids))];
  if (list.length === 0) return;

  const values = sql.join(
    list.map((id, i) => sql`(${id}::uuid, ${i}::int)`),
    sql`, `,
  );
  await db.execute(sql`
    UPDATE ${personalTodos} AS p
    SET order_index = v.idx, updated_at = now()
    FROM (VALUES ${values}) AS v(id, idx)
    WHERE p.id = v.id AND p.user_id = ${me.id}
  `);
  revalidate();
}
