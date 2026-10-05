-- Remove direct authenticated execution from privileged private implementations.
-- Public invoker wrappers are the only application entry points.
revoke execute on function private.admin_approve_portal_registration(uuid,uuid) from public,anon,authenticated;
revoke execute on function private.complete_portal_registration(text,text,text) from public,anon,authenticated;
revoke execute on function private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from public,anon,authenticated;
revoke execute on function private.close_condominium_member_transfer(uuid) from public,anon,authenticated;