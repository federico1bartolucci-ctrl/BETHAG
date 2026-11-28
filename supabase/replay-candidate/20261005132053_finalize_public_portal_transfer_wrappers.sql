-- Public RPCs are invoker wrappers; privileged implementations remain private.
alter function public.admin_approve_portal_registration(uuid, uuid) security invoker;
alter function public.close_condominium_member_transfer(uuid) security invoker;
alter function public.confirm_condominium_member_transfer(uuid, uuid, text, text, uuid, date, text, text, jsonb) security invoker;
alter function public.complete_portal_registration(text, text, text) security invoker;

revoke execute on function public.admin_approve_portal_registration(uuid, uuid) from public, anon;
revoke execute on function public.close_condominium_member_transfer(uuid) from public, anon;
revoke execute on function public.confirm_condominium_member_transfer(uuid, uuid, text, text, uuid, date, text, text, jsonb) from public, anon;
revoke execute on function public.complete_portal_registration(text, text, text) from public, anon;

grant execute on function public.admin_approve_portal_registration(uuid, uuid) to authenticated;
grant execute on function public.close_condominium_member_transfer(uuid) to authenticated;
grant execute on function public.confirm_condominium_member_transfer(uuid, uuid, text, text, uuid, date, text, text, jsonb) to authenticated;
grant execute on function public.complete_portal_registration(text, text, text) to authenticated;
