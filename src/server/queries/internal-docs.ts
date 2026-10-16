import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { internalDocuments, type InternalDocKind } from "@/lib/db/tables/internal-documents";

export type InternalDocRow = {
  id: string;
  kind: InternalDocKind;
  title: string;
  docNumber: string | null;
  docDate: string | null;
  fileName: string;
  fileSize: number | null;
  uploadedAt: Date;
  uploadedByUserId: string | null;
  uploaderName: string | null;
};

/** Berilgan turdagi barcha hujjatlar: avval hujjat sanasi boʻyicha, soʻng yuklangan vaqti boʻyicha (eng yangisi tepada). */
export async function listInternalDocuments(kind: InternalDocKind): Promise<InternalDocRow[]> {
  return db
    .select({
      id: internalDocuments.id,
      kind: internalDocuments.kind,
      title: internalDocuments.title,
      docNumber: internalDocuments.docNumber,
      docDate: internalDocuments.docDate,
      fileName: internalDocuments.fileName,
      fileSize: internalDocuments.fileSize,
      uploadedAt: internalDocuments.uploadedAt,
      uploadedByUserId: internalDocuments.uploadedByUserId,
      uploaderName: users.fullName,
    })
    .from(internalDocuments)
    .leftJoin(users, eq(users.id, internalDocuments.uploadedByUserId))
    .where(eq(internalDocuments.kind, kind))
    .orderBy(sql`${internalDocuments.docDate} desc nulls last`, desc(internalDocuments.uploadedAt));
}

/** Yuklab olish / Wordda ochish uchun bitta hujjat (fayl manzili bilan). */
export async function getInternalDocument(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(internalDocuments).where(eq(internalDocuments.id, id)).limit(1);
  return row ?? null;
}
