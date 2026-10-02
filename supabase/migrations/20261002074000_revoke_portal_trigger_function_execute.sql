-- Trigger functions must not be callable as RPCs by API roles.
revoke execute on function public.prevent_archived_condominium_mutation() from public, anon, authenticated;
revoke execute on function public.validate_portal_access_scope() from public, anon, authenticated;
revoke execute on function public.validate_portal_registration_request_scope() from public, anon, authenticated;
