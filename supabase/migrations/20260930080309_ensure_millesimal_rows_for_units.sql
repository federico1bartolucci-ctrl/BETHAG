-- BETHAG: garantisce la presenza della riga millesimale per ogni unità.
-- Il valore iniziale è 0: non inventiamo millesimi. L'amministratore li completa
-- nella tabella; il motore di riparto continua a bloccare tabelle non quadrate.
create or replace function public.ensure_unit_millesimal_values()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.condominium_millesimal_values
    (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
  select NEW.workspace_id, NEW.condominium_id, t.id, NEW.id, 0, false, ''
  from public.condominium_millesimal_tables t
  where t.condominium_id = NEW.condominium_id
    and t.workspace_id = NEW.workspace_id
    and t.active
  on conflict (workspace_id, table_id, unit_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_ensure_unit_millesimal_values on public.condominium_units;
create trigger trg_ensure_unit_millesimal_values
after insert on public.condominium_units
for each row execute function public.ensure_unit_millesimal_values();

create or replace function public.ensure_table_millesimal_values()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if NEW.active then
    insert into public.condominium_millesimal_values
      (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
    select NEW.workspace_id, NEW.condominium_id, NEW.id, u.id, 0, false, ''
    from public.condominium_units u
    where u.condominium_id = NEW.condominium_id
      and u.workspace_id = NEW.workspace_id
    on conflict (workspace_id, table_id, unit_id) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_ensure_table_millesimal_values on public.condominium_millesimal_tables;
create trigger trg_ensure_table_millesimal_values
after insert on public.condominium_millesimal_tables
for each row execute function public.ensure_table_millesimal_values();

insert into public.condominium_millesimal_values
  (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
select t.workspace_id, t.condominium_id, t.id, u.id, 0, false, ''
from public.condominium_millesimal_tables t
join public.condominium_units u
  on u.condominium_id = t.condominium_id
 and u.workspace_id = t.workspace_id
where t.active
on conflict (workspace_id, table_id, unit_id) do nothing;
