-- Harden the public compatibility wrapper without changing its API or authorization flow.
-- The implementation is schema-qualified, so an empty search_path is safe.
create or replace function public.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  return private.close_condominium_member_transfer(p_transfer_id);
end;
$function$;
