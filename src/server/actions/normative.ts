"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { normativeDocuments } from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { deleteFileByUrl } from "@/lib/upload";

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;

export async function removeNormativeDocument(id: string) {
  const me = await requirePosition([...MANAGERS]);
  const [doc] = await db.select().from(normativeDocuments).where(eq(normativeDocuments.id, id)).limit(1);
  if (!doc) return;
  await deleteFileByUrl(doc.fileUrl);
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
