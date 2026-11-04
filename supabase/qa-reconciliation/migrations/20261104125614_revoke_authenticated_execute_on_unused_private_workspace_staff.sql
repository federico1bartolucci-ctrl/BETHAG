-- QA-only least-privilege repair.
-- The helper has no public wrapper, policy, trigger, or function caller in QA.
-- service_role retains EXECUTE; authenticated no longer has direct EXECUTE.
REVOKE EXECUTE ON FUNCTION private.is_workspace_staff(uuid) FROM authenticated;
