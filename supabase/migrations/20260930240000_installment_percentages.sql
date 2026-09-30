-- Extend annual installment plans with administrator-defined percentages.
drop function if exists public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid);

create or replace function public.generate_installments_from_allocations_schedule(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_ledger_entry_id uuid,
  p_title text,
  p_due_dates date[],
  p_fiscal_year_id uuid default null,
  p_percentages numeric[] default null
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expense public.condominium_ledger_entries%rowtype;
  v_year public.condominium_fiscal_years%rowtype;
  v_count integer;
  v_idx integer;
  v_alloc public.condominium_expense_allocations%rowtype;
  v_base numeric;
  v_amount numeric;
  v_sum numeric;
  v_percent_sum numeric;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
  if coalesce(trim(p_title),'')='' then raise exception 'Il titolo delle rate è obbligatorio'; end if;
  if p_due_dates is null or coalesce(array_length(p_due_dates,1),0)<1 then raise exception 'Indicare almeno una scadenza'; end if;
  v_count:=array_length(p_due_dates,1);
  if v_count>12 then raise exception 'Il numero massimo di rate annuali è 12'; end if;
  for v_idx in 1..v_count loop
    if p_due_dates[v_idx] is null then raise exception 'Ogni rata deve avere una scadenza'; end if;
    if v_idx>1 and p_due_dates[v_idx]<=p_due_dates[v_idx-1] then raise exception 'Le scadenze devono essere in ordine cronologico e non duplicate'; end if;
  end loop;
  if p_percentages is not null then
    if coalesce(array_length(p_percentages,1),0)<>v_count then raise exception 'Il numero delle percentuali deve coincidere con il numero delle rate'; end if;
    if exists(select 1 from unnest(p_percentages) x where x is null or x<=0) then raise exception 'Le percentuali devono essere positive'; end if;
    select round(sum(x),6) into v_percent_sum from unnest(p_percentages) x;
    if abs(v_percent_sum-100)>0.001 then raise exception 'La somma delle percentuali deve essere 100'; end if;
  end if;
  select * into v_expense from public.condominium_ledger_entries
    where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Spesa non trovata'; end if;
  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then raise exception 'Il movimento selezionato non è una spesa valida'; end if;
  if p_fiscal_year_id is not null then
    select * into v_year from public.condominium_fiscal_years
      where id=p_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
    if not found then raise exception 'Esercizio contabile non valido'; end if;
    if v_year.status='Chiuso' then raise exception 'L''esercizio contabile è chiuso'; end if;
    if exists(select 1 from unnest(p_due_dates) d where d<v_year.start_date or d>v_year.end_date) then
      raise exception 'Tutte le scadenze devono rientrare nell''esercizio contabile selezionato';
    end if;
  end if;
  if p_fiscal_year_id is null and exists(
    select 1 from unnest(p_due_dates) d
    where not exists(
      select 1 from public.condominium_fiscal_years y
      where y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and d between y.start_date and y.end_date
    )
  ) then raise exception 'Ogni scadenza deve appartenere a un esercizio contabile'; end if;
  if p_fiscal_year_id is null and exists(
    select 1 from unnest(p_due_dates) d
    join public.condominium_fiscal_years y on y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and d between y.start_date and y.end_date
    where y.status='Chiuso'
  ) then raise exception 'Una o più scadenze ricadono in un esercizio contabile chiuso'; end if;
  select count(*) into v_count from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id;
  if v_count=0 then raise exception 'La spesa non ha ripartizioni'; end if;
  if exists(select 1 from public.condominium_installments
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id) then
    raise exception 'La spesa ha già rate collegate';
  end if;
  v_count:=array_length(p_due_dates,1);
  for v_alloc in select * from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id order by id loop
    v_sum:=0;
    for v_idx in 1..v_count loop
      if p_percentages is null then v_base:=round(v_alloc.amount/v_count,2);
      else v_base:=round(v_alloc.amount*(p_percentages[v_idx]/100),2);
      end if;
      if v_idx=v_count then v_amount:=round(v_alloc.amount-v_sum,2); else v_amount:=v_base; end if;
      v_sum:=v_sum+v_amount;
      insert into public.condominium_installments(
        workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes)
      select p_workspace_id,p_condominium_id,
        coalesce(p_fiscal_year_id,y.id),p_ledger_entry_id,v_alloc.member_id,v_alloc.unit_id,
        trim(p_title)||' - rata '||v_idx||'/'||v_count,v_amount,0,'Da pagare',p_due_dates[v_idx],coalesce(v_alloc.notes,'')
      from public.condominium_fiscal_years y
      where y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and p_due_dates[v_idx] between y.start_date and y.end_date
      order by y.start_date limit 1;
      if not found then raise exception 'Esercizio contabile non trovato per la scadenza %',p_due_dates[v_idx]; end if;
    end loop;
  end loop;
  return (select count(*) from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id);
end;
$$;

grant execute on function public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[]) to authenticated;
