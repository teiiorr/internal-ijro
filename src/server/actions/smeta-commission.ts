"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { smetaCommissionProjects } from "@/lib/db/tables/smeta-commission";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";

// "Majlis qoʻshish" bilan bir xil doira: kontragentdan boshqa barcha xodimlar.
const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;

export type SmetaProjectError = "invalid" | "duplicate" | "unavailable";
export type SmetaProjectResult = { ok: true } | { ok: false; error: SmetaProjectError };

const nameSchema = z.string().trim().min(2).max(300);

/** Postgres "undefined_table" (42P01) — 0032 migratsiyasi hali qoʻllanmagan. */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

export async function addSmetaCommissionProject(rawName: string): Promise<SmetaProjectResult> {
  const me = await requirePosition([...MANAGERS]);
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: "invalid" };
  let name = parsed.data.replace(/\s+/g, " ");

  try {
    const [dup] = await db
      .select({ id: smetaCommissionProjects.id })
      .from(smetaCommissionProjects)
      .where(sql`lower(${smetaCommissionProjects.name}) = lower(${name})`)
      .limit(1);
    if (dup) return { ok: false, error: "duplicate" };

    // Tizimdagi loyiha nomiga aynan mos kelsa, bogʻlab qoʻyamiz (roʻyxatda sahifasiga havola boʻladi)
    // va nomni loyihadagi asl yozilishida saqlaymiz.
    const match = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(sql`lower(${projects.name}) = lower(${name})`)
      .limit(2);
    const projectId = match.length === 1 ? match[0].id : null;
    if (match.length === 1) name = match[0].name;

    const [row] = await db
      .insert(smetaCommissionProjects)
      .values({ name, projectId, createdByUserId: me.id })
      .returning({ id: smetaCommissionProjects.id });
    await logActivity({ userId: me.id, action: "smeta.project_added", entityType: "smeta_commission_project", entityId: row.id, newValue: { name } });
  } catch (e) {
    if (isMissingTable(e)) return { ok: false, error: "unavailable" };
    throw e;
  }

  revalidatePath("/kengashlar/smeta");
  return { ok: true };
}

export async function removeSmetaCommissionProject(id: string): Promise<SmetaProjectResult> {
  const me = await requirePosition([...MANAGERS]);
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "invalid" };

  try {
    const [row] = await db
      .delete(smetaCommissionProjects)
      .where(eq(smetaCommissionProjects.id, id))
      .returning({ name: smetaCommissionProjects.name });
    if (row) {
      await logActivity({ userId: me.id, action: "smeta.project_removed", entityType: "smeta_commission_project", entityId: id, oldValue: { name: row.name } });
    }
  } catch (e) {
    if (isMissingTable(e)) return { ok: false, error: "unavailable" };
    throw e;
  }

  revalidatePath("/kengashlar/smeta");
  return { ok: true };
}
