alter table public.condominium_ledger_entries
  add column if not exists deliberation_date date,
  add column if not exists assembly_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='condominium_ledger_entries_assembly_fk'
  ) then
    alter table public.condominium_ledger_entries
      add constraint condominium_ledger_entries_assembly_fk
      foreign key (assembly_id) references public.assemblies(id) on delete set null;
  end if;
end $$;

create index if not exists condominium_ledger_entries_assembly_id_idx
  on public.condominium_ledger_entries(assembly_id);

create index if not exists condominium_ledger_entries_deliberation_date_idx
  on public.condominium_ledger_entries(condominium_id, deliberation_date)
  where deliberation_date is not null;

create or replace function public.validate_ledger_entry_deliberation_scope()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_workspace uuid;
  v_condominium uuid;
begin
  if new.assembly_id is null then
    return new;
  end if;

  select a.workspace_id, a.condominium_id
    into v_workspace, v_condominium
  from public.assemblies a
  where a.id=new.assembly_id;

  if v_workspace is null or v_condominium is null then
    raise exception 'LEDGER_ASSEMBLY_SCOPE: l''assemblea collegata deve appartenere a un condominio valido';
  end if;

  if v_workspace <> new.workspace_id or v_condominium <> new.condominium_id then
    raise exception 'LEDGER_ASSEMBLY_SCOPE: l''assemblea collegata non appartiene allo stesso workspace/condominio della spesa';
  end if;

  if new.deliberation_date is null then
    new.deliberation_date := (select a.assembly_date::date from public.assemblies a where a.id=new.assembly_id);
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_ledger_entry_deliberation_scope() from anon, public;

drop trigger if exists trg_validate_ledger_entry_deliberation_scope on public.condominium_ledger_entries;
create trigger trg_validate_ledger_entry_deliberation_scope
before insert or update on public.condominium_ledger_entries
for each row execute function public.validate_ledger_entry_deliberation_scope();
