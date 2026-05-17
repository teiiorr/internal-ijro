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

// ---------- Positions / Roles ----------
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- 5.8 projects ----------
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 20 }).notNull(),
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

// ---------- 5.9 milestones ----------
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
    /** Official registration number, e.g. 2026/05/18-01. Generated on insert. */
    registrationNumber: varchar("registration_number", { length: 32 }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "set null",
    }),
    /** Primary assignee — kept for backward compat. Source of truth for status per person is `taskAssignees`. */
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

// ---------- 5.10b task_assignees — multi-assignee with per-person status + javob ----------
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
    /** Javob — response submitted by the assignee */
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

// ---------- 5.11 task auxiliary ----------
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
});

// ---------- 5.15 notifications & settings ----------
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
});

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

// ---------- Password reset tokens ----------
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
});

// ---------- 5.18 project_messages, ratings ----------
export const projectMessages = pgTable("project_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readByCuratorAt: timestamp("read_by_curator_at", { withTimezone: true }),
  readByContractorAt: timestamp("read_by_contractor_at", { withTimezone: true }),
});

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

// Re-export inferred types for convenience
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
