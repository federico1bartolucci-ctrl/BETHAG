-- Expose portal approval through an invoker wrapper; keep privileged writes private.
revoke execute on function public.admin_approve_portal_registration(uuid,uuid) from anon, public;

create or replace function public.admin_approve_portal_registration(
  p_request_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
begin
  return private.admin_approve_portal_registration(p_request_id, p_member_id);
end;
$function$;

revoke execute on function public.admin_approve_portal_registration(uuid,uuid) from anon, public;
grant execute on function public.admin_approve_portal_registration(uuid,uuid) to authenticated;
