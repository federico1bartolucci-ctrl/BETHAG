-- Replay-only seed for two pre-ledger trigger helper functions.
-- The recovered ledger revokes EXECUTE on these functions at 20260929232302,
-- but only records their CREATE OR REPLACE definitions later at 20260930080309.
-- The earlier ACL statements prove both functions already existed before that point.
-- Their later historical definitions replace these seeds in chronological order.
-- Never deploy this compatibility seed to QA or Production.
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
