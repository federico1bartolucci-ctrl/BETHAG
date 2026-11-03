create or replace function public.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return private.close_condominium_member_transfer(p_transfer_id);
end;
$function$;
grant execute on function public.close_condominium_member_transfer(uuid) to authenticated;