-- The close operation is an authenticated application workflow, not an anonymous RPC.
-- The implementation independently checks auth.uid(), workspace authorization,
-- transfer status/scope, and outstanding financial positions.
REVOKE EXECUTE ON FUNCTION public.close_condominium_member_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_condominium_member_transfer(uuid) TO authenticated, service_role;
