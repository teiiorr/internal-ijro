-- 0039: reconcile prod indexes with schema.ts.
--
-- These indexes were DECLARED in schema.ts but never existed on prod, because the
-- drizzle journal is frozen at 0024 and index definitions live only in schema.ts
-- (the hand-written .sql migrations never created them). Verified + applied to prod
-- on 2026-10-14 after a gzip pg_dump backup; `declared - prod` is now empty.
--
-- Qo'lda qo'llanadi (psql), drizzle journaliga qo'shilmaydi.

CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log (created_at);
CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log (user_id);
CREATE INDEX IF NOT EXISTS leaves_status_idx ON leaves (status);
CREATE INDEX IF NOT EXISTS leaves_user_idx ON leaves (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at);
