-- Telegram-style message actions: reply + edit. Idempotent.
ALTER TABLE "project_messages" ADD COLUMN IF NOT EXISTS "reply_to_id" uuid;
ALTER TABLE "project_messages" ADD COLUMN IF NOT EXISTS "edited_at" timestamptz;

DO $$ BEGIN
  ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_reply_to_fk"
    FOREIGN KEY ("reply_to_id") REFERENCES "project_messages"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
