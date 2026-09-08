import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  integer,
  decimal,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------- Lavozimlar / Rollar ----------
export const POSITIONS = [
  "direktor",
  "orinbosar",
  "koordinator",
  "bolim_boshligi",
  "bosh_mutaxassis",
  "yetakchi_mutaxassis",
  "mutaxassis",
  "hr",
  "kontragent",
] as const;
export type Position = (typeof POSITIONS)[number];

export const USER_STATUSES = ["pending", "active", "archived", "blocked"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// ---------- 5.5 departments ----------
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  nameUzLatn: varchar("name_uz_latn", { length: 255 }),
  nameUzCyrl: varchar("name_uz_cyrl", { length: 255 }),
  nameRu: varchar("name_ru", { length: 255 }),
  nameEn: varchar("name_en", { length: 255 }),
  description: text("description"),
  headUserId: uuid("head_user_id"),
  parentDepartmentId: uuid("parent_department_id").references((): AnyPgColumn => departments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.1 users ----------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    avatarUrl: text("avatar_url"),
    position: varchar("position", { length: 50 }).notNull().$type<Position>(),
    /** Berilganda lavozim yorliği örniga körsatiladigan erkin matnli lavozim nomi (masalan, "Ijrochi direktor").
     *  Ruxsatlarni baribir `position` boşqaradi; bu faqat körsatiş uçun. */
    positionTitle: varchar("position_title", { length: 200 }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    reportsToUserId: uuid("reports_to_user_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20 }).default("pending").notNull().$type<UserStatus>(),
    hireDate: date("hire_date"),
    terminationDate: date("termination_date"),
    languagePreference: varchar("language_preference", { length: 10 }).default("uz-latn").notNull(),
    themePreference: varchar("theme_preference", { length: 10 }).default("system").notNull(),
    timezone: varchar("timezone", { length: 50 }).default("Asia/Tashkent").notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    failedLoginCount: integer("failed_login_count").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    deptIdx: index("users_dept_idx").on(t.departmentId),
    reportsIdx: index("users_reports_idx").on(t.reportsToUserId),
    positionIdx: index("users_position_idx").on(t.position),
    statusIdx: index("users_status_idx").on(t.status),
  })
);

// ---------- 5.2 employee_profiles ----------
export const employeeProfiles = pgTable("employee_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  birthDate: date("birth_date"),
  passportSerial: varchar("passport_serial", { length: 20 }),
  passportNumber: varchar("passport_number", { length: 20 }),
  passportIssuedBy: text("passport_issued_by"),
  passportIssuedDate: date("passport_issued_date"),
  inn: varchar("inn", { length: 20 }),
  address: text("address"),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 100 }),
  maritalStatus: varchar("marital_status", { length: 20 }),
  education: text("education"),
  notesHr: text("notes_hr"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.3 employee_documents ----------
export const employeeDocuments = pgTable("employee_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  fileMimeType: varchar("file_mime_type", { length: 100 }),
  expirationDate: date("expiration_date"),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.4 position_history ----------
export const positionHistory = pgTable("position_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  oldPosition: varchar("old_position", { length: 50 }),
  newPosition: varchar("new_position", { length: 50 }).notNull(),
  oldDepartmentId: uuid("old_department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  newDepartmentId: uuid("new_department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason"),
  changeDate: timestamp("change_date", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.6b user_permissions (egasi bergan qöşimça ruxsatlar) ----------
// Örnatilgan lavozim/allowlist qoidalari ustiga qöşiladigan ruxsatlar. Egasi
// aynan bir odamga u aks holda ega bölmaydigan imkoniyatni (masalan, loyihalarni
// tahrirlaş, pulni köriş) beriş uçun bularni admin paneldan yoqadi.
export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    capability: varchar("capability", { length: 50 }).notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.capability] }),
    userIdx: index("user_permissions_user_idx").on(t.userId),
  })
);

// ---------- 5.6 coordinator_assignments ----------
export const coordinatorAssignments = pgTable(
  "coordinator_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coordinatorUserId: uuid("coordinator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("coordinator_assignments_uniq").on(t.coordinatorUserId, t.departmentId),
  })
);

