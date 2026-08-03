"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { normativeDocuments } from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { deleteFileByUrl } from "@/lib/upload";

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;

const linkSchema = z.object({
  title: z.string().trim().min(1).max(255),
  url: z.string().trim().url().max(2000),
  folder: z.string().trim().max(120).nullable().optional(),
});

/** Add an external link as a normative "document" (no file on disk). */
export async function addNormativeLink(input: z.infer<typeof linkSchema>) {
  const me = await requirePosition([...MANAGERS]);
  const parsed = linkSchema.parse(input);
  // Only http/https links.
  if (!/^https?:\/\//i.test(parsed.url)) throw new Error("bad_url");
  await db.insert(normativeDocuments).values({
    folder: parsed.folder?.trim() || null,
    isLink: true,
    fileUrl: parsed.url,
    fileName: parsed.title,
    uploadedByUserId: me.id,
  });
  await logActivity({ userId: me.id, action: "normative.link_added", entityType: "normative_document", newValue: { title: parsed.title, url: parsed.url } });
  revalidatePath("/meyoriy-hujjatlar");
}

export async function removeNormativeDocument(id: string) {
  const me = await requirePosition([...MANAGERS]);
  const [doc] = await db.select().from(normativeDocuments).where(eq(normativeDocuments.id, id)).limit(1);
  if (!doc) return;
  // Links have no file on disk — only delete real uploads.
  if (!doc.isLink) await deleteFileByUrl(doc.fileUrl);
  await db.delete(normativeDocuments).where(eq(normativeDocuments.id, id));
  await logActivity({ userId: me.id, action: "normative.document_removed", entityType: "normative_document", entityId: id });
  revalidatePath("/meyoriy-hujjatlar");
}

export async function setNormativeDocumentFolder(id: string, folder: string | null) {
  const me = await requirePosition([...MANAGERS]);
  const v = folder ? (folder.replace(/\s+/g, " ").trim().slice(0, 120) || null) : null;
  await db.update(normativeDocuments).set({ folder: v }).where(eq(normativeDocuments.id, id));
  await logActivity({ userId: me.id, action: "normative.document_moved", entityType: "normative_document", entityId: id, newValue: { folder: v } });
  revalidatePath("/meyoriy-hujjatlar");
}
