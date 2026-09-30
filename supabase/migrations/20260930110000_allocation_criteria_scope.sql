-- Extend millesimal tables into reusable allocation criteria.
alter table public.condominium_units
  add column if not exists building_code text not null default '';

alter table public.condominium_millesimal_tables
  add column if not exists basis_type text not null default 'Millesimi',
  add column if not exists scope_mode text not null default 'all',
  add column if not exists scope_unit_ids uuid[] not null default '{}'::uuid[],
  add column if not exists scope_building_codes text[] not null default '{}'::text[];

alter table public.condominium_millesimal_tables
  drop constraint if exists condominium_millesimal_tables_basis_type_check;
alter table public.condominium_millesimal_tables
  add constraint condominium_millesimal_tables_basis_type_check
  check (basis_type in ('Millesimi','Quote personalizzate','Consumo','Misto'));

alter table public.condominium_millesimal_tables
  drop constraint if exists condominium_millesimal_tables_scope_mode_check;
alter table public.condominium_millesimal_tables
  add constraint condominium_millesimal_tables_scope_mode_check
  check (scope_mode in ('all','units','buildings'));

create index if not exists condominium_units_building_code_idx
  on public.condominium_units(workspace_id, condominium_id, building_code);
create index if not exists condominium_millesimal_tables_scope_mode_idx
  on public.condominium_millesimal_tables(workspace_id, condominium_id, scope_mode);

-- The allocation RPC uses the configured table scope. This allows whole-condominium,
-- selected-unit, and building/civic criteria while retaining exact cent rounding.
create or replace function public.generate_condominium_expense_allocations(
  p_workspace_id uuid,p_condominium_id uuid,p_ledger_entry_id uuid,p_table_id uuid,p_due_date date default null)
returns table(unit_id uuid,millesimi numeric,amount numeric)
language plpgsql security invoker set search_path=public
as $$
declare
  v_entry public.condominium_ledger_entries%rowtype;
  v_table public.condominium_millesimal_tables%rowtype;
  v_expense numeric; v_due_date date; v_total numeric;
  v_unit_count integer; v_value_count integer; v_installments integer; v_other_allocations integer;
begin
  select * into v_entry from public.condominium_ledger_entries
  where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
  if not found or v_entry.direction<>'Uscita' or coalesce(v_entry.amount,0)<=0 then
    raise exception 'Spesa non valida o non appartenente al condominio';
  end if;

  select * into v_table from public.condominium_millesimal_tables
  where id=p_table_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and active=true;
  if not found then raise exception 'Tabella millesimale non valida o non attiva'; end if;

  v_installments := (select count(*) from public.condominium_installments
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id);
  if v_installments>0 then raise exception 'La spesa ha già rate collegate: modifica o elimina prima le rate per poter rigenerare la ripartizione'; end if;

  v_other_allocations := (select count(*) from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id and allocation_table_id is distinct from p_table_id);
  if v_other_allocations>0 then raise exception 'La spesa è già ripartita con un''altra tabella: elimina prima il riparto esistente per evitare una doppia imputazione'; end if;

  v_expense:=round(v_entry.amount::numeric,2);
  v_due_date:=coalesce(p_due_date,v_entry.due_date);

  v_unit_count := (select count(*) from public.condominium_units u
    where u.workspace_id=p_workspace_id and u.condominium_id=p_condominium_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(u.building_code))
        )
        else false
      end);
  if v_unit_count=0 then raise exception 'Il criterio di riparto non contiene unità eleggibili'; end if;

  v_value_count := (select count(*) from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(u.building_code))
        )
        else false
      end);
  if v_value_count<>v_unit_count then
    raise exception 'Tabella millesimale incompleta: inserire una quota per ogni unità prevista dal criterio';
  end if;

  v_total := (select coalesce(sum(v.value),0) from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(u.building_code))
        )
        else false
      end);
  if v_total<=0 then raise exception 'Nessuna quota millesimale eleggibile'; end if;
  if abs(v_total-coalesce(v_table.total_millesimi,0))>0.001 then
    raise exception 'La somma delle quote millesimali del criterio non coincide con il totale della tabella';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id and allocation_table_id=p_table_id;

  return query
  with eligible as (
    select v.unit_id eligible_unit_id,v.value::numeric eligible_millesimi,
           v_expense*v.value::numeric/v_total exact_amount
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id
      and v.table_id=p_table_id and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(u.building_code))
        )
        else false
      end
  ), rounded as (
    select e.*,floor(e.exact_amount*100)/100 base_amount,
           e.exact_amount-floor(e.exact_amount*100)/100 remainder
    from eligible e
  ), delta as (
    select round(v_expense*100)-round(coalesce(sum(r.base_amount),0)*100) cents from rounded r
  ), ranked as (
    select r.*,row_number() over(order by r.remainder desc,r.eligible_unit_id) rn from rounded r
  ), final_amounts as (
    select r.eligible_unit_id final_unit_id,r.eligible_millesimi final_millesimi,
           r.base_amount+case when r.rn <= greatest((select cents from delta),0) then 0.01 else 0 end final_amount
    from ranked r
  )
  insert into public.condominium_expense_allocations(
    workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,
    allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
  select p_workspace_id,p_condominium_id,p_ledger_entry_id,p_table_id,f.final_unit_id,null,
         v_table.basis_type,f.final_millesimi,f.final_amount,0,v_due_date,'Da pagare',
         'Generata automaticamente secondo il criterio configurato'
  from final_amounts f
  returning condominium_expense_allocations.unit_id,
            condominium_expense_allocations.millesimi,
            condominium_expense_allocations.amount;
end;
$$;

revoke execute on function public.sync_condominium_fund_usage() from public;