// ---------- 5.7 external_companies ----------
export const externalCompanies = pgTable("external_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  logoUrl: text("logo_url"),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  specialization: text("specialization"),
  registrationData: text("registration_data"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  ndaAcceptedAt: timestamp("nda_accepted_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.8 projects ----------
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    /** Loyiha törida körsatiladigan kvadrat poster/muqova rasmi (null bölsa → placeholder). */
    posterUrl: text("poster_url"),
    type: varchar("type", { length: 20 }).notNull(),
    /**
     * Işlab çiqariş turi (9 ta seed qilingan `project_types`dan biri). NULL = erkin
     * şaklli `milestones` UI'sidan foydalanadigan eski loyiha. NULL bölmagan qiymat esa
     * şablonga asoslangan bosqiç tizimining yagona ajratuvçi belgisidir.
     */
    projectTypeId: uuid("project_type_id").references((): AnyPgColumn => projectTypes.id, {
      onDelete: "set null",
    }),
    /** Kontent janri (film / multserial / kitob …). Asosan pipeline turi kontent
     *  nima ekanini körsatmaydigan "Eksklyuziv loyihalar" loyihalari uçun. */
    genre: varchar("genre", { length: 40 }),
    externalCompanyId: uuid("external_company_id").references(() => externalCompanies.id, {
      onDelete: "set null",
    }),
    curatorUserId: uuid("curator_user_id").references(() => users.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).default("planning").notNull(),
    startDate: date("start_date"),
    deadline: date("deadline"),
    budget: decimal("budget", { precision: 15, scale: 2 }),
    budgetCurrency: varchar("budget_currency", { length: 10 }).default("UZS").notNull(),
    progressPercentage: integer("progress_percentage").default(0).notNull(),
    /** Qölda özgartiriş — hozirça faqat "on_hold". Null bölsa, hisoblab çiqarilgan status ustun turadi. */
    statusOverride: varchar("status_override", { length: 20 }),
    /** Erkin matnli "joriy holat" (current state) — menejerlar yangilab turadigan qisqa izoh. */
    currentStatus: text("current_status"),
    /**
     * Google Sheets sinxroni öz oxirgi marta yozgan qiymat. Sinxron faqat varaqdagi
     * matn ÖZGARGANda (bu ustundan farq qilganda) yozadi — şu tariqa ilova içida
     * qölda kiritilgan yangi izohni eskirgan varaq üstiga yozib öçirmaydi.
     */
    sheetSyncedStatus: text("sheet_synced_status"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("projects_status_idx").on(t.status),
    curatorIdx: index("projects_curator_idx").on(t.curatorUserId),
    companyIdx: index("projects_company_idx").on(t.externalCompanyId),
  })
);

// ---------- 5.8b loyiha kuratorlari (many-to-many) ----------
// Bir loyihada bir neça kurator bölişi mumkin. `projects.curator_user_id` eskisiga
// moslik uçun "asosiy" kurator sifatida saqlanadi; bu jadval esa töliq röyxatni tutadi.
export const projectCurators = pgTable(
  "project_curators",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").default(0).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
    projectIdx: index("project_curators_project_idx").on(t.projectId),
  })
);

// ---------- 5.9 milestones (bosqiçlar) ----------
export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").default(0).notNull(),
  deadline: date("deadline"),
  weight: integer("weight").default(1).notNull(),
  /** Bosqiç bajarilişi 0..100. Loyiha progressini hisoblaş uçun asosiy manba. */
  progress: integer("progress").default(0).notNull(),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.10 tasks ----------
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Rasmiy röyxatga oliş raqami, masalan 2026/05/18-01. Insert paytida yaratiladi. */
    registrationNumber: varchar("registration_number", { length: 32 }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "set null",
    }),
    /** Asosiy mas'ul — eskisiga moslik uçun saqlanadi. Har bir odam böyiça status uçun asosiy manba `taskAssignees`. */
    assignedToUserId: uuid("assigned_to_user_id")
      .notNull()
      .references(() => users.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 20 }).default("todo").notNull(),
    priority: varchar("priority", { length: 20 }).default("medium").notNull(),
    deadline: timestamp("deadline", { withTimezone: true }),
    estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
    actualHours: decimal("actual_hours", { precision: 6, scale: 2 }),
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurrenceRule: varchar("recurrence_rule", { length: 100 }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    assignedIdx: index("tasks_assigned_idx").on(t.assignedToUserId),
    creatorIdx: index("tasks_creator_idx").on(t.createdByUserId),
    projectIdx: index("tasks_project_idx").on(t.projectId),
    statusIdx: index("tasks_status_idx").on(t.status),
    deadlineIdx: index("tasks_deadline_idx").on(t.deadline),
    regNumIdx: uniqueIndex("tasks_registration_number_idx").on(t.registrationNumber),
  })
);

