-- The prior function-ACL migration was already recorded on QA before its
-- helper-function allowlist was corrected. Reconcile existing environments
-- without changing the two intentionally PUBLIC-executable trigger routines.
REVOKE EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;
