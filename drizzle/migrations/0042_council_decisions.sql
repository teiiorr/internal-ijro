-- 0042: council decisions — record each agenda item's resolution for the protocol (bayonnoma).
-- Additive: existing rows default to 'pending'. Qo'lda qo'llanadi (psql); prod'da 2026-10-14.

ALTER TABLE council_agenda_items
  ADD COLUMN IF NOT EXISTS decision_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision text;

ALTER TABLE council_agenda_items DROP CONSTRAINT IF EXISTS council_agenda_decision_status_chk;
ALTER TABLE council_agenda_items ADD CONSTRAINT council_agenda_decision_status_chk
  CHECK (decision_status IN ('pending','approved','rejected','deferred'));
