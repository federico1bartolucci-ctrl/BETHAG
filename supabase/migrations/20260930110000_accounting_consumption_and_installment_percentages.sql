-- Accounting enhancements derived from condominium source documents:
-- allocation rules, consumption readings and percentage-based installment schedules.

create table if not exists public.condominium_allocation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  expense_type text,
  category text,
  allocation_table_id uuid not null references public.condominium_millesimal_tables(id) on delete restrict,
  priority integer not null default 100,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint allocation_rules_priority_ck check (priority >= 0),
  constraint allocation_rules_scope_ck check (nullif(trim(coalesce(expense_type,'')),'') is not null or nullif(trim(coalesce(category,'')),'') is not null)
);

create index if not exists condominium_allocation_rules_lookup_idx
  on public.condominium_allocation_rules(workspace_id, condominium_id, active, priority, category, expense_type);

alter table public.condominium_allocation_rules enable row level security;
drop policy if exists "managers manage allocation rules" on public.condominium_allocation_rules;
create policy "managers manage allocation rules" on public.condominium_allocation_rules
  for all to authenticated
  using (private.can_manage_workspace_module(workspace_id,'contabilita'))
  with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
drop policy if exists "authorized users read allocation rules" on public.condominium_allocation_rules;
create policy "authorized users read allocation rules" on public.condominium_allocation_rules
  for select to authenticated
  using ((select private.can_access_workspace_module(workspace_id,'contabilita')));

create table if not exists public.condominium_consumption_readings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  fiscal_year_id uuid references public.condominium_fiscal_years(id) on delete set null,
  unit_id uuid not null references public.condominium_units(id) on delete cascade,
  service_type text not null default 'Riscaldamento',
  period_start date,
  period_end date,
  meter_code text not null default '',
  previous_reading numeric(14,4),
  current_reading numeric(14,4),
  consumption numeric(14,4),
  kwh numeric(14,4),
  allocation_value numeric(14,4),
  charge_amount numeric(14,2),
  source text not null default 'Manuale',
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumption_nonnegative_ck check (coalesce(previous_reading,0)>=0 and coalesce(current_reading,0)>=0 and coalesce(consumption,0)>=0 and coalesce(kwh,0)>=0 and coalesce(allocation_value,0)>=0 and coalesce(charge_amount,0)>=0),
  constraint consumption_period_ck check (period_start is null or period_end is null or period_start<=period_end),
  constraint consumption_reading_ck check (current_reading is null or previous_reading is null or current_reading>=previous_reading)
);

create index if not exists condominium_consumption_readings_lookup_idx
  on public.condominium_consumption_readings(workspace_id, condominium_id, fiscal_year_id, service_type, unit_id);
create unique index if not exists condominium_consumption_readings_unique_idx
  on public.condominium_consumption_readings(workspace_id, condominium_id, fiscal_year_id, unit_id, service_type, meter_code, period_start, period_end);

alter table public.condominium_consumption_readings enable row level security;
drop policy if exists "managers manage consumption readings" on public.condominium_consumption_readings;
create policy "managers manage consumption readings" on public.condominium_consumption_readings
  for all to authenticated
  using (private.can_manage_workspace_module(workspace_id,'contabilita'))
  with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
drop policy if exists "authorized users read consumption readings" on public.condominium_consumption_readings;
create policy "authorized users read consumption readings" on public.condominium_consumption_readings
  for select to authenticated
  using ((select private.can_access_workspace_module(workspace_id,'contabilita')));

drop function if exists public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid);

