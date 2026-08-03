import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { normativeDocuments, users } from "@/lib/db/schema";

/** All normative documents, newest first. `folder` is aliased to `category` so the
 *  document component (shared shape with stage docs) can render it unchanged. */
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
