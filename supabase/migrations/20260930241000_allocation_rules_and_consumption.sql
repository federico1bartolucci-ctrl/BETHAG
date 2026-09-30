-- Structured allocation rules and consumption readings for advanced condominium accounting.
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
  constraint allocation_rules_scope_ck check (
    nullif(trim(coalesce(expense_type,'')),'') is not null
    or nullif(trim(coalesce(category,'')),'') is not null
  )
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
grant select,insert,update,delete on public.condominium_allocation_rules to authenticated;

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
  constraint consumption_nonnegative_ck check (
    coalesce(previous_reading,0)>=0 and coalesce(current_reading,0)>=0 and
    coalesce(consumption,0)>=0 and coalesce(kwh,0)>=0 and
    coalesce(allocation_value,0)>=0 and coalesce(charge_amount,0)>=0
  ),
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
grant select,insert,update,delete on public.condominium_consumption_readings to authenticated;

create or replace function public.generate_consumption_allocations(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_ledger_entry_id uuid,
  p_fiscal_year_id uuid,
  p_service_type text
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expense public.condominium_ledger_entries%rowtype;
  v_total_weight numeric;
  v_total_cents bigint;
  v_base_cents bigint;
  v_used_cents bigint := 0;
  v_idx integer := 0;
  v_count integer;
  v_row record;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
  select * into v_expense from public.condominium_ledger_entries
    where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Spesa non trovata'; end if;
  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then raise exception 'Il movimento selezionato non è una spesa valida'; end if;
  if exists(select 1 from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id)
    then raise exception 'La spesa ha già rate collegate'; end if;
  if exists(select 1 from public.condominium_fiscal_years where id=p_fiscal_year_id and status='Chiuso')
    then raise exception 'L''esercizio contabile è chiuso'; end if;
  select count(*) into v_count from public.condominium_consumption_readings
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and fiscal_year_id=p_fiscal_year_id
      and lower(trim(service_type))=lower(trim(p_service_type));
  if v_count=0 then raise exception 'Nessun dato di consumo disponibile per il servizio selezionato'; end if;
  select sum(coalesce(nullif(charge_amount,0),nullif(allocation_value,0),nullif(consumption,0),nullif(kwh,0),0))
    into v_total_weight
    from public.condominium_consumption_readings
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and fiscal_year_id=p_fiscal_year_id
      and lower(trim(service_type))=lower(trim(p_service_type));
  if coalesce(v_total_weight,0)<=0 then raise exception 'I dati di consumo non contengono un valore utile al riparto'; end if;
  delete from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id;
  v_total_cents:=round(v_expense.amount*100);
  select count(*) into v_count
    from public.condominium_consumption_readings
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and fiscal_year_id=p_fiscal_year_id
      and lower(trim(service_type))=lower(trim(p_service_type))
      and coalesce(nullif(charge_amount,0),nullif(allocation_value,0),nullif(consumption,0),nullif(kwh,0),0)>0;
  for v_row in
    select r.unit_id,u.unit_code,
      coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u on u.id=r.unit_id
    where r.workspace_id=p_workspace_id and r.condominium_id=p_condominium_id and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
      and coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)>0
    order by u.unit_code
  loop
    v_idx:=v_idx+1;
    v_base_cents:=floor(v_total_cents*v_row.weight/v_total_weight);
    if v_idx=v_count then v_base_cents:=v_total_cents-v_used_cents; end if;
    v_used_cents:=v_used_cents+v_base_cents;
    insert into public.condominium_expense_allocations(
      workspace_id,condominium_id,ledger_entry_id,unit_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
    values(
      p_workspace_id,p_condominium_id,p_ledger_entry_id,v_row.unit_id,
      'Consumo - '||trim(p_service_type),v_row.weight,v_base_cents/100.0,0,v_expense.due_date,'Da pagare',
      'Riparto generato dai dati di consumo inseriti/importati in BETHAG.');
  end loop;
  return v_count;
end;
$$;
grant execute on function public.generate_consumption_allocations(uuid,uuid,uuid,uuid,text) to authenticated;