// ---------- 5.10b task_assignees — köp mas'ulli, har bir odam uçun alohida status + javob ----------
export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("todo").notNull(),
    /** Javob — mas'ul topşirgan javob */
    responseText: text("response_text"),
    responseFileUrl: text("response_file_url"),
    responseFileName: varchar("response_file_name", { length: 255 }),
    responseSubmittedAt: timestamp("response_submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.userId] }),
    userIdx: index("task_assignees_user_idx").on(t.userId),
  })
);

// ---------- 5.11 task yordamçi jadvallari ----------
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniq: uniqueIndex("task_deps_uniq").on(t.taskId, t.dependsOnTaskId),
  })
);

export const taskChecklistItems = pgTable("task_checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskAttachments = pgTable("task_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  fileMimeType: varchar("file_mime_type", { length: 100 }),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id").references((): AnyPgColumn => taskComments.id, {
    onDelete: "set null",
  }),
  mentions: uuid("mentions").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const taskWatchers = pgTable(
  "task_watchers",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.userId] }),
  })
);

// ---------- 5.12 deliverables ----------
export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  submittedByUserId: uuid("submitted_by_user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 20 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  message: text("message"),
  status: varchar("status", { length: 20 }).default("submitted").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  adminFeedback: text("admin_feedback"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.13 standup_reports ----------
export const standupReports = pgTable(
  "standup_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportDate: date("report_date").notNull(),
    doneYesterday: text("done_yesterday"),
    plannedToday: text("planned_today"),
    blockers: text("blockers"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("standup_user_date_uniq").on(t.userId, t.reportDate),
  })
);

// ---------- 5.14 leaves ----------
export const leaves = pgTable("leaves", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("leaves_user_idx").on(t.userId),
  statusIdx: index("leaves_status_idx").on(t.status),
}));

// ---------- 5.15 bildirişnomalar va sozlamalar ----------
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: varchar("link", { length: 500 }),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: uuid("related_entity_id"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userCreatedIdx: index("notifications_user_created_idx").on(t.userId, t.createdAt),
}));

export const notificationSettings = pgTable("notification_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  telegramEnabled: boolean("telegram_enabled").default(false).notNull(),
  telegramChatId: varchar("telegram_chat_id", { length: 50 }),
  notifyTaskAssigned: boolean("notify_task_assigned").default(true).notNull(),
  notifyTaskDeadline: boolean("notify_task_deadline").default(true).notNull(),
  notifyTaskComment: boolean("notify_task_comment").default(true).notNull(),
  notifyMention: boolean("notify_mention").default(true).notNull(),
  notifyStandupReminder: boolean("notify_standup_reminder").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.16 invitations ----------
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  position: varchar("position", { length: 50 }).notNull().$type<Position>(),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  reportsToUserId: uuid("reports_to_user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: varchar("full_name", { length: 255 }),
  token: varchar("token", { length: 255 }).notNull(),
  invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tokenIdx: uniqueIndex("invitations_token_idx").on(t.token),
}));

// ---------- Parolni tiklaş tokenlari ----------
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tokenIdx: uniqueIndex("password_reset_token_idx").on(t.token),
}));

// ---------- 5.17 activity_log ----------
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  createdIdx: index("activity_log_created_idx").on(t.createdAt),
  userIdx: index("activity_log_user_idx").on(t.userId),
}));

