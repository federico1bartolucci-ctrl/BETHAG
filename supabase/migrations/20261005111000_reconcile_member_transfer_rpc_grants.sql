-- Reconcile privileged member-transfer RPC execution grants.
revoke execute on function private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon, public;
revoke execute on function public.preview_condominium_member_transfer(uuid,uuid,date) from anon, public;
grant execute on function public.preview_condominium_member_transfer(uuid,uuid,date) to authenticated;
revoke execute on function private.close_condominium_member_transfer(uuid) from anon, public;
