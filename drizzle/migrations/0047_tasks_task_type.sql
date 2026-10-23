-- 0047: topşiriqqa ixtiyoriy "Topşiriq turi" (xat, buyruq, bildirgi va h.k., erkin matn).
--
-- Qölda qöllanadi (psql), drizzle journaliga qöşilmaydi: journal 0024'da muzlab qolgan.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type varchar(100);