// ---------- 5.18 project_messages, ratings ----------
export const projectMessages = pgTable("project_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  stageId: uuid("stage_id").references(() => projectStages.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  /** Javob beriladigan xabar (Telegram uslubida). Iqtibos qilingan xabar öçirilsa, null qilinadi. */
  replyToId: uuid("reply_to_id").references((): AnyPgColumn => projectMessages.id, { onDelete: "set null" }),
  /** Xabar tahrirlanganda örnatiladi. */
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readByCuratorAt: timestamp("read_by_curator_at", { withTimezone: true }),
  readByContractorAt: timestamp("read_by_contractor_at", { withTimezone: true }),
}, (t) => ({
  stageIdx: index("project_messages_stage_idx").on(t.projectId, t.stageId),
}));

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  externalCompanyId: uuid("external_company_id").references(() => externalCompanies.id, {
    onDelete: "cascade",
  }),
  ratedByUserId: uuid("rated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  score: integer("score").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  scoreCheck: check("ratings_score_chk", sql`${t.score} BETWEEN 1 AND 5`),
}));

// ---------- 5.19 stage_templates ----------
// Tartiblangan bosqiç andozalari. Bitta şablon bir neça loyiha turi uçun
// qayta işlatiladi (1&2-turlar bittasini, 4&5 boşqasini birga işlatadi) → 9 turga 7 şablon.
export const stageTemplates = pgTable(
  "stage_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 40 }).notNull(),
    nameUzLatn: varchar("name_uz_latn", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    codeUniq: uniqueIndex("stage_templates_code_uniq").on(t.code),
  })
);

// ---------- 5.20 stage_template_items ----------
export const stageTemplateItems = pgTable(
  "stage_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => stageTemplates.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    nameUzLatn: varchar("name_uz_latn", { length: 255 }).notNull(),
    nameUzCyrl: varchar("name_uz_cyrl", { length: 255 }).notNull(),
    nameRu: varchar("name_ru", { length: 255 }).notNull(),
    defaultDurationDays: integer("default_duration_days"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderUniq: uniqueIndex("stage_template_items_order_uniq").on(t.templateId, t.orderIndex),
  })
);

// ---------- 5.21 project_types ----------
// 9 ta işlab çiqariş turi. `code` — barqaror slug; UI uçun lokallaştirilgan nomlar.
export const projectTypes = pgTable(
  "project_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 40 }).notNull(),
    nameUzLatn: varchar("name_uz_latn", { length: 255 }).notNull(),
    nameUzCyrl: varchar("name_uz_cyrl", { length: 255 }).notNull(),
    nameRu: varchar("name_ru", { length: 255 }).notNull(),
    stageTemplateId: uuid("stage_template_id")
      .notNull()
      .references(() => stageTemplates.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    codeUniq: uniqueIndex("project_types_code_uniq").on(t.code),
  })
);

