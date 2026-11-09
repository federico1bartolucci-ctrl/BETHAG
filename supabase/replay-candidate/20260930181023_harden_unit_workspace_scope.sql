create or replace function public.validate_condominium_unit_workspace_scope()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_workspace uuid;
begin
  select c.workspace_id
    into v_workspace
  from public.condominiums c
  where c.id = new.condominium_id;

  if v_workspace is null then
    raise exception 'Il condominio indicato non esiste';
  end if;

  if new.workspace_id <> v_workspace then
    raise exception 'Unità e condominio devono appartenere allo stesso workspace';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_validate_unit_workspace_scope on public.condominium_units;

create trigger trg_validate_unit_workspace_scope
before insert or update of workspace_id, condominium_id
on public.condominium_units
for each row
execute function public.validate_condominium_unit_workspace_scope();

do $$
declare
  v_bad bigint;
begin
  select count(*) into v_bad
  from public.condominium_units u
  join public.condominiums c on c.id = u.condominium_id
  where u.workspace_id <> c.workspace_id;

  if v_bad > 0 then
    raise exception 'Dati esistenti non coerenti: % unità hanno workspace_id diverso dal condominio', v_bad;
  end if;
end $$;