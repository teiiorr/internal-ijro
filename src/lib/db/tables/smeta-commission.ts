import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { projects, users } from "../schema";

/**
 * Smeta komissiyasiga oʻtgan loyihalar — komissiya koʻrib chiqayotgan loyihalar roʻyxati.
 *
 * Nom erkin matn; tizimdagi loyiha nomiga aynan mos kelsa, `project_id` bogʻlanadi
 * (roʻyxatda loyiha sahifasiga havola boʻladi).
 *
 * Jadval schema.ts ga qoʻshilmaydi va 0032 migratsiyasi bilan yaratiladi —
 * undan har bir oʻqish try/catch bilan himoyalangan.
 */
export const smetaCommissionProjects = pgTable(
  "smeta_commission_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 300 }).notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("smeta_commission_projects_created_idx").on(t.createdAt)]
);