create or replace function public.generate_installments_from_allocations_schedule(
  p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text,
  p_due_dates date[], p_fiscal_year_id uuid default null, p_percentages numeric[] default null
) returns integer
language plpgsql security invoker set search_path=public
as $function$
declare
  v_expense public.condominium_ledger_entries%rowtype;
  v_source_year public.condominium_fiscal_years%rowtype;
  v_year public.condominium_fiscal_years%rowtype;
  v_count integer; v_idx integer; v_alloc public.condominium_expense_allocations%rowtype;
  v_base numeric; v_amount numeric; v_sum numeric; v_year_id uuid; v_year_count integer; v_percent_sum numeric;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
  if coalesce(trim(p_title),'')='' then raise exception 'Il titolo delle rate è obbligatorio'; end if;
  if p_due_dates is null or coalesce(array_length(p_due_dates,1),0)<1 then raise exception 'Indicare almeno una scadenza'; end if;
  v_count:=array_length(p_due_dates,1);
  if v_count>12 then raise exception 'Il numero massimo di rate per un piano è 12'; end if;
  for v_idx in 1..v_count loop
    if p_due_dates[v_idx] is null then raise exception 'Ogni rata deve avere una scadenza'; end if;
    if v_idx>1 and p_due_dates[v_idx]<=p_due_dates[v_idx-1] then raise exception 'Le scadenze devono essere crescenti e non duplicate'; end if;
  end loop;
  if p_percentages is not null then
    if coalesce(array_length(p_percentages,1),0)<>v_count then raise exception 'Il numero delle percentuali deve coincidere con il numero delle rate'; end if;
    if exists(select 1 from unnest(p_percentages) x where x is null or x<=0) then raise exception 'Le percentuali delle rate devono essere positive'; end if;
    select round(sum(x),6) into v_percent_sum from unnest(p_percentages) x;
    if abs(v_percent_sum-100)>0.001 then raise exception 'La somma delle percentuali deve essere 100'; end if;
  end if;
  select * into v_expense from public.condominium_ledger_entries where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Spesa non trovata'; end if;
  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then raise exception 'Il movimento selezionato non è una spesa valida'; end if;
  if p_fiscal_year_id is not null then
    select * into v_source_year from public.condominium_fiscal_years where id=p_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
    if not found then raise exception 'Esercizio contabile di riferimento non valido'; end if;
    if v_source_year.status='Chiuso' then raise exception 'L''esercizio contabile di riferimento è chiuso'; end if;
  end if;
  for v_idx in 1..v_count loop
    select * into v_year from public.condominium_fiscal_years where workspace_id=p_workspace_id and condominium_id=p_condominium_id and p_due_dates[v_idx] between start_date and end_date order by start_date limit 1;
    if not found then raise exception 'Non esiste un esercizio contabile per la scadenza %: crea prima l''esercizio corrispondente',p_due_dates[v_idx]; end if;
    if v_year.status='Chiuso' then raise exception 'La scadenza % ricade in un esercizio contabile chiuso',p_due_dates[v_idx]; end if;
  end loop;
  for v_idx in 1..v_count loop
    select count(*) into v_year_count from unnest(p_due_dates) d where d between
      (select start_date from public.condominium_fiscal_years where id=(select id from public.condominium_fiscal_years where workspace_id=p_workspace_id and condominium_id=p_condominium_id and p_due_dates[v_idx] between start_date and end_date order by start_date limit 1))
      and
      (select end_date from public.condominium_fiscal_years where id=(select id from public.condominium_fiscal_years where workspace_id=p_workspace_id and condominium_id=p_condominium_id and p_due_dates[v_idx] between start_date and end_date order by start_date limit 1));
    if v_year_count>12 then raise exception 'Non sono consentite più di 12 rate nello stesso esercizio contabile'; end if;
  end loop;
  select count(*) into v_count from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id;
  if v_count=0 then raise exception 'La spesa non ha ripartizioni'; end if;
  if exists(select 1 from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id) then raise exception 'La spesa ha già rate collegate'; end if;
  v_count:=array_length(p_due_dates,1);
  for v_alloc in select * from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id order by id loop
    v_sum:=0;
    for v_idx in 1..v_count loop
      select id into v_year_id from public.condominium_fiscal_years where workspace_id=p_workspace_id and condominium_id=p_condominium_id and p_due_dates[v_idx] between start_date and end_date order by start_date limit 1;
      if p_percentages is null then v_base:=round(v_alloc.amount/v_count,2); else v_base:=round(v_alloc.amount*(p_percentages[v_idx]/100),2); end if;
      if v_idx=v_count then v_amount:=round(v_alloc.amount-v_sum,2); else v_amount:=v_base; end if;
      v_sum:=v_sum+v_amount;
      insert into public.condominium_installments(workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes)
      values(p_workspace_id,p_condominium_id,v_year_id,p_ledger_entry_id,v_alloc.member_id,v_alloc.unit_id,trim(p_title)||' - rata '||v_idx||'/'||v_count,v_amount,0,'Da pagare',p_due_dates[v_idx],coalesce(v_alloc.notes,''));
    end loop;
  end loop;
  return (select count(*) from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id);
