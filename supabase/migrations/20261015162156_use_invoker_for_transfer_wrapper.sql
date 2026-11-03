-- Keep the public RPC endpoint while removing SECURITY DEFINER from the exposed wrapper.
-- The private implementation remains SECURITY DEFINER and enforces auth.uid() plus workspace permissions.
begin;
revoke all on function private.close_condominium_member_transfer(uuid) from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.close_condominium_member_transfer(uuid) to authenticated, service_role;

create or replace function public.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  return private.close_condominium_member_transfer(p_transfer_id);
end;
$function$;

revoke all on function public.close_condominium_member_transfer(uuid) from public, anon;
grant execute on function public.close_condominium_member_transfer(uuid) to authenticated, service_role;
commit;
