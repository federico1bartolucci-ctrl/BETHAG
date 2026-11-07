-- QA-ONLY forward migration, already applied to the existing bethag-launch-qa branch.
-- Ledger version: 20261105001928_align_qa_fund_availability_view_acl.
-- Keep outside supabase/migrations: this is an environment-specific reconciliation,
-- not part of the canonical 24-migration clean-install chain.
-- Data-preserving: changes grants only; no rows or schema objects are changed.

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
    RAISE EXCEPTION 'Unexpected QA object: expected postgres-owned view, found relkind %, owner %', target_kind, target_owner;
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
    RAISE EXCEPTION 'QA ACL alignment failed: authenticated must retain SELECT only';
  END IF;
END;
$verify$;
