#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
migration="supabase/migrations/20261124180000_harden_work_progress_payment_allocation.sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.condominium_works (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  supplier_id uuid
);

CREATE TABLE public.condominium_ledger_entries (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  direction text NOT NULL,
  supplier_id uuid,
  amount numeric NOT NULL
);

CREATE TABLE public.condominium_work_progress (
  id uuid PRIMARY KEY,
  work_id uuid NOT NULL,
  ledger_entry_id uuid,
  payment_entry_id uuid,
  paid_amount numeric NOT NULL DEFAULT 0
);
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TRIGGER validate_condominium_work_progress_accounting_links
BEFORE INSERT OR UPDATE ON public.condominium_work_progress
FOR EACH ROW
EXECUTE FUNCTION public.validate_condominium_work_progress_accounting_links();

INSERT INTO public.condominium_works(id,workspace_id,condominium_id)
VALUES
 ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');

INSERT INTO public.condominium_ledger_entries(id,workspace_id,condominium_id,direction,amount)
VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Uscita',100),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Uscita',100);

-- Exact payment coverage split across two SALs must remain valid.
INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
VALUES
 ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',60),
 ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',40);

-- Updating a row must exclude its previous value, not double-count it.
UPDATE public.condominium_work_progress
SET paid_amount=40
WHERE id='40000000-0000-0000-0000-000000000002';

DO $test$
BEGIN
  BEGIN
    UPDATE public.condominium_work_progress
    SET paid_amount=40.01
    WHERE id='40000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'TEST_EXPECTED_UPDATE_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_UPDATE_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La somma dei SAL collegati supera l''importo del movimento di pagamento' THEN RAISE; END IF;
  END;
END
$test$;

-- A payment cannot be reused across different works beyond its total amount.
INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
VALUES
 ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',70);

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
    VALUES ('40000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002',40);
    RAISE EXCEPTION 'TEST_EXPECTED_INSERT_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_INSERT_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La somma dei SAL collegati supera l''importo del movimento di pagamento' THEN RAISE; END IF;
  END;
END
$test$;

DO $test$
BEGIN
  IF (SELECT round(sum(paid_amount),2)
      FROM public.condominium_work_progress
      WHERE payment_entry_id='30000000-0000-0000-0000-000000000001') <> 100 THEN
    RAISE EXCEPTION 'Unexpected cumulative amount for accepted payment split';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE id='40000000-0000-0000-0000-000000000004'
  ) THEN
    RAISE EXCEPTION 'Rejected over-allocation was persisted';
  END IF;
END
$test$;
SQL