// ---------- 5.22 project_stages ----------
// Turi belgilangan loyihaning har bir bosqiçi uçun bitta qator. Qat'iy ketma-ket
// holat maşinasi: bir vaqtda aynan bitta 'active' bosqiç; 'locked' bosqiçlar navbatma-navbat oçiladi.
export const projectStages = pgTable(
  "project_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    templateItemId: uuid("template_item_id").references(() => stageTemplateItems.id, {
      onDelete: "set null",
    }),
    orderIndex: integer("order_index").notNull(),
    /** Yaratiliş paytidagi şablon elementi nomining nusxasi — şablon tahrirlansa ham saqlanadi. */
    name: varchar("name", { length: 255 }).notNull(),
    /** 'locked' | 'active' | 'completed' */
    status: varchar("status", { length: 20 }).default("locked").notNull(),
    plannedStartDate: date("planned_start_date"),
    plannedDeadline: date("planned_deadline"),
    plannedAmount: decimal("planned_amount", { precision: 15, scale: 2 }),
    /** Har bir bosqiç böyiça şartnoma raqami (Şartnoma raqami). Standart qiymati "1". */
    contractNumber: varchar("contract_number", { length: 50 }).default("1").notNull(),
    /** true bölsa, bu bosqiçni yakunlaş aynan şu bosishda keyingi bosqiçni ham
     *  avtomatik yakunlaydi (birlaştirilgan "yagona umumiy bosqiç" — masalan, tayyorgarlik + suratga oliş). */
    mergeWithNext: boolean("merge_with_next").default(false).notNull(),
    responsibleUserId: uuid("responsible_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Körib çiqiş kiçik maşinasi, faqat status='active' bölgandagina ma'noli. "Kimning
     *  navbati" ekanini belgilaydi: 'in_progress'|'changes_requested' → studiya iş qarzdor,
     *  'submitted' → BKRM körib çiqişi qarz. Qabul qiliş status→completed holatiga aylanadi. */
    reviewStatus: varchar("review_status", { length: 20 }).default("in_progress").notNull(),
    /** Kuratorning eng sönggi özgartiriş sörovi izohi (studiya köradi). */
    reviewNote: text("review_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Studiya bu bosqiçda nima topşirişi kerakligi (studiyaga faqat öqiş uçun). */
    requirements: text("requirements"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Cron takrorini oldini oliş: har bir aktiv bosqiçga har turdan bittadan eslatma; ötişda tozalanadi.
    reminderApproachingSentAt: timestamp("reminder_approaching_sent_at", { withTimezone: true }),
    reminderOverdueSentAt: timestamp("reminder_overdue_sent_at", { withTimezone: true }),
    reminderStaleSentAt: timestamp("reminder_stale_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("project_stages_project_idx").on(t.projectId),
    orderUniq: uniqueIndex("project_stages_order_uniq").on(t.projectId, t.orderIndex),
    statusIdx: index("project_stages_status_idx").on(t.status),
    responsibleIdx: index("project_stages_responsible_idx").on(t.responsibleUserId),
    // Studiyalararo körib çiqiş navbatini quvvatlaydigan qisman indeks (migration 0025).
    reviewIdx: index("project_stages_review_idx").on(t.reviewStatus).where(sql`status = 'active'`),
  })
);

// ---------- 5.23 stage_documents ----------
// Har bir bosqiç uçun ilova fayllar — istalgan format. task_attachments'ni takrorlaydi.
export const stageDocuments = pgTable(
  "stage_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => projectStages.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    fileMimeType: varchar("file_mime_type", { length: 120 }),
    /** Foydalanuvçi belgilagan papka/yorliq (masalan, "Hisobotlar", "To'lovlar"). NULL = kategoriyasiz. */
    category: varchar("category", { length: 120 }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    stageIdx: index("stage_documents_stage_idx").on(t.stageId),
    categoryIdx: index("stage_documents_category_idx").on(t.stageId, t.category),
  })
);

// ---------- project_documents ----------
// Bosqiçlar röyxati ostida körsatiladigan loyiha darajasidagi hujjat bölimlari:
// tahlil ("tahlil" — Loyiha böyiça tahlil), xalqaro tajriba
// ("xalqaro_tajriba" — Xalqaro tajriba) va tölov hujjatlari
// ("payment" — cheklar / hisob-fakturalar, ixtiyoriy papka böyiça guruhlangan).
// Har bir yuklangan faylga bitta qator.
export const PROJECT_DOC_KINDS = ["tahlil", "xalqaro_tajriba", "payment"] as const;
export type ProjectDocKind = (typeof PROJECT_DOC_KINDS)[number];

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** 'tahlil' | 'xalqaro_tajriba' | 'payment' */
    kind: varchar("kind", { length: 32 }).notNull(),
    /** Yuklovçi kiritgan ixtiyoriy papka nomi ('payment' bölimida işlatiladi). */
    folder: varchar("folder", { length: 120 }),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    fileMimeType: varchar("file_mime_type", { length: 120 }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("project_documents_project_idx").on(t.projectId),
    kindIdx: index("project_documents_kind_idx").on(t.projectId, t.kind),
  })
);

// ---------- normative_documents ----------
// Taşkilot böylab amal qiladigan me'yoriy hujjatlar ("Me'yoriy hujjatlar"),
// foydalanuvçi kiritgan ixtiyoriy papka böyiça guruhlangan. Hiç bir loyiha yoki bosqiçga boğlanmagan.
export const normativeDocuments = pgTable(
  "normative_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Yuklovçi kiritgan ixtiyoriy papka nomi. NULL = kategoriyasiz. */
    folder: varchar("folder", { length: 120 }),
    /** true → bu yozuv taşqi havola (fileUrl URL'ni saqlaydi, diskda fayl yöq). */
    isLink: boolean("is_link").default(false).notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    fileMimeType: varchar("file_mime_type", { length: 120 }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    folderIdx: index("normative_documents_folder_idx").on(t.folder),
  })
);

