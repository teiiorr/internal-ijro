"use server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { smetaCommissionProjects } from "@/lib/db/tables/smeta-commission";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import type { SmetaStatus } from "@/server/queries/smeta-commission";

// "Majlis qoʻshish" bilan bir xil doira: kontragentdan boshqa barcha xodimlar.
const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;

export type SmetaProjectError = "invalid" | "duplicate" | "unavailable";
export type SmetaProjectResult = { ok: true } | { ok: false; error: SmetaProjectError };

/** Loyiha "son"ga ikki yoʻl bilan qoʻshiladi: mavjud loyihadan (poster+maʼlumot koʻchiriladi) yoki yangidan. */
export type AddSmetaProjectInput = {
  mode: "existing" | "scratch";
  /** Qaysi "son"da koʻrib chiqilmoqda (ixtiyoriy). */
  sessionNumber?: number | null;
  /** mode === "existing" — tanlangan tizim loyihasi. */
  projectId?: string | null;
  /** mode === "scratch" — erkin nom. */
  name?: string | null;
  /** Qisqa maʼlumot/izoh (ikkala rejimda ham). */
  info?: string | null;
  /** mode === "scratch" — ixtiyoriy poster havolasi. */
  posterUrl?: string | null;
};

const addSchema = z.object({
  mode: z.enum(["existing", "scratch"]),
  sessionNumber: z.coerce.number().int().min(1).max(100000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(300).optional().nullable(),
  info: z.string().trim().max(4000).optional().nullable(),
  posterUrl: z.string().trim().max(2000).optional().nullable(),
});

/** Postgres "undefined_table" (42P01) — 0032 migratsiyasi hali qoʻllanmagan. */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

/** Postgres "undefined_column" (42703) — 0035/0036 migratsiyasi hali qoʻllanmagan. */
function isMissingColumn(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42703" || err?.cause?.code === "42703";
}

/** Komissiya qarori holati (0036). */
const STATUS_VALUES = ["jarayonda", "xulosa_berildi", "qaytarildi"] as const;
const statusSchema = z.enum(STATUS_VALUES);

export async function addSmetaCommissionProject(input: AddSmetaProjectInput): Promise<SmetaProjectResult> {
  const me = await requirePosition([...MANAGERS]);
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { mode } = parsed.data;
  const sessionNumber = parsed.data.sessionNumber ?? null;
  // info — erkin matn, satr koʻchirishlari saqlanadi (faqat boʻsh boʻlsa null).
  let info: string | null = parsed.data.info && parsed.data.info.length > 0 ? parsed.data.info : null;

  let name: string;
  let projectId: string | null = null;
  let posterUrl: string | null = null;

  try {
    if (mode === "existing") {
      // Tanlangan tizim loyihasini yuklab, nom + poster (+ maʼlumot)ni koʻchiramiz.
      if (!parsed.data.projectId) return { ok: false, error: "invalid" };
      const [proj] = await db
        .select({
          id: projects.id,
          name: projects.name,
          posterUrl: projects.posterUrl,
          description: projects.description,
          genre: projects.genre,
          budget: projects.budget,
        })
        .from(projects)
        .where(eq(projects.id, parsed.data.projectId))
        .limit(1);
      if (!proj) return { ok: false, error: "invalid" };
      name = proj.name;
      projectId = proj.id;
      posterUrl = proj.posterUrl ?? null;
      // Forma maʼlumot bermagan boʻlsa — loyiha tavsifini olib qoʻyamiz.
      if (!info) info = proj.description?.trim() || null;
    } else {
      // Yangidan — erkin nom, ixtiyoriy poster havolasi.
      if (!parsed.data.name) return { ok: false, error: "invalid" };
      name = parsed.data.name.replace(/\s+/g, " ");
      posterUrl = parsed.data.posterUrl && parsed.data.posterUrl.length > 0 ? parsed.data.posterUrl : null;
    }

    // Takror tekshiruvi — FAQAT aynan shu son ichida (bitta loyihani turli sonlarga
    // ikki, uch marta qoʻshish mumkin; sonsiz "Hozir" roʻyxatida ham faqat bir marta).
    const [dup] = await db
      .select({ id: smetaCommissionProjects.id })
      .from(smetaCommissionProjects)
      .where(
        and(
          sql`lower(${smetaCommissionProjects.name}) = lower(${name})`,
          sessionNumber === null
            ? isNull(smetaCommissionProjects.sessionNumber)
            : eq(smetaCommissionProjects.sessionNumber, sessionNumber),
        ),
      )
      .limit(1);
    if (dup) return { ok: false, error: "duplicate" };

    // Yangi ustunlar (son/poster/maʼlumot) bilan yozishga urinamiz; 0035 hali
    // qoʻllanmagan boʻlsa (42703), faqat nom + projectId bilan yozamiz.
    let rowId: string;
    try {
      const [row] = await db
        .insert(smetaCommissionProjects)
        .values({ name, projectId, createdByUserId: me.id, sessionNumber, posterUrl, info })
        .returning({ id: smetaCommissionProjects.id });
      rowId = row.id;
    } catch (e) {
      if (!isMissingColumn(e)) throw e;
      const [row] = await db
        .insert(smetaCommissionProjects)
        .values({ name, projectId, createdByUserId: me.id })
        .returning({ id: smetaCommissionProjects.id });
      rowId = row.id;
    }

    await logActivity({ userId: me.id, action: "smeta.project_added", entityType: "smeta_commission_project", entityId: rowId, newValue: { name, sessionNumber, mode } });
  } catch (e) {
    if (isMissingTable(e)) return { ok: false, error: "unavailable" };
    throw e;
  }

  revalidatePath("/kengashlar/smeta");
  return { ok: true };
}

/** Komissiya qarorini oʻzgartirish: jarayonda | xulosa_berildi | qaytarildi. */
export async function setSmetaProjectStatus(id: string, status: SmetaStatus): Promise<SmetaProjectResult> {
  const me = await requirePosition([...MANAGERS]);
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "invalid" };
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    // status ustuni 0036 bilan qoʻshiladi — hali qoʻllanmagan boʻlsa (42703), yangilanmaydi.
    const [row] = await db
      .update(smetaCommissionProjects)
      .set({ status: parsed.data })
      .where(eq(smetaCommissionProjects.id, id))
      .returning({ name: smetaCommissionProjects.name });
    if (row) {
      await logActivity({
        userId: me.id,
        action: "smeta.project_status_changed",
        entityType: "smeta_commission_project",
        entityId: id,
        newValue: { name: row.name, status: parsed.data },
      });
    }
  } catch (e) {
    if (isMissingTable(e) || isMissingColumn(e)) return { ok: false, error: "unavailable" };
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
