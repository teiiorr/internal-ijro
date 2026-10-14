-- 0038: performance indexes for the activity log (entity history) and the stage
-- payments register (status / paid_at filters).
--
-- Qo'lda qo'llanadi (psql), drizzle journaliga qo'shilmaydi — journal 0024'da
-- muzlab qolgan (keyingi migratsiyalar shu konvensiya bo'yicha qo'lda bajariladi).
-- Prod'da 2026-10-14 qo'llangan.

CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS stage_payments_status_idx ON stage_payments (status);
CREATE INDEX IF NOT EXISTS stage_payments_paid_idx ON stage_payments (paid_at);
