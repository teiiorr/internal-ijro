import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { smetaCommissionProjects } from "@/lib/db/tables/smeta-commission";

export type SmetaCommissionProject = {
  id: string;
  name: string;
  projectId: string | null;
  createdAt: string;
  createdByName: string | null;
};

/**
 * Smeta komissiyasiga oʻtgan loyihalar — topshirilgan tartibda (birinchi qoʻshilgan birinchi).
 * `ready: false` — 0032 migratsiyasi hali qoʻllanmagan (jadval yoʻq), sahifa yiqilmaydi.
 */
export async function listSmetaCommissionProjects(): Promise<{ ready: boolean; items: SmetaCommissionProject[] }> {
  try {
    const rows = await db
      .select({
        id: smetaCommissionProjects.id,
        name: smetaCommissionProjects.name,
        projectId: smetaCommissionProjects.projectId,
        createdAt: smetaCommissionProjects.createdAt,
        createdByName: users.fullName,
      })
      .from(smetaCommissionProjects)
      .leftJoin(users, eq(users.id, smetaCommissionProjects.createdByUserId))
      .orderBy(asc(smetaCommissionProjects.createdAt));
    return { ready: true, items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
  } catch {
    return { ready: false, items: [] };
  }
}
