-- 0045: topşiriq hujjatlari uçun indeks. Vazifalar röyxati har bir qatorda hujjatlar sonini
-- sanaydi (qoğoz qisqiç belgisi) va topşiriq sahifasi hujjatlarni task_id böyiça oladi;
-- indekssiz har safar butun jadval öqiladi.
--
-- Qölda qöllanadi (psql), drizzle journaliga qöşilmaydi: journal 0024'da muzlab qolgan.

CREATE INDEX IF NOT EXISTS task_attachments_task_idx ON task_attachments (task_id, uploaded_at);
