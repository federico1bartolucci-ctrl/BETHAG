-- Remove structural table privileges that ordinary API roles do not need.
-- RLS does not govern TRUNCATE. Keep ordinary CRUD grants intact for
-- authenticated; the RLS policies remain the row-level authorization boundary.
-- This is a controlled-release migration and has NOT been run on Production.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- Remove existing MAINTAIN grants from API-facing roles.
-- service_role is handled by the following explicit migration so the change
-- remains independently auditable. Default ACL revocations do not affect
-- existing tables. PostgreSQL 17+.
REVOKE MAINTAIN
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;
