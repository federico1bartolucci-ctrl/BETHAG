-- Replay-only restoration of a Production column absent from the recovered migration ledger.
-- The live Production catalog has building_code on condominium_units, and historical SQL
-- references it before any recovered ADD COLUMN statement exists. Place this immediately
-- after the table creation/foreign-key bridge and before its first recorded reference.
-- Never deploy this synthetic prerequisite to QA or Production.
alter table public.condominium_units
  add column building_code text not null default '';
