-- Xodimlar uchun yangi imkoniyatlar (12 ta funksiya): eslatmalar, ijro nazorati, topshiriq tahriri,
-- Mening ishlarim, tuzilma, eʼlonlar, meʼyoriy hujjatlar bilan tanishtirish, kengash qarorlari, haftalik brifing, muddat surilishi.
-- Faqat YANGI jadvallar — mavjud jadvallarga tegmaydi (additive, takroriy ishga tushirish xavfsiz).

-- ===================== task-reminders =====================
-- task-reminders: dedupe log for the daily task-reminder pass (assignee reminders, creator escalations, morning digest)
CREATE TABLE IF NOT EXISTS "task_reminder_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" varchar(30) NOT NULL,
  "deadline_date" date,
  "sent_on" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "task_reminder_log_task_uniq" ON "task_reminder_log" ("task_id","user_id","kind","deadline_date") WHERE "task_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "task_reminder_log_digest_uniq" ON "task_reminder_log" ("user_id","sent_on") WHERE "kind" = 'digest';
CREATE INDEX IF NOT EXISTS "task_reminder_log_sent_idx" ON "task_reminder_log" ("sent_on");

-- ===================== task-control =====================
-- task-control: "Eslatish" (nudge) log — one row per reminder a task giver sends to an assignee.
CREATE TABLE IF NOT EXISTS "task_nudges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "from_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "to_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "message" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "task_nudges_task_to_idx" ON "task_nudges" ("task_id","to_user_id","created_at");

-- ===================== task-edit =====================
-- task-edit: deadline extension requests (task_deadline_requests)
CREATE TABLE IF NOT EXISTS "task_deadline_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "requested_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "previous_deadline" timestamp with time zone,
  "requested_deadline" timestamp with time zone NOT NULL,
  "reason" text NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "decided_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decision_note" text,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "task_deadline_requests_task_idx" ON "task_deadline_requests" ("task_id");
CREATE INDEX IF NOT EXISTS "task_deadline_requests_status_idx" ON "task_deadline_requests" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "task_deadline_requests_pending_uniq" ON "task_deadline_requests" ("task_id","requested_by_user_id") WHERE "status" = 'pending';

-- ===================== my-work =====================
-- my-work: shaxsiy eslatmalar (personal_todos). Faqat egasi koʻradi; activity_log'ga yozilmaydi.
CREATE TABLE IF NOT EXISTS "personal_todos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "note" text,
  "due_date" date,
  "linked_task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  "linked_project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "done_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "personal_todos_user_idx" ON "personal_todos" ("user_id","done_at","due_date");

-- ===================== staff-directory =====================
-- staff-directory: xodimlarning kontakt kartalari (Tashkiliy tuzilma / maʼlumotnoma)
CREATE TABLE IF NOT EXISTS "employee_contact_cards" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "work_phone" varchar(50),
  "internal_ext" varchar(10),
  "room" varchar(50),
  "telegram_username" varchar(64),
  "bio" varchar(500),
  "skills" text[] DEFAULT '{}'::text[] NOT NULL,
  "show_mobile" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "employee_contact_cards_skills_idx" ON "employee_contact_cards" USING gin ("skills");

-- ===================== announcements =====================
-- announcements: Eʼlonlar va soʻrovnomalar (faqat YANGI jadvallar, idempotent)
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text,
  "attachment_url" text,
  "attachment_name" varchar(255),
  "audience" jsonb NOT NULL,
  "importance" varchar(10) DEFAULT 'normal' NOT NULL,
  "pinned_until" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "author_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "last_reminded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "announcements_created_idx" ON "announcements" ("created_at");
