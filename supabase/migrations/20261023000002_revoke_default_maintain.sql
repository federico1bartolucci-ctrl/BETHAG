-- Remove excessive structural/default table privileges for application-facing roles
-- on tables created by postgres, the owner used by the application baseline.
-- This migration deliberately does not mutate supabase_admin defaults: on hosted
-- Supabase the connected postgres role is not a member of supabase_admin, and
-- those defaults are platform-managed. They must be reported as a platform-owned
-- divergence, not silently changed or marked remediated.
-- This migration has NOT been applied to Production.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
