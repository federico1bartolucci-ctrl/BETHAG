-- Reconcile privileged portal RPC execution grants after function hardening.
-- These RPCs require an authenticated caller; anonymous/public execution is never allowed.

revoke execute on function public.admin_approve_portal_registration(uuid,uuid) from anon, public;
grant execute on function public.admin_approve_portal_registration(uuid,uuid) to authenticated;

revoke execute on function public.complete_portal_registration(text,text,text) from anon, public;
grant execute on function public.complete_portal_registration(text,text,text) to authenticated;

revoke execute on function private.confirm_condominium_member_transfer(uuid) from anon, public;
grant execute on function private.confirm_condominium_member_transfer(uuid) to authenticated;

revoke execute on function public.preview_condominium_member_transfer(uuid) from anon, public;
grant execute on function public.preview_condominium_member_transfer(uuid) to authenticated;

revoke execute on function private.close_condominium_member_transfer(uuid) from anon, public;
grant execute on function private.close_condominium_member_transfer(uuid) to authenticated;
