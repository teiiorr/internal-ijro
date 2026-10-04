import { pgTable, uuid, varchar, text, date, timestamp, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
// Relative imports on purpose: this file is loaded by the standalone worker
// (scripts/jobs/normative-ack-reminders.ts), which must not depend on the "@/" alias.
import { normativeDocuments, users } from "../schema";
// Type-only (erased at runtime) — audience.ts itself is server-only.
import type { Audience } from "../../audience";
import type { DocStatus, DocType } from "../../../components/staff/normative-ack/logic";

/**
 * Meʼyoriy hujjatlar reyestri va tanishtirish varaqasi (staff: normative-ack).
 *
 * Jadvallar schema.ts ga qoʻshilmaydi va 0031 migratsiyasi bilan yaratiladi —
 * ulardan har bir oʻqish try/catch bilan himoyalangan (migratsiya prod'da hali
 * qoʻllanmagan boʻlishi mumkin).
 */

/** Rekvizitlar: turi, raqami, sanasi, qabul qilgan organ, amalda / oʻz kuchini yoʻqotgan. */
export const normativeDocumentMeta = pgTable("normative_document_meta", {
  documentId: uuid("document_id")
    .primaryKey()
    .references(() => normativeDocuments.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 30 }).$type<DocType>(),
  docNumber: varchar("doc_number", { length: 60 }),
  /** YYYY-MM-DD */
  docDate: date("doc_date"),
  issuedBy: varchar("issued_by", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active").notNull().$type<DocStatus>(),
  /** Shu hujjatni almashtirgan yangi tahrir (status = 'repealed' boʻlganda). */
  supersededById: uuid("superseded_by_id").references(() => normativeDocuments.id, { onDelete: "set null" }),
  summary: text("summary"),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Tanishtirishga yuborish soʻrovi: hujjat + auditoriya + muddat. */
export const normativeAckRequests = pgTable(
  "normative_ack_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => normativeDocuments.id, { onDelete: "cascade" }),
    audience: jsonb("audience").notNull().$type<Audience>(),
    /** Toshkent sanasi (YYYY-MM-DD). */
    deadline: date("deadline").notNull(),
    message: text("message"),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reminderDueSentAt: timestamp("reminder_due_sent_at", { withTimezone: true }),
    reminderOverdueSentAt: timestamp("reminder_overdue_sent_at", { withTimezone: true }),
    lastManualReminderAt: timestamp("last_manual_reminder_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("normative_ack_requests_doc_idx").on(t.documentId)]
);

/** Har bir qabul qiluvchi uchun bitta qator: ochgan va tanishgan vaqti. */
export const normativeAcknowledgements = pgTable(
  "normative_acknowledgements",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => normativeAckRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.requestId, t.userId] }),
    index("normative_acknowledgements_user_idx").on(t.userId, t.acknowledgedAt),
  ]
);

export type NormativeDocumentMetaRow = typeof normativeDocumentMeta.$inferSelect;
export type NormativeAckRequestRow = typeof normativeAckRequests.$inferSelect;
export type NormativeAcknowledgementRow = typeof normativeAcknowledgements.$inferSelect;
