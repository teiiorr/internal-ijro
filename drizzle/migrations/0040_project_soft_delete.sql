-- 0040: soft-delete for projects.
--
-- deleteProject() previously did a hard DELETE, which cascaded into project_stages →
-- stage_payments (the payment register), stage/project documents and messages —
-- destroying the financial audit trail irreversibly. Now it sets deleted_at and the
-- rows (and files) are preserved; project reads filter `deleted_at IS NULL`.
--
-- Qo'lda qo'llanadi (psql), drizzle journaliga qo'shilmaydi. Prod'da 2026-10-14 qo'llangan.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS projects_not_deleted_idx ON projects (deleted_at);
