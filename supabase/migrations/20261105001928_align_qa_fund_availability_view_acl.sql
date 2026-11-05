-- Align the read-only fund availability view ACL across QA and Production.
-- Forward-only and data-preserving: this migration changes privileges only.
-- Production already has this effective ACL from 20261104222229; this
-- idempotent migration records the same invariant in the canonical history.

DO $precheck$
DECLARE
  target_kind "char";
  target_owner text;
BEGIN
  SELECT c.relkind, c.relowner::regrole::text
    INTO target_kind, target_owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'condominium_fund_availability';

  IF target_kind IS DISTINCT FROM 'v' OR target_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'Unexpected object: expected postgres-owned view, found relkind %, owner %', target_kind, target_owner;
  END IF;
END;
$precheck$;

REVOKE ALL PRIVILEGES
  ON TABLE public.condominium_fund_availability
  FROM authenticated;

GRANT SELECT
  ON TABLE public.condominium_fund_availability
  TO authenticated;

DO $verify$
BEGIN
  IF NOT has_table_privilege('authenticated','public.condominium_fund_availability','SELECT')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','INSERT')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','UPDATE')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','DELETE')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','TRUNCATE')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','REFERENCES')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','TRIGGER')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','MAINTAIN') THEN
    RAISE EXCEPTION 'ACL alignment failed: authenticated must retain SELECT only on condominium_fund_availability';
  END IF;
END;
$verify$;
