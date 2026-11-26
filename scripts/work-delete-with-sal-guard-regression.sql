-- PostgreSQL 17 regression. Run only in the disposable CI database.
-- The whole fixture, including role/schema/function changes, is rolled back.
BEGIN;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END;
$roles$;

CREATE TABLE public.workspaces (id uuid PRIMARY KEY);
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
  ON public.condominium_work_progress FOR SELECT TO authenticated USING (false);
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, DELETE ON public.condominium_works TO authenticated;
GRANT SELECT ON public.condominium_work_progress TO authenticated;

-- Recreate the previous scope-filtered guard to prove the failure mode.
CREATE OR REPLACE FUNCTION public.prevent_work_delete_with_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO off
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.condominium_work_progress p
    WHERE p.work_id = OLD.id
      AND p.workspace_id = OLD.workspace_id
      AND p.condominium_id = OLD.condominium_id
  ) THEN
    RAISE EXCEPTION 'Il lavoro ha SAL registrati e non può essere eliminato; archiviare il lavoro per conservarne la storia contabile';
  END IF;
  RETURN OLD;
END;
$function$;
CREATE TRIGGER trg_prevent_work_delete_with_progress
BEFORE DELETE ON public.condominium_works
FOR EACH ROW EXECUTE FUNCTION public.prevent_work_delete_with_progress();

INSERT INTO public.workspaces(id) VALUES
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.condominiums(id,workspace_id) VALUES
 ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002');
INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title) VALUES
 ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con SAL coerente'),
 ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro senza SAL'),
 ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con workspace SAL incoerente'),
 ('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con condominio SAL incoerente');
INSERT INTO public.condominium_work_progress(id,workspace_id,condominium_id,work_id,amount,paid_amount) VALUES
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000101',1000,250),
 ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000103',2000,500),
 ('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000104',3000,750);

SET ROLE authenticated;
DO $legacy$
BEGIN
  IF EXISTS (SELECT 1 FROM public.condominium_work_progress WHERE work_id IN (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000104'
  )) THEN RAISE EXCEPTION 'Fixture error: authenticated unexpectedly sees SAL rows'; END IF;
  BEGIN
    DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000101';
    RAISE EXCEPTION 'Regression: matching SAL work was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL registrati%' THEN RAISE; END IF;
  END;
  DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000102';
  DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000103';
  DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000104';
END;
$legacy$;
RESET ROLE;

DO $legacy_verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000101')
     OR NOT EXISTS (SELECT 1 FROM public.condominium_work_progress WHERE id='00000000-0000-0000-0000-000000000201') THEN
    RAISE EXCEPTION 'Legacy matching-SAL guard failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.condominium_works WHERE id IN (
       '00000000-0000-0000-0000-000000000102',
       '00000000-0000-0000-0000-000000000103',
       '00000000-0000-0000-0000-000000000104'))
     OR EXISTS (SELECT 1 FROM public.condominium_work_progress WHERE id IN (
       '00000000-0000-0000-0000-000000000202',
       '00000000-0000-0000-0000-000000000203')) THEN
    RAISE EXCEPTION 'Legacy scope-mismatch cascade reproduction failed';
  END IF;
END;
$legacy_verify$;
SELECT 'LEGACY DEFECT REPRODUCED: scope-mismatched SAL rows were cascade-deleted' AS result;

\i supabase/rebuild/drafts/20261124202340_prevent_work_delete_with_progress.sql

INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title) VALUES
 ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con SAL coerente corretto'),
 ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con workspace SAL incoerente corretto'),
 ('00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro con condominio SAL incoerente corretto'),
 ('00000000-0000-0000-0000-000000000304','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','Lavoro senza SAL corretto');
INSERT INTO public.condominium_work_progress(id,workspace_id,condominium_id,work_id,amount,paid_amount) VALUES
 ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000301',1000,250),
 ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000302',2000,500),
 ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000303',3000,750);

SET ROLE authenticated;
DO $corrected$
BEGIN
  IF EXISTS (SELECT 1 FROM public.condominium_work_progress WHERE work_id IN (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303'
  )) THEN RAISE EXCEPTION 'Fixture error: authenticated unexpectedly sees corrected SAL rows'; END IF;
  BEGIN
    DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000301';
    RAISE EXCEPTION 'Regression: work with matching SAL was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL collegati%' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000302';
    RAISE EXCEPTION 'Regression: work with workspace-mismatched SAL was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL collegati%' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000303';
    RAISE EXCEPTION 'Regression: work with condominium-mismatched SAL was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il lavoro ha SAL collegati%' THEN RAISE; END IF;
  END;
  DELETE FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000304';
END;
$corrected$;
RESET ROLE;

DO $corrected_verify$
DECLARE v_oid oid := 'public.prevent_work_delete_with_progress()'::regprocedure;
BEGIN
  IF (SELECT count(*) FROM public.condominium_works WHERE id IN (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303')) <> 3 THEN
    RAISE EXCEPTION 'A work with linked SAL was not preserved';
  END IF;
  IF (SELECT count(*) FROM public.condominium_work_progress WHERE id IN (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000403')) <> 3 THEN
    RAISE EXCEPTION 'A SAL row was cascade-deleted after the corrected guard';
  END IF;
  IF EXISTS (SELECT 1 FROM public.condominium_works WHERE id='00000000-0000-0000-0000-000000000304') THEN
    RAISE EXCEPTION 'A work without SAL should remain deletable';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid=v_oid) THEN
    RAISE EXCEPTION 'Work deletion guard must be SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p, unnest(coalesce(p.proconfig,array[]::text[])) cfg
    WHERE p.oid=v_oid AND cfg='search_path=""')
     OR NOT EXISTS (SELECT 1 FROM pg_proc p, unnest(coalesce(p.proconfig,array[]::text[])) cfg
    WHERE p.oid=v_oid AND cfg='row_security=off') THEN
    RAISE EXCEPTION 'Work deletion guard must use empty search_path and row_security=off';
  END IF;
  IF EXISTS (SELECT 1 FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid=v_oid),
      acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=v_oid)))) a
    WHERE a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
      AND a.privilege_type='EXECUTE') THEN
    RAISE EXCEPTION 'Application role EXECUTE remains on work deletion trigger';
  END IF;
  IF NOT has_function_privilege('postgres',v_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'Owner EXECUTE was not preserved';
  END IF;
END;
$corrected_verify$;

SELECT 'PASS: work deletion blocks every cascading SAL child, including scope mismatches under RLS; empty work remains deletable' AS result;

ROLLBACK;
