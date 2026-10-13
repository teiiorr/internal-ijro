import { pgTable, uuid, varchar, timestamp, index, integer, text } from "drizzle-orm/pg-core";
import { projects, users } from "../schema";

/**
 * Smeta komissiyasiga oʻtgan loyihalar — komissiya koʻrib chiqayotgan loyihalar roʻyxati.
 *
 * Nom erkin matn; tizimdagi loyiha nomiga aynan mos kelsa, `project_id` bogʻlanadi
 * (roʻyxatda loyiha sahifasiga havola boʻladi).
 *
 * Jadval schema.ts ga qoʻshilmaydi va 0032 migratsiyasi bilan yaratiladi —
 * undan har bir oʻqish try/catch bilan himoyalangan.
 *
 * `session_number` / `poster_url` / `info` — 0035 migratsiyasi bilan qoʻshiladi
 * (son boʻyicha guruhlash + poster/maʼlumot). Ular hali qoʻllanmagan boʻlishi mumkin,
 * shuning uchun bu ustunlarni oʻqish/yozish 42703 (undefined_column) uchun himoyalangan.
 */
export const smetaCommissionProjects = pgTable(
  "smeta_commission_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 300 }).notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** Qaysi "son"da koʻrib chiqilgan — son boʻyicha guruhlash uchun (0035). */
    sessionNumber: integer("session_number"),
    /** Loyiha posteri (mavjud loyihadan koʻchiriladi yoki qoʻlda havola) (0035). */
    posterUrl: text("poster_url"),
    /** Qisqa maʼlumot/izoh (0035). */
    info: text("info"),
  },
  (t) => [
    index("smeta_commission_projects_created_idx").on(t.createdAt),
    index("smeta_commission_projects_session_idx").on(t.sessionNumber),
  ]
);
