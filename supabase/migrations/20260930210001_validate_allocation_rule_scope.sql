-- BETHAG: validate allocation rules against the same workspace/condominium.
create or replace function public.validate_allocation_rule_scope()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
  if new.allocation_table_id is null then
    raise exception 'Una regola di riparto deve indicare una tabella millesimale';
  end if;
  if not exists (
    select 1 from public.condominium_millesimal_tables t
    where t.id=new.allocation_table_id
      and t.workspace_id=new.workspace_id
      and t.condominium_id=new.condominium_id
  ) then
    raise exception 'La tabella della regola di riparto non appartiene al condominio selezionato';
  end if;
  if new.priority is null or new.priority < 0 then
    raise exception 'La priorità della regola di riparto non può essere negativa';
  end if;
  if coalesce(trim(new.name),'')='' then
    raise exception 'Il nome della regola di riparto è obbligatorio';
  end if;
  if coalesce(trim(new.expense_type),'')='' and coalesce(trim(new.category),'')='' then
    raise exception 'La regola deve indicare almeno il tipo di spesa o la categoria';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_allocation_rule_scope on public.condominium_allocation_rules;
create trigger trg_validate_allocation_rule_scope
before insert or update on public.condominium_allocation_rules
for each row execute function public.validate_allocation_rule_scope();

revoke all on function public.validate_allocation_rule_scope() from public;
grant execute on function public.validate_allocation_rule_scope() to authenticated;
