-- Reconcile privileged portal RPC execution grants.
revoke execute on function public.admin_approve_portal_registration(uuid,uuid) from anon, public;
grant execute on function public.admin_approve_portal_registration(uuid,uuid) to authenticated;

revoke execute on function public.complete_portal_registration(text,text,text) from anon, public;
grant execute on function public.complete_portal_registration(text,text,text) to authenticated;
