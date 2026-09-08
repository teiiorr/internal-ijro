import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { normativeDocuments, users } from "@/lib/db/schema";

/** Barça meyoriy hujjatlar, eng yangisidan boşlab. `folder` maydoni `category` deb
 *  nomlangan — şunda hujjat komponenti (bosqiç hujjatlari bilan umumiy şaklda) uni özgartirişsiz körsata oladi. */
export async function listNormativeDocuments() {
  return db
    .select({
      id: normativeDocuments.id,
      fileUrl: normativeDocuments.fileUrl,
      fileName: normativeDocuments.fileName,
      fileSize: normativeDocuments.fileSize,
      category: normativeDocuments.folder,
      isLink: normativeDocuments.isLink,
      uploadedAt: normativeDocuments.uploadedAt,
      uploaderName: users.fullName,
    })
    .from(normativeDocuments)
    .leftJoin(users, eq(users.id, normativeDocuments.uploadedByUserId))
    .orderBy(desc(normativeDocuments.uploadedAt));
}
