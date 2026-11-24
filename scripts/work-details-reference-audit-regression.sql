-- Runtime regression: descriptive and reference-only work changes are audited.
ALTER TABLE public.condominium_works
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normale',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fund_id uuid,
  ADD COLUMN IF NOT EXISTS register_item_id uuid;

\i supabase/rebuild/candidates/accounting-point1-20261124/20261124240000_audit_work_details_and_references.sql

UPDATE public.condominium_works
SET title='Titolo aggiornato',
    category='Straordinario',
    description='Descrizione aggiornata',
    priority='Alta',
    notes='Nota aggiornata',
    fund_id='00000000-0000-0000-0000-000000000061',
    register_item_id='00000000-0000-0000-0000-000000000062'
WHERE id='00000000-0000-0000-0000-000000000050';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_audit_log
    WHERE entity_id='00000000-0000-0000-0000-000000000050'
      AND action='work_details_changed'
      AND data->>'old_title' IS DISTINCT FROM data->>'new_title'
      AND data->>'new_notes'='Nota aggiornata'
      AND data->>'new_priority'='Alta'
  ) THEN
    RAISE EXCEPTION 'Regression: descriptive work changes were not audited';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_audit_log
    WHERE entity_id='00000000-0000-0000-0000-000000000050'
      AND action='work_reference_changed'
      AND data->>'new_fund_id'='00000000-0000-0000-0000-000000000061'
      AND data->>'new_register_item_id'='00000000-0000-0000-0000-000000000062'
  ) THEN
    RAISE EXCEPTION 'Regression: work accounting-reference changes were not audited';
  END IF;
END $$;
