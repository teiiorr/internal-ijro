import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";

// ---------- employee_contact_cards (Tashkiliy tuzilma — xodimning kontakt kartasi) ----------
// Har bir xodim oʻz kartasini Sozlamalar sahifasida tahrirlaydi (HR — har kimnikini).
// Mobil raqam (users.phone) maʼlumotnomada faqat show_mobile = true boʻlganda koʻrinadi.
// Jadval schema.ts ga qoʻshilmaydi; 0031 migratsiyasi bilan yaratiladi. Undan har bir
// oʻqish try/catch bilan himoyalangan (migratsiya prod'da hali qoʻllanmagan boʻlishi mumkin).
export const employeeContactCards = pgTable(
  "employee_contact_cards",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    workPhone: varchar("work_phone", { length: 50 }),
    internalExt: varchar("internal_ext", { length: 10 }),
    room: varchar("room", { length: 50 }),
    /** "@" belgisisiz saqlanadi. */
    telegramUsername: varchar("telegram_username", { length: 64 }),
    bio: varchar("bio", { length: 500 }),
    /** Kichik harflarga keltirilgan, takrorlanmaydigan koʻnikmalar (koʻpi bilan 15 ta). */
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    showMobile: boolean("show_mobile").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    skillsIdx: index("employee_contact_cards_skills_idx").using("gin", t.skills),
  })
);

export type EmployeeContactCard = typeof employeeContactCards.$inferSelect;
