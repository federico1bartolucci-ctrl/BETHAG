#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

DROP TABLE IF EXISTS public.condominium_work_progress CASCADE;
DROP TABLE IF EXISTS public.condominium_works CASCADE;

CREATE TABLE public.condominium_works (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  title text NOT NULL
);

CREATE TABLE public.condominium_work_progress (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  work_id uuid NOT NULL REFERENCES public.condominium_works(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  ledger_entry_id uuid,
  payment_entry_id uuid
);

ALTER TABLE public.condominium_work_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY hide_work_progress_from_authenticated
  ON public.condominium_work_progress
  FOR SELECT TO authenticated
  USING (false);

GRANT SELECT, DELETE ON public.condominium_works TO authenticated;
GRANT SELECT ON public.condominium_work_progress TO authenticated;

\i supabase/migrations/20261124250000_prevent_work_delete_with_progress.sql

INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title)
VALUES
 ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Lavoro con SAL'),
 ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Lavoro senza SAL');

INSERT INTO public.condominium_work_progress
  (id,workspace_id,condominium_id,work_id,amount,paid_amount,ledger_entry_id,payment_entry_id)
VALUES
 ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000101',1000,250,'00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000105');

SET ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE work_id='00000000-0000-0000-0000-000000000101'
  ) THEN
    RAISE EXCEPTION 'Fixture error: authenticated role unexpectedly sees SAL rows';
  END IF;

  BEGIN
    DELETE FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000101';
    RAISE EXCEPTION 'Regression: work with SAL was deleted despite RLS hiding child rows';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL registrati e non può essere eliminato%' THEN
      RAISE;
    END IF;
  END;

  DELETE FROM public.condominium_works
  WHERE id='00000000-0000-0000-0000-000000000102';
END
$$;
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000101'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE id='00000000-0000-0000-0000-000000000103'
  ) THEN
    RAISE EXCEPTION 'Regression: protected work or SAL did not survive delete attempt';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000102'
  ) THEN
    RAISE EXCEPTION 'Regression: work without SAL should remain deletable';
  END IF;
END
$$;

SELECT 'PASS: work deletion blocked for SAL rows, including under child-table RLS; empty work remains deletable' AS result;
SQL
