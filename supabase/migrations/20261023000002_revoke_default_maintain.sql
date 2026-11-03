-- Remove excessive default MAINTAIN privileges from application-facing roles
-- for objects created under postgres, the owner used by the application baseline.
-- Supabase-managed supabase_admin defaults are platform-owned and intentionally untouched.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;
