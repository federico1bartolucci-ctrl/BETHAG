-- Protect historical accounting participation from unit scope mutations.
create or replace function public.guard_unit_scope_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_old_building text;
  v_new_building text;
  v_old_civic text;
  v_new_civic text;
  v_old_fabbricato text;
  v_new_fabbricato text;
begin
  v_old_building := nullif(btrim(coalesce(old.building_code, '')), '');
  v_new_building := nullif(btrim(coalesce(new.building_code, '')), '');
  v_old_civic := nullif(btrim(coalesce(old.data->>'civic_code', old.data->>'civicCode', old.data->>'civico', '')), '');
  v_new_civic := nullif(btrim(coalesce(new.data->>'civic_code', new.data->>'civicCode', new.data->>'civico', '')), '');
  v_old_fabbricato := nullif(btrim(coalesce(old.data->>'fabbricato', old.data->>'building_code', old.data->>'buildingCode', '')), '');
  v_new_fabbricato := nullif(btrim(coalesce(new.data->>'fabbricato', new.data->>'building_code', new.data->>'buildingCode', '')), '');

  if old.workspace_id is distinct from new.workspace_id
     or old.condominium_id is distinct from new.condominium_id then
    if exists (
      select 1 from public.condominium_expense_allocations
      where unit_id = old.id
    ) or exists (
      select 1 from public.condominium_installments
      where unit_id = old.id
    ) then
      raise exception 'UNIT_HAS_FINANCIAL_HISTORY: impossibile spostare un''unità con storico contabile tra workspace o condomini';
    end if;
  end if;

  if v_old_building is distinct from v_new_building
     or v_old_civic is distinct from v_new_civic
     or v_old_fabbricato is distinct from v_new_fabbricato then
    if exists (
      select 1 from public.condominium_expense_allocations
      where workspace_id = old.workspace_id
        and condominium_id = old.condominium_id
        and unit_id = old.id
    ) or exists (
      select 1 from public.condominium_installments
      where workspace_id = old.workspace_id
        and condominium_id = old.condominium_id
        and unit_id = old.id
    ) then
      raise exception 'UNIT_SCOPE_LOCKED: fabbricato, edificio o civico non possono essere modificati dopo la registrazione di movimenti contabili o rate per l''unità';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_unit_scope_changes on public.condominium_units;
create trigger trg_guard_unit_scope_changes
before update on public.condominium_units
for each row execute function public.guard_unit_scope_changes();

revoke all on function public.guard_unit_scope_changes() from public;
grant execute on function public.guard_unit_scope_changes() to authenticated;