// ---------- 5.24 stage_payments ----------
// Har bir bosqiçda bir neça tölov. Loyiha jami = uning barça bosqiçlari böyiça Σ.
export const stagePayments = pgTable(
  "stage_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => projectStages.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("UZS").notNull(),
    /** 'pending' | 'paid' */
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    note: varchar("note", { length: 500 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    stageIdx: index("stage_payments_stage_idx").on(t.stageId),
  })
);

// ---------- 5.25 council_meetings (Ekspertlar / Smeta Kengashi) ----------
export const councilMeetings = pgTable(
  "council_meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 'ekspert' = Ekspertlar Kengashi · 'smeta' = Smeta Kengashi */
    kind: varchar("kind", { length: 10 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    title: varchar("title", { length: 255 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    kindIdx: index("council_meetings_kind_idx").on(t.kind, t.scheduledAt),
  })
);

// ---------- 5.26 council_agenda_items (Kun tartibi) ----------
export const councilAgendaItems = pgTable(
  "council_agenda_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => councilMeetings.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").default(0).notNull(),
    topic: varchar("topic", { length: 500 }).notNull(), // Mavzu
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }), // Loyiha (tizimdagi)
    /** Röyxatdan ötmagan loyiha bölganda erkin matnli loyiha nomi (projectId null). */
    projectName: varchar("project_name", { length: 255 }),
    presenterUserId: uuid("presenter_user_id").references(() => users.id, { onDelete: "set null" }), // Ma'ruzaçi (tizimdagi)
    /** Röyxatdan ötmagan foydalanuvçi bölganda erkin matnli ma'ruzaçi nomi (presenterUserId null). */
    presenterName: varchar("presenter_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    meetingIdx: index("council_agenda_items_meeting_idx").on(t.meetingId),
  })
);

// ---------- 5.27 contests (Tanlov orqali ötgan loyihalar) ----------
// Loyiha ötgan tender/tanlov: uning nomi, neça studiya qatnaşgani va
// kim ğolib bölgani. Suratlar contest_photos'da saqlanadi.
export const contests = pgTable(
  "contests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(), // Tanlov nomi
    participantsCount: integer("participants_count").default(0).notNull(), // iştirokçilar soni
    winnerName: varchar("winner_name", { length: 255 }), // Ğolib (studiya / loyiha)
    winnerProjectId: uuid("winner_project_id").references(() => projects.id, { onDelete: "set null" }),
    /** Ğolib e'lon qilinadigan ekranda körsatiladigan logotipi. */
    winnerLogoUrl: text("winner_logo_url"),
    description: text("description"),
    heldAt: date("held_at"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    heldIdx: index("contests_held_idx").on(t.heldAt),
  })
);

// ---------- 5.28 contest_photos ----------
export const contestPhotos = pgTable(
  "contest_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    caption: varchar("caption", { length: 255 }), // ixtiyoriy izoh
    orderIndex: integer("order_index").default(0).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contestIdx: index("contest_photos_contest_idx").on(t.contestId),
  })
);

// ---------- 5.29 contest_files (hujjatlar) ----------
export const contestFiles = pgTable(
  "contest_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    fileMimeType: varchar("file_mime_type", { length: 120 }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contestIdx: index("contest_files_contest_idx").on(t.contestId),
  })
);

// ---------- 5.30 contest_comments (izohlar) ----------
export const contestComments = pgTable(
  "contest_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    body: varchar("body", { length: 2000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contestIdx: index("contest_comments_contest_idx").on(t.contestId),
  })
);

// Qulaylik uçun aniqlangan tiplarni qayta eksport qilamiz
export type User = typeof users.$inferSelect;
export type CouncilMeeting = typeof councilMeetings.$inferSelect;
export type CouncilAgendaItem = typeof councilAgendaItems.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type ProjectType = typeof projectTypes.$inferSelect;
export type StageTemplate = typeof stageTemplates.$inferSelect;
export type StageTemplateItem = typeof stageTemplateItems.$inferSelect;
export type ProjectStage = typeof projectStages.$inferSelect;
export type NewProjectStage = typeof projectStages.$inferInsert;
export type StageDocument = typeof stageDocuments.$inferSelect;
export type StagePayment = typeof stagePayments.$inferSelect;