CREATE TABLE IF NOT EXISTS "announcement_reads" (
  "announcement_id" uuid NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "read_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("announcement_id","user_id")
);
CREATE TABLE IF NOT EXISTS "announcement_polls" (
  "announcement_id" uuid PRIMARY KEY NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "question" varchar(500) NOT NULL,
  "multi" boolean DEFAULT false NOT NULL,
  "anonymous" boolean DEFAULT false NOT NULL,
  "closes_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "announcement_poll_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "announcement_id" uuid NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "label" varchar(255) NOT NULL,
  "order_index" integer DEFAULT 0 NOT NULL
);
CREATE INDEX IF NOT EXISTS "announcement_poll_options_ann_idx" ON "announcement_poll_options" ("announcement_id");
CREATE TABLE IF NOT EXISTS "announcement_poll_votes" (
  "option_id" uuid NOT NULL REFERENCES "announcement_poll_options"("id") ON DELETE CASCADE,
  "announcement_id" uuid NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("option_id","user_id")
);
CREATE INDEX IF NOT EXISTS "announcement_poll_votes_ann_idx" ON "announcement_poll_votes" ("announcement_id");

-- ===================== normative-ack =====================
-- normative-ack: Meʼyoriy hujjatlar reyestri va tanishtirish varaqasi (faqat YANGI jadvallar, idempotent)
CREATE TABLE IF NOT EXISTS "normative_document_meta" (
  "document_id" uuid PRIMARY KEY NOT NULL REFERENCES "normative_documents"("id") ON DELETE CASCADE,
  "doc_type" varchar(30),
  "doc_number" varchar(60),
  "doc_date" date,
  "issued_by" varchar(255),
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "superseded_by_id" uuid REFERENCES "normative_documents"("id") ON DELETE SET NULL,
  "summary" text,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "normative_ack_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "normative_documents"("id") ON DELETE CASCADE,
  "audience" jsonb NOT NULL,
  "deadline" date NOT NULL,
  "message" text,
  "requested_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reminder_due_sent_at" timestamp with time zone,
  "reminder_overdue_sent_at" timestamp with time zone,
  "last_manual_reminder_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "normative_ack_requests_doc_idx" ON "normative_ack_requests" ("document_id");
CREATE TABLE IF NOT EXISTS "normative_acknowledgements" (
  "request_id" uuid NOT NULL REFERENCES "normative_ack_requests"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "opened_at" timestamp with time zone,
  "acknowledged_at" timestamp with time zone,
  PRIMARY KEY ("request_id","user_id")
);
CREATE INDEX IF NOT EXISTS "normative_acknowledgements_user_idx" ON "normative_acknowledgements" ("user_id","acknowledged_at");

-- ===================== council-resolutions =====================
-- council-resolutions: Kengash qarorlari ijrosi — numbered resolution points of Ekspert / Smeta meetings.
-- status is the MANUAL state (open | done | cancelled); a tasked point's effective state follows its task.
CREATE TABLE IF NOT EXISTS "council_resolutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "council_meetings"("id") ON DELETE CASCADE,
  "agenda_item_id" uuid REFERENCES "council_agenda_items"("id") ON DELETE SET NULL,
  "number" integer NOT NULL,
  "text" text NOT NULL,
  "responsible_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "due_date" date,
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "closed_note" text,
  "closed_at" timestamp with time zone,
  "closed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reminder_due_sent_at" timestamp with time zone,
  "reminder_overdue_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "council_resolutions_meeting_idx" ON "council_resolutions" ("meeting_id");
CREATE INDEX IF NOT EXISTS "council_resolutions_status_due_idx" ON "council_resolutions" ("status","due_date");
CREATE INDEX IF NOT EXISTS "council_resolutions_task_idx" ON "council_resolutions" ("task_id");
CREATE INDEX IF NOT EXISTS "council_resolutions_resp_idx" ON "council_resolutions" ("responsible_user_id");

-- ===================== weekly-brief =====================
-- weekly-brief: haftalik rahbar brifingi snapshotlari (weekly_snapshots)
-- Har bir tugagan hafta (dushanba, Toshkent sanasi) uchun bitta qator: muzlatilgan koʻrsatkichlar,
-- "Hafta xulosasi" va rahbarlarga xabar yuborilgan vaqt. Takroriy ishga tushirish xavfsiz.
CREATE TABLE IF NOT EXISTS "weekly_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "week_start" date NOT NULL,
  "metrics" jsonb NOT NULL,
  "summary_note" text,
  "summary_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "summary_updated_at" timestamp with time zone,
  "notified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_snapshots_week_uniq" ON "weekly_snapshots" ("week_start");

-- ===================== deadline-slippage =====================
-- deadline-slippage: bosqich muddatlari tarixi (stage_deadline_changes)
CREATE TABLE IF NOT EXISTS "stage_deadline_changes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL REFERENCES "project_stages"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "old_deadline" date,
  "new_deadline" date,
  "delta_days" integer,
  "source" varchar(20) NOT NULL,
  "stage_request_id" uuid REFERENCES "stage_requests"("id") ON DELETE SET NULL,
  "reason" text,
  "changed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "stage_deadline_changes_project_idx" ON "stage_deadline_changes" ("project_id","created_at");
CREATE INDEX IF NOT EXISTS "stage_deadline_changes_stage_idx" ON "stage_deadline_changes" ("stage_id");
-- Backfill: activity_log'dagi har bir 'stage.deadline_changed' yozuvi → bitta 'backfill' qatori.
-- old_deadline = logdagi old_value (yangi kod yozadi), boʻlmasa shu bosqich oldingi log yozuvining sanasi (LAG);
-- delta_days = yangi − eski.
-- Takroriy ishga tushirish xavfsiz: (stage_id, created_at) boʻyicha mavjud backfill qatori boʻlsa
-- qoʻshilmaydi; kuzatuv boshlangandan keyingi loglar ('manual' qatori bor) backfill qilinmaydi.
INSERT INTO "stage_deadline_changes" ("stage_id","project_id","old_deadline","new_deadline","delta_days","source","changed_by_user_id","created_at")
SELECT h."stage_id", h."project_id", h."old_deadline", h."new_deadline",
       CASE WHEN h."old_deadline" IS NOT NULL AND h."new_deadline" IS NOT NULL THEN h."new_deadline" - h."old_deadline" END,
       'backfill', h."user_id", h."created_at"
FROM (
  SELECT l."stage_id", l."project_id", l."user_id", l."created_at", l."new_deadline",
         CASE WHEN l."has_old" THEN l."logged_old"
              ELSE LAG(l."new_deadline") OVER (PARTITION BY l."stage_id" ORDER BY l."created_at") END AS "old_deadline"
  FROM (
    SELECT al."entity_id" AS "stage_id", ps."project_id", al."user_id", al."created_at",
           CASE WHEN (al."new_value"->>'plannedDeadline') ~ '^\d{4}-\d{2}-\d{2}$' THEN (al."new_value"->>'plannedDeadline')::date ELSE NULL END AS "new_deadline",
           (al."old_value" -> 'plannedDeadline') IS NOT NULL AS "has_old",
           CASE WHEN (al."old_value"->>'plannedDeadline') ~ '^\d{4}-\d{2}-\d{2}$' THEN (al."old_value"->>'plannedDeadline')::date ELSE NULL END AS "logged_old"
    FROM "activity_log" al
    JOIN "project_stages" ps ON ps."id" = al."entity_id"
    WHERE al."action" = 'stage.deadline_changed' AND al."entity_type" = 'project_stage'
  ) l
) h
WHERE h."created_at" < COALESCE((SELECT min(x."created_at") FROM "stage_deadline_changes" x WHERE x."source" <> 'backfill'), 'infinity'::timestamptz)
  AND NOT EXISTS (SELECT 1 FROM "stage_deadline_changes" x WHERE x."source" = 'backfill' AND x."stage_id" = h."stage_id" AND x."created_at" = h."created_at");
