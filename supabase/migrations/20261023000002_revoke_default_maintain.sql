-- Remove excessive default MAINTAIN privileges from application-facing roles
-- for objects created under postgres, the owner used by the application baseline.
-- Hosted Supabase validation showed that the connected postgres role is not a
-- member of supabase_admin and receives permission denied when altering that
-- role's default ACL. Do not attempt to mutate Supabase-managed defaults here.
-- The supabase_admin default ACL difference remains documented as a platform-
-- owned divergence and must not be represented as remediated by this migration.
-- This migration has NOT been applied to Production.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;
