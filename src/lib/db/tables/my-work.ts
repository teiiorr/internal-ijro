import { pgTable, uuid, varchar, text, date, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users, tasks, projects } from "@/lib/db/schema";

// ---------- personal_todos (Mening ishlarim — shaxsiy eslatmalar) ----------
// Faqat egasi koʻradi va oʻzgartiradi. activity_log'ga yozilmaydi, eksport qilinmaydi,
// boshqaruv panellaridagi hisoblagichlarga qoʻshilmaydi. Migratsiya: 0031 (my-work boʻlimi).
export const personalTodos = pgTable(
  "personal_todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    note: text("note"),
    /** Toshkent kalendar kuni; null — sanasiz eslatma. */
    dueDate: date("due_date"),
    linkedTaskId: uuid("linked_task_id").references(() => tasks.id, { onDelete: "set null" }),
    linkedProjectId: uuid("linked_project_id").references(() => projects.id, { onDelete: "set null" }),
    orderIndex: integer("order_index").default(0).notNull(),
    /** Bajarilgan vaqti; null — ochiq. Bajarilganlar 24 soat davomida chizilgan holda koʻrinadi. */
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("personal_todos_user_idx").on(t.userId, t.doneAt, t.dueDate),
  })
);

export type PersonalTodo = typeof personalTodos.$inferSelect;
