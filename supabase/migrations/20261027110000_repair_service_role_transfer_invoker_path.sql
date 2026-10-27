-- Repair the service_role invocation path for the SECURITY INVOKER public wrapper.
-- Live catalog checks on 2026-10-27 showed that migration 20261023000733 is
-- recorded in QA but its intended service_role grants are not effective there:
-- service_role has EXECUTE on the public wrapper, but lacks private-schema USAGE
-- and/or EXECUTE on the private implementation. Do not edit/replay the old file;
-- this forward-only correction is safe to reapply and does not bypass auth checks.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) FROM PUBLIC, anon;
