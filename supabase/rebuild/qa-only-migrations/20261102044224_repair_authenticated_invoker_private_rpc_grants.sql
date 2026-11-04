-- QA-only completion of authenticated invoker-to-private RPC grants.
-- Each implementation is SECURITY DEFINER and independently checks auth.uid()
-- plus its relevant workspace/module or registration preconditions.
REVOKE EXECUTE ON FUNCTION private.admin_approve_portal_registration(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.complete_portal_registration(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.list_archived_condominiums(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.reverse_condominium_installment_payment(uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.verify_personal_security_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_approve_portal_registration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_portal_registration(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_archived_condominiums(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.reverse_condominium_installment_payment(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.verify_personal_security_code(text) TO authenticated;
