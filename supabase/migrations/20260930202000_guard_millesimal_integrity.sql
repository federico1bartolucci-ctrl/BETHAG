-- BETHAG: preserve millesimal bases already used by accounting allocations.
create or replace function public.guard_millesimal_value_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_allocations integer := 0;
begin
  select count(*) into v_allocations
  from public.condominium_expense_allocations a
  where a.workspace_id = old.workspace_id
    and a.condominium_id = old.condominium_id
    and a.allocation_table_id = old.table_id;

  if tg_op = 'DELETE' and v_allocations > 0 then
    raise exception 'La quota millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata';
  end if;

  if tg_op = 'UPDATE' and v_allocations > 0
     and (
       new.value is distinct from old.value
       or new.excluded is distinct from old.excluded
       or new.table_id is distinct from old.table_id
       or new.unit_id is distinct from old.unit_id
       or new.condominium_id is distinct from old.condominium_id
       or new.workspace_id is distinct from old.workspace_id
     ) then
    raise exception 'La quota millesimale è già utilizzata da ripartizioni esistenti e non può essere modificata';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_guard_millesimal_value_integrity on public.condominium_millesimal_values;
create trigger trg_guard_millesimal_value_integrity
before update or delete on public.condominium_millesimal_values
for each row execute function public.guard_millesimal_value_integrity();

create or replace function public.guard_millesimal_table_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_allocations integer := 0;
begin
  select count(*) into v_allocations
  from public.condominium_expense_allocations a
  where a.workspace_id = old.workspace_id
    and a.condominium_id = old.condominium_id
    and a.allocation_table_id = old.id;

  if tg_op = 'DELETE' and v_allocations > 0 then
    raise exception 'La tabella millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata';
  end if;

  if tg_op = 'UPDATE' and v_allocations > 0
     and (
       new.basis_type is distinct from old.basis_type
       or new.scope_mode is distinct from old.scope_mode
       or new.scope_unit_ids is distinct from old.scope_unit_ids
       or new.scope_building_codes is distinct from old.scope_building_codes
       or new.total_millesimi is distinct from old.total_millesimi
       or new.condominium_id is distinct from old.condominium_id
       or new.workspace_id is distinct from old.workspace_id
     ) then
    raise exception 'La tabella millesimale è già utilizzata da ripartizioni esistenti e la base di calcolo non può essere modificata';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_guard_millesimal_table_integrity on public.condominium_millesimal_tables;
create trigger trg_guard_millesimal_table_integrity
before update or delete on public.condominium_millesimal_tables
for each row execute function public.guard_millesimal_table_integrity();

revoke all on function public.guard_millesimal_value_integrity() from public;
grant execute on function public.guard_millesimal_value_integrity() to authenticated;
revoke all on function public.guard_millesimal_table_integrity() from public;
grant execute on function public.guard_millesimal_table_integrity() to authenticated;
