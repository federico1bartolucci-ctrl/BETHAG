-- Align effective function EXECUTE grants with the captured Production ACL baseline.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;