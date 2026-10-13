import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { smetaCommissionProjects } from "@/lib/db/tables/smeta-commission";

/** Komissiya qarori holati (0036). */
export type SmetaStatus = "jarayonda" | "xulosa_berildi" | "qaytarildi";

export type SmetaCommissionProject = {
  id: string;
  name: string;
  projectId: string | null;
  sessionNumber: number | null;
  posterUrl: string | null;
  info: string | null;
  status: SmetaStatus;
  createdAt: string;
  createdByName: string | null;
};

/** Notoʻgʻri/eski qiymatlarni ham xavfsiz holatga keltiramiz (standart — 'jarayonda'). */
function asStatus(v: unknown): SmetaStatus {
  return v === "xulosa_berildi" || v === "qaytarildi" ? v : "jarayonda";
}

/** Postgres "undefined_column" (42703) — 0035/0036 migratsiyalari hali qoʻllanmagan. */
function isMissingColumn(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42703" || err?.cause?.code === "42703";
}

/**
 * Smeta komissiyasiga oʻtgan loyihalar — son boʻyicha, soʻngra topshirilgan tartibda
 * (UI shu tartibda "son"larga guruhlaydi).
 * `ready: false` — 0032 migratsiyasi hali qoʻllanmagan (jadval yoʻq), sahifa yiqilmaydi.
 * 0036 hali qoʻllanmagan boʻlsa (status ustuni yoʻq), holat 'jarayonda' deb oʻqiladi.
 * 0035 hali qoʻllanmagan boʻlsa (yangi ustunlar yoʻq), eski ustunlar bilan oʻqiladi
 * va son/poster/maʼlumot `null`, holat `jarayonda` boʻladi.
 */
export async function listSmetaCommissionProjects(): Promise<{ ready: boolean; items: SmetaCommissionProject[] }> {
  // 0036 qoʻllangan — son/poster/maʼlumot + status ustunlari bilan.
  try {
    const rows = await db
      .select({
        id: smetaCommissionProjects.id,
        name: smetaCommissionProjects.name,
        projectId: smetaCommissionProjects.projectId,
        sessionNumber: smetaCommissionProjects.sessionNumber,
        // Smeta yozuvidagi poster boʻsh boʻlsa — bogʻlangan loyihaning posteriga tushamiz.
        posterUrl: sql<string | null>`coalesce(${smetaCommissionProjects.posterUrl}, ${projects.posterUrl})`,
        info: smetaCommissionProjects.info,
        status: smetaCommissionProjects.status,
        createdAt: smetaCommissionProjects.createdAt,
        createdByName: users.fullName,
      })
      .from(smetaCommissionProjects)
      .leftJoin(users, eq(users.id, smetaCommissionProjects.createdByUserId))
      .leftJoin(projects, eq(projects.id, smetaCommissionProjects.projectId))
      // asc — NULL son'lar oxirida (son belgilanmaganlar roʻyxat yakunida).
      .orderBy(asc(smetaCommissionProjects.sessionNumber), asc(smetaCommissionProjects.createdAt));
    return { ready: true, items: rows.map((r) => ({ ...r, status: asStatus(r.status), createdAt: r.createdAt.toISOString() })) };
  } catch (e) {
    // Jadval bor, lekin biror ustun hali yoʻq — pastroq darajada oʻqiymiz.
    // Boshqa xatoda (jadval yoʻq yoki kutilmagan) eski xatti-harakat: sahifa yiqilmaydi.
    if (!isMissingColumn(e)) return { ready: false, items: [] };
  }

  // 0035 qoʻllangan, 0036 hali yoʻq — son/poster/maʼlumot bor, status 'jarayonda'.
  try {
    const rows = await db
      .select({
        id: smetaCommissionProjects.id,
        name: smetaCommissionProjects.name,
        projectId: smetaCommissionProjects.projectId,
        sessionNumber: smetaCommissionProjects.sessionNumber,
        posterUrl: sql<string | null>`coalesce(${smetaCommissionProjects.posterUrl}, ${projects.posterUrl})`,
        info: smetaCommissionProjects.info,
        createdAt: smetaCommissionProjects.createdAt,
        createdByName: users.fullName,
      })
      .from(smetaCommissionProjects)
      .leftJoin(users, eq(users.id, smetaCommissionProjects.createdByUserId))
      .leftJoin(projects, eq(projects.id, smetaCommissionProjects.projectId))
      .orderBy(asc(smetaCommissionProjects.sessionNumber), asc(smetaCommissionProjects.createdAt));
    return {
      ready: true,
      items: rows.map((r) => ({ ...r, status: "jarayonda" as const, createdAt: r.createdAt.toISOString() })),
    };
  } catch (e) {
    if (!isMissingColumn(e)) return { ready: false, items: [] };
  }

  // 0035 ham hali yoʻq — faqat asosiy ustunlar; qolgani null/standart.
  try {
    const rows = await db
      .select({
        id: smetaCommissionProjects.id,
        name: smetaCommissionProjects.name,
        projectId: smetaCommissionProjects.projectId,
        posterUrl: projects.posterUrl,
        createdAt: smetaCommissionProjects.createdAt,
        createdByName: users.fullName,
      })
      .from(smetaCommissionProjects)
      .leftJoin(users, eq(users.id, smetaCommissionProjects.createdByUserId))
      .leftJoin(projects, eq(projects.id, smetaCommissionProjects.projectId))
      .orderBy(asc(smetaCommissionProjects.createdAt));
    return {
      ready: true,
      items: rows.map((r) => ({
        ...r,
        sessionNumber: null,
        info: null,
        status: "jarayonda" as const,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch {
    return { ready: false, items: [] };
  }
}
