-- Runtime regression: notes, progress number, title and date-only SAL
-- changes must be captured in the audit payload.
ALTER TABLE public.condominium_work_progress
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

\i supabase/migrations/20261124223000_audit_all_work_progress_fields.sql


UPDATE public.condominium_work_progress
SET progress_no=2,
    progress_date=current_date + 1,
    title='SAL aggiornato solo nei dettagli',
    notes='Annotazione aggiornata senza variazioni economiche'
WHERE id='00000000-0000-0000-0000-000000000040';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_audit_log
    WHERE entity_id='00000000-0000-0000-0000-000000000040'
      AND action='work_progress_changed'
      AND data->>'old_progress_no'='1'
      AND data->>'new_progress_no'='2'
      AND data->>'old_title' IS DISTINCT FROM data->>'new_title'
      AND data->>'new_notes'='Annotazione aggiornata senza variazioni economiche'
      AND data->>'old_progress_date' IS DISTINCT FROM data->>'new_progress_date'
  ) THEN
    RAISE EXCEPTION 'Regression: non-financial SAL field changes were not fully audited';
  END IF;
END $$;
