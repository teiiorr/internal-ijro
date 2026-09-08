-- Stage review sub-machine (studio ↔ staff collaboration loop).
-- Idempotent: safe to re-run on prod.
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "review_status" varchar(20) NOT NULL DEFAULT 'in_progress';
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "review_note" text;
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" uuid;
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "submitted_by_user_id" uuid;
ALTER TABLE "project_stages" ADD COLUMN IF NOT EXISTS "requirements" text;

DO $$ BEGIN
  ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_reviewed_by_fk"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_submitted_by_fk"
    FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cheap cross-project "waiting on me" review-queue lookup.
CREATE INDEX IF NOT EXISTS "project_stages_review_idx" ON "project_stages" ("review_status") WHERE "status" = 'active';
