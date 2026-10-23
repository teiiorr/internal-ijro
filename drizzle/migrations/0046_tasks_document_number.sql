-- 0046: topşiriqqa ixtiyoriy "Hujjat raqami" (xat, buyruq yoki bildirgi raqami).
--
-- Qölda qöllanadi (psql), drizzle journaliga qöşilmaydi: journal 0024'da muzlab qolgan.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS document_number varchar(100);
