-- Prevent clients from bypassing the future atomic confirmation workflow.
-- A SECURITY DEFINER confirmation routine owned by postgres may perform the
-- transition; ordinary authenticated/service-role requests may not.
create or replace function public.require_trusted_unit_transformation_confirmation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.status = 'Confermata'
     and (tg_op = 'INSERT' or old.status is distinct from 'Confermata')
     and current_user <> 'postgres' then
    raise exception 'UNIT_TRANSFORMATION_CONFIRMATION_REQUIRES_TRUSTED_RPC: la conferma deve avvenire tramite una procedura transazionale autorizzata';
  end if;
  return new;
end;
$function$;

revoke all on function public.require_trusted_unit_transformation_confirmation() from public, anon, authenticated, service_role;

drop trigger if exists require_trusted_unit_transformation_confirmation_trg
  on public.condominium_unit_transformations;

create trigger require_trusted_unit_transformation_confirmation_trg
before insert or update of status
on public.condominium_unit_transformations
for each row
execute function public.require_trusted_unit_transformation_confirmation();
