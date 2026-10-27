-- Least-privilege hardening for application tables in public.
-- Keep SELECT/INSERT/UPDATE/DELETE intact: RLS policies remain the row-level
-- authorization boundary. Remove table-level powers that ordinary API roles
-- should not need and that RLS does not constrain (notably TRUNCATE).
-- This migration intentionally does not touch Production until reviewed and
-- applied through the approved migration/cutover process.

BEGIN;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- PostgreSQL 17 introduced the MAINTAIN table privilege. Revoke it only
-- where supported, preserving compatibility with earlier server versions.
DO $migration$
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
  END IF;
END
$migration$;

-- Apply the same least-privilege defaults to future application tables
-- created by the usual migration owner.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

DO $migration$
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE MAINTAIN ON TABLES FROM anon, authenticated';
  END IF;
END
$migration$;

-- Supabase-managed objects may be created under supabase_admin. Adjust its
-- defaults only if the migration executor is authorized to manage that role;
-- otherwise leave platform-owned defaults unchanged and report the limitation.
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin')
     AND pg_has_role(current_user, 'supabase_admin', 'MEMBER') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated';
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE MAINTAIN ON TABLES FROM anon, authenticated';
    END IF;
  ELSE
    RAISE NOTICE 'Skipped supabase_admin default ACL: current migration role is not a member of supabase_admin. Verify platform-managed defaults separately.';
  END IF;
END
$migration$;

COMMIT;
