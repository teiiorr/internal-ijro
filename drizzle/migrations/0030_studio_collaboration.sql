-- Studiya ↔ xodim hamkorligi: "Joriy holat" tarixi, bosqich progressi, studiya so'rovlari.
-- Faqat YANGI jadvallar — mavjud jadvallarga tegmaydi (additive, takroriy ishga tushirish xavfsiz).

CREATE TABLE IF NOT EXISTS "project_status_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "project_status_updates_project_idx" ON "project_status_updates" ("project_id", "created_at");

CREATE TABLE IF NOT EXISTS "stage_progress_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL REFERENCES "project_stages"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "progress" integer NOT NULL,
  "note" text,
  "reported_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "stage_progress_reports_progress_chk" CHECK ("progress" BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS "stage_progress_reports_stage_idx" ON "stage_progress_reports" ("stage_id", "created_at");

CREATE TABLE IF NOT EXISTS "stage_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "stage_id" uuid NOT NULL REFERENCES "project_stages"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "message" text NOT NULL,
  "requested_deadline" date,
  "requested_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decision_note" text,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "stage_requests_project_idx" ON "stage_requests" ("project_id");
CREATE INDEX IF NOT EXISTS "stage_requests_status_idx" ON "stage_requests" ("status");
