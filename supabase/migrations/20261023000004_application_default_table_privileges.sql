-- Explicit least-privilege defaults for application tables created as postgres.
-- authenticated gets ordinary data access only; service_role keeps backend data and
-- structural privileges but neither role receives MAINTAIN by default.
-- Do not attempt to mutate Supabase-managed supabase_admin defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO service_role;