end;
$function$;

create or replace function public.generate_consumption_allocations(
  p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text
) returns integer
language plpgsql security invoker set search_path=public
as $function$
declare
  v_expense public.condominium_ledger_entries%rowtype; v_count integer; v_total_weight numeric; v_row record;
  v_total_cents bigint; v_assigned_cents bigint:=0; v_exact numeric; v_base bigint; v_remaining bigint;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
  select * into v_expense from public.condominium_ledger_entries where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Spesa non trovata'; end if;
  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then raise exception 'Il movimento selezionato non è una spesa valida'; end if;
  if exists(select 1 from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id) then raise exception 'La spesa ha già rate collegate'; end if;
  select count(*) into v_count from public.condominium_consumption_readings where workspace_id=p_workspace_id and condominium_id=p_condominium_id and fiscal_year_id=p_fiscal_year_id and lower(trim(service_type))=lower(trim(p_service_type));
  if v_count=0 then raise exception 'Nessun dato di consumo disponibile per il servizio selezionato'; end if;
  select sum(coalesce(nullif(charge_amount,0),nullif(allocation_value,0),nullif(consumption,0),nullif(kwh,0),0)) into v_total_weight from public.condominium_consumption_readings where workspace_id=p_workspace_id and condominium_id=p_condominium_id and fiscal_year_id=p_fiscal_year_id and lower(trim(service_type))=lower(trim(p_service_type));
  if coalesce(v_total_weight,0)<=0 then raise exception 'I dati di consumo non contengono un valore utile al riparto'; end if;
  delete from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id;
  v_total_cents:=round(v_expense.amount*100);
  for v_row in
    select r.unit_id,sum(coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)) as weight
    from public.condominium_consumption_readings r
    where r.workspace_id=p_workspace_id and r.condominium_id=p_condominium_id and r.fiscal_year_id=p_fiscal_year_id and lower(trim(r.service_type))=lower(trim(p_service_type))
      and coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)>0
    group by r.unit_id order by r.unit_id
  loop
    v_exact:=v_total_cents*v_row.weight/v_total_weight; v_base:=floor(v_exact);
    insert into public.condominium_expense_allocations(workspace_id,condominium_id,ledger_entry_id,unit_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
    values(p_workspace_id,p_condominium_id,p_ledger_entry_id,v_row.unit_id,'Consumo - '||trim(p_service_type),v_row.weight,v_base/100.0,0,v_expense.due_date,'Da pagare','Riparto generato dai dati di consumo importati/inseriti in BETHAG.');
    v_assigned_cents:=v_assigned_cents+v_base;
  end loop;
  v_remaining:=v_total_cents-v_assigned_cents;
  if v_remaining>0 then
    with ranked as (
      select a.id,row_number() over(order by ((v_total_cents*a.millesimi/v_total_weight)-floor(v_total_cents*a.millesimi/v_total_weight)) desc,a.id) as rn
      from public.condominium_expense_allocations a
      where a.workspace_id=p_workspace_id and a.condominium_id=p_condominium_id and a.ledger_entry_id=p_ledger_entry_id
    )
    update public.condominium_expense_allocations a set amount=a.amount+0.01 from ranked r where a.id=r.id and r.rn<=v_remaining;
  end if;
  return (select count(*) from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id);
end;
$function$;

grant select,insert,update,delete on public.condominium_allocation_rules to authenticated;
grant select,insert,update,delete on public.condominium_consumption_readings to authenticated;
grant execute on function public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[]) to authenticated;
grant execute on function public.generate_consumption_allocations(uuid,uuid,uuid,uuid,text) to authenticated;
