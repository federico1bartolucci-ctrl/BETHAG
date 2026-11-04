-- Explicit least-privilege defaults for application tables created as postgres.
-- authenticated gets ordinary data access only; service_role keeps the data and
-- structural privileges required by the backend but neither role gets MAINTAIN.
-- Do not attempt to mutate supabase_admin-owned defaults: that ACL is platform-managed.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO service_role;
