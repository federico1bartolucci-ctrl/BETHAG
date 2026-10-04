-- Restore production unit-delete integrity guards whose original migration
-- provenance is absent from the current branch history. Keep these guards
-- separate from the broader scoped guard until their historical intent is
-- conclusively reconciled.
create or replace function public.prevent_condominium_unit_delete_with_financial_data()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  if exists (
    select 1 from public.condominium_expense_allocations
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_ALLOCATIONS: impossibile eliminare l''unità % perché contiene ripartizioni contabili. Eliminare o trasferire prima le ripartizioni collegate.', old.unit_code
      using errcode = '23503';
  end if;

  if exists (
    select 1 from public.condominium_installments
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_INSTALLMENTS: impossibile eliminare l''unità % perché contiene rate. Eliminare o trasferire prima le rate collegate.', old.unit_code
      using errcode = '23503';
  end if;

  return old;
end;
$function$;

create or replace function public.prevent_condominium_unit_delete_with_members()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  if exists (
    select 1 from public.condominium_members
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_MEMBERS: impossibile eliminare l''unità % perché contiene uno o più condòmini. Spostare prima i condòmini ad altra unità oppure eliminarli esplicitamente.', old.unit_code
      using errcode = '23503';
  end if;

  return old;
end;
$function$;

create or replace function public.clear_condominium_member_unit_legacy_fields()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  update public.condominium_members
  set data = data - 'unitId' - 'apartment',
      updated_at = now()
  where unit_id = old.id;
  return old;
end;
$function$;

drop trigger if exists prevent_condominium_unit_delete_with_financial_data
on public.condominium_units;
create trigger prevent_condominium_unit_delete_with_financial_data
before delete on public.condominium_units
for each row execute function public.prevent_condominium_unit_delete_with_financial_data();

drop trigger if exists prevent_condominium_unit_delete_with_members
on public.condominium_units;
create trigger prevent_condominium_unit_delete_with_members
before delete on public.condominium_units
for each row execute function public.prevent_condominium_unit_delete_with_members();

drop trigger if exists trg_clear_member_unit_legacy_on_unit_delete
on public.condominium_units;
create trigger trg_clear_member_unit_legacy_on_unit_delete
after delete on public.condominium_units
for each row execute function public.clear_condominium_member_unit_legacy_fields();

-- Match the live invoker-function ACLs observed in production.
revoke all on function public.prevent_condominium_unit_delete_with_financial_data() from public, anon, authenticated, service_role;
grant execute on function public.prevent_condominium_unit_delete_with_financial_data() to public, authenticated, service_role;

revoke all on function public.prevent_condominium_unit_delete_with_members() from public, anon, authenticated, service_role;
grant execute on function public.prevent_condominium_unit_delete_with_members() to public, authenticated, service_role;

-- The cleanup trigger is restricted to trusted database/service contexts.
revoke all on function public.clear_condominium_member_unit_legacy_fields() from public, anon, authenticated, service_role;
grant execute on function public.clear_condominium_member_unit_legacy_fields() to service_role;
