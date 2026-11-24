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
DROP TABLE IF EXISTS public.condominiums CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

-- Mirror Production's independent workspace/condominium foreign keys and
-- work_progress.work_id ON DELETE CASCADE. There is no composite scope FK.
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY
);

CREATE TABLE public.condominiums (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.condominium_works (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  condominium_id uuid NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  title text NOT NULL
);

CREATE TABLE public.condominium_work_progress (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  condominium_id uuid NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
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

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, DELETE ON public.condominium_works TO authenticated;
GRANT SELECT ON public.condominium_work_progress TO authenticated;

-- Reinstall the previous implementation to prove its scope predicates miss
-- children whose independent workspace_id or condominium_id differs.
CREATE OR REPLACE FUNCTION public.prevent_work_delete_with_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO off
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.condominium_work_progress p
    WHERE p.id IS NOT NULL
      AND p.work_id = OLD.id
      AND p.workspace_id = OLD.workspace_id
      AND p.condominium_id = OLD.condominium_id
  ) THEN
    RAISE EXCEPTION 'Il lavoro ha SAL registrati e non può essere eliminato; archiviare il lavoro per conservarne la storia contabile';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_work_delete_with_progress
  ON public.condominium_works;
CREATE TRIGGER trg_prevent_work_delete_with_progress
BEFORE DELETE ON public.condominium_works
FOR EACH ROW
EXECUTE FUNCTION public.prevent_work_delete_with_progress();

INSERT INTO public.workspaces(id)
VALUES
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');

INSERT INTO public.condominiums(id,workspace_id)
VALUES
 ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002');

INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title)
VALUES
 ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con SAL coerente'),
 ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro senza SAL'),
 ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con workspace SAL incoerente'),
 ('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con condominio SAL incoerente');

INSERT INTO public.condominium_work_progress
  (id,workspace_id,condominium_id,work_id,amount,paid_amount)
VALUES
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000101',1000,250),
 ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000103',2000,500),
 ('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000104',3000,750);

SET ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE work_id IN (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104'
    )
  ) THEN
    RAISE EXCEPTION 'Fixture error: authenticated role unexpectedly sees SAL rows';
  END IF;

  BEGIN
    DELETE FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000101';
    RAISE EXCEPTION 'Regression: matching SAL work was deleted despite RLS hiding child rows';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL registrati e non può essere eliminato%' THEN
      RAISE;
    END IF;
  END;

  DELETE FROM public.condominium_works
  WHERE id='00000000-0000-0000-0000-000000000102';

  -- These two deletes reproduce the defect: each child FK is valid, but one
  -- scope column differs from its parent. The old trigger misses both rows
  -- and ON DELETE CASCADE destroys their SAL evidence.
  DELETE FROM public.condominium_works
  WHERE id='00000000-0000-0000-0000-000000000103';

  DELETE FROM public.condominium_works
  WHERE id='00000000-0000-0000-0000-000000000104';
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
    WHERE id='00000000-0000-0000-0000-000000000201'
  ) THEN
    RAISE EXCEPTION 'Fixture error: matching SAL protection did not work';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.condominium_works
    WHERE id IN (
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE id IN (
      '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000203'
    )
  ) THEN
    RAISE EXCEPTION 'Legacy reproduction failed: expected scope-mismatched SAL rows to be cascade-deleted';
  END IF;
END
$$;

SELECT 'LEGACY DEFECT REPRODUCED: scope-mismatched SAL rows were cascade-deleted' AS result;

\i supabase/rebuild/candidates/accounting-point1-20261124/20261124202340_prevent_work_delete_with_progress.sql

INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title)
VALUES
 ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con SAL coerente corretto'),
 ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con workspace SAL incoerente corretto'),
 ('00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con condominio SAL incoerente corretto'),
 ('00000000-0000-0000-0000-000000000304','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro senza SAL corretto');

INSERT INTO public.condominium_work_progress
  (id,workspace_id,condominium_id,work_id,amount,paid_amount)
VALUES
 ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000301',1000,250),
 ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000302',2000,500),
 ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000303',3000,750);

SET ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE work_id IN (
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000302',
      '00000000-0000-0000-0000-000000000303'
    )
  ) THEN
    RAISE EXCEPTION 'Fixture error: authenticated role unexpectedly sees corrected SAL rows';
  END IF;

  BEGIN
    DELETE FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000301';
    RAISE EXCEPTION 'Regression: work with matching SAL was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL collegati e non può essere eliminato%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    DELETE FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000302';
    RAISE EXCEPTION 'Regression: work with workspace-mismatched SAL was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL collegati e non può essere eliminato%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    DELETE FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000303';
    RAISE EXCEPTION 'Regression: work with condominium-mismatched SAL was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL collegati e non può essere eliminato%' THEN
      RAISE;
    END IF;
  END;

  DELETE FROM public.condominium_works
  WHERE id='00000000-0000-0000-0000-000000000304';
END
$$;
RESET ROLE;

DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.condominium_works
    WHERE id IN (
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000302',
      '00000000-0000-0000-0000-000000000303'
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'Regression: a work with any SAL scope was not preserved';
  END IF;

  IF (
    SELECT count(*) FROM public.condominium_work_progress
    WHERE id IN (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000402',
      '00000000-0000-0000-0000-000000000403'
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'Regression: a SAL row was cascade-deleted after the corrected guard';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000304'
  ) THEN
    RAISE EXCEPTION 'Regression: work without SAL should remain deletable';
  END IF;
END
$$;

SELECT 'PASS: work deletion guard blocks every cascading SAL child, including workspace/condominium scope mismatches under RLS; empty work remains deletable' AS result;
SQL
