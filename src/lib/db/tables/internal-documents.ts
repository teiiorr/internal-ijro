import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, integer, date, index, check } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";

// "Ichki hujjatlar": bildirgilar (xizmat xatlari) va buyruqlar. Barcha ichki xodimlar
// yuklaydi va koʻradi; kontragentlar (studiyalar) hech qachon. Jadval 0044 migratsiyasi
// bilan yaratiladi (qoʻlda, psql orqali — drizzle journali 0024 da toʻxtagan).

export const INTERNAL_DOC_KINDS = ["bildirgi", "buyruq"] as const;
export type InternalDocKind = (typeof INTERNAL_DOC_KINDS)[number];

export const internalDocuments = pgTable(
  "internal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "bildirgi" yoki "buyruq". */
    kind: varchar("kind", { length: 20 }).$type<InternalDocKind>().notNull(),
    /** Hujjat nomi (berilmasa, fayl nomi kengaytmasiz). */
    title: varchar("title", { length: 300 }).notNull(),
    /** Ixtiyoriy hujjat raqami (masalan "15-son" yoki "B-128"). */
    docNumber: varchar("doc_number", { length: 60 }),
    /** Hujjat sanasi (YYYY-MM-DD). */
    docDate: date("doc_date"),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    fileMimeType: varchar("file_mime_type", { length: 120 }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    kindDateIdx: index("internal_documents_kind_date_idx").on(t.kind, t.docDate, t.uploadedAt),
    kindCheck: check("internal_documents_kind_chk", sql`${t.kind} in ('bildirgi','buyruq')`),
  })
);
