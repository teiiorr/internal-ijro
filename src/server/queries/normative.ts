import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { normativeDocuments, users } from "@/lib/db/schema";
import { getDocMetaMap, type DocMeta } from "@/server/queries/normative-ack";

/** Barça meyoriy hujjatlar, eng yangisidan boşlab. `folder` maydoni `category` deb
 *  nomlangan — şunda hujjat komponenti (bosqiç hujjatlari bilan umumiy şaklda) uni özgartirişsiz körsata oladi.
 *  Har bir qatorga reyestr rekvizitlari (`meta`) alohida, try/catch bilan himoyalangan sörovda qöşiladi —
 *  0031 migratsiyasi qöllanmagan bölsa `meta: null`. */
export async function listNormativeDocuments() {
  const rows = await db
    .select({
      id: normativeDocuments.id,
      fileUrl: normativeDocuments.fileUrl,
      fileName: normativeDocuments.fileName,
      fileSize: normativeDocuments.fileSize,
      category: normativeDocuments.folder,
      isLink: normativeDocuments.isLink,
      uploadedAt: normativeDocuments.uploadedAt,
      uploaderName: users.fullName,
      uploadedByUserId: normativeDocuments.uploadedByUserId,
    })
    .from(normativeDocuments)
    .leftJoin(users, eq(users.id, normativeDocuments.uploadedByUserId))
    .orderBy(desc(normativeDocuments.uploadedAt));

  let metaMap = new Map<string, DocMeta>();
  try {
    metaMap = await getDocMetaMap(rows.map((r) => r.id));
  } catch {
    /* rekvizitlarsiz davom etamiz */
  }
  return rows.map((r) => ({ ...r, meta: metaMap.get(r.id) ?? null }));
}
