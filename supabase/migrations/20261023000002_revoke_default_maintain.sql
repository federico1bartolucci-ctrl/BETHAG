-- Least-privilege default table ACLs for objects created by postgres.
-- Hosted Supabase validation showed the connected postgres role is not a member
-- of supabase_admin. Do not mutate supabase_admin defaults: they are platform-
-- managed and must be reported as a platform-owned divergence, not remediated here.
-- This migration has NOT been applied to Production.

-- anon must receive no table privileges by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;

-- authenticated retains ordinary CRUD only; remove maintenance and structural powers.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- service_role keeps its backend CRUD/structural privileges, but not MAINTAIN.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM service_role;
