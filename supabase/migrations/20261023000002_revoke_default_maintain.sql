-- Remove excessive default MAINTAIN privileges from application-facing roles.
-- This reconciles the observed Production default-ACL drift with the baseline's
-- least-privilege target. Validate role membership/ownership in staging first.
-- This migration has NOT been applied to Production.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;
