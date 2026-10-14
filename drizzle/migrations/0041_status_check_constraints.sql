-- 0041: CHECK constraints on status columns with a clear, code-defined domain.
--
-- Domains come from the code (not current prod data): TASK_STATUSES, USER_STATUSES,
-- and the payment pending/partial/paid set — so legitimate future writes still pass.
-- projects.status and project_stages.status are intentionally NOT constrained here
-- (their stored domain is ambiguous vs the derived/display status).
--
-- Qo'lda qo'llanadi (psql). Prod'da 2026-10-14 qo'llangan (backup olingan).

ALTER TABLE tasks ADD CONSTRAINT tasks_status_chk
  CHECK (status IN ('todo','in_progress','under_review','completed','rejected'));
ALTER TABLE task_assignees ADD CONSTRAINT task_assignees_status_chk
  CHECK (status IN ('todo','in_progress','under_review','completed','rejected'));
ALTER TABLE stage_payments ADD CONSTRAINT stage_payments_status_chk
  CHECK (status IN ('pending','partial','paid'));
ALTER TABLE users ADD CONSTRAINT users_status_chk
  CHECK (status IN ('pending','active','archived','blocked'));
