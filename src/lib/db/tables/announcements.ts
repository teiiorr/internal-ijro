import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";
import type { Audience } from "@/lib/audience";

// Eʼlonlar va soʻrovnomalar (staff: announcements). Jadvallar schema.ts ga
// qoʻshilmaydi — ular shu yerda yashaydi va 0031 migratsiyasi bilan yaratiladi.
// Bu jadvallardan har bir oʻqish try/catch bilan himoyalangan (migratsiya prod'da
// hali qoʻllanmagan boʻlishi mumkin).

export const ANNOUNCEMENT_IMPORTANCE = ["normal", "important"] as const;
export type AnnouncementImportance = (typeof ANNOUNCEMENT_IMPORTANCE)[number];

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    attachmentUrl: text("attachment_url"),
    attachmentName: varchar("attachment_name", { length: 255 }),
    audience: jsonb("audience").notNull().$type<Audience>(),
    importance: varchar("importance", { length: 10 }).default("normal").notNull().$type<AnnouncementImportance>(),
    pinnedUntil: timestamp("pinned_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdIdx: index("announcements_created_idx").on(t.createdAt),
  })
);

export const announcementReads = pgTable(
  "announcement_reads",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.announcementId, t.userId] }),
  })
);

export const announcementPolls = pgTable("announcement_polls", {
  announcementId: uuid("announcement_id")
    .primaryKey()
    .references(() => announcements.id, { onDelete: "cascade" }),
  question: varchar("question", { length: 500 }).notNull(),
  multi: boolean("multi").default(false).notNull(),
  anonymous: boolean("anonymous").default(false).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }),
});

export const announcementPollOptions = pgTable(
  "announcement_poll_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
  },
  (t) => ({
    annIdx: index("announcement_poll_options_ann_idx").on(t.announcementId),
  })
);

export const announcementPollVotes = pgTable(
  "announcement_poll_votes",
  {
    optionId: uuid("option_id")
      .notNull()
      .references(() => announcementPollOptions.id, { onDelete: "cascade" }),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.optionId, t.userId] }),
    annIdx: index("announcement_poll_votes_ann_idx").on(t.announcementId),
  })
);
