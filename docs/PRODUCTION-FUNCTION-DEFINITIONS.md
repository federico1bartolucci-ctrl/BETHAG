# BETHAG — Definizioni SQL delle funzioni contabili e di subentro

Estratto read-only da Production il 1 ottobre 2026. Le definizioni seguenti documentano il comportamento attualmente presente nel database e non costituiscono una migrazione da applicare. Prima di riutilizzarle in sviluppo occorre controllare dipendenze, grants, ruoli e compatibilità con lo schema ricostruito.

## private.close_fiscal_year_and_generate_carryovers

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid`

```sql
CREATE OR REPLACE FUNCTION private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_source public.condominium_fiscal_years%rowtype;
  v_target public.condominium_fiscal_years%rowtype;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_source
  from public.condominium_fiscal_years
  where id=p_source_fiscal_year_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then raise exception 'Esercizio contabile non trovato'; end if;

  perform public.close_condominium_fiscal_year(p_workspace_id,p_source_fiscal_year_id);

  select * into v_target
  from public.condominium_fiscal_years
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and start_date>v_source.end_date
  order by start_date
  limit 1
  for update;

  if v_target.id is not null then
    if exists (
      select 1 from public.condominiums c
      where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null
    ) then
      raise exception 'Non è possibile generare riporti per un condominio archiviato';
    end if;
    if v_target.status='Chiuso' then
      raise exception 'L''esercizio successivo è già chiuso e non può ricevere il saldo iniziale';
    end if;

    v_count := public.generate_fiscal_year_carryovers(
      p_workspace_id,p_condominium_id,v_source.id,v_target.id
    );
  end if;

  return v_count;
end;
$function$

```

## private.confirm_condominium_member_transfer

Argomenti: `p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb`

```sql
CREATE OR REPLACE FUNCTION private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text DEFAULT 'Vendita'::text, p_notes text DEFAULT ''::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid;
  v_condominium uuid;
  v_transfer_id uuid;
  v_incoming_id uuid;
  v_existing_count int;
  v_snapshot jsonb;
  v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
  if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;

  select u.workspace_id,u.condominium_id into v_workspace,v_condominium
  from public.condominium_units u where u.id=p_unit_id;

  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived=true) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;

  if not exists(
    select 1 from public.condominium_members m
    where m.id=p_outgoing_member_id and m.condominium_id=v_condominium
      and m.unit_id=p_unit_id and m.active
  ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;

  if exists(
    select 1 from public.condominium_member_transfers t
    where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date
      and t.status in ('Confermato','Chiuso')
  ) then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;

  select count(*) into v_existing_count
  from public.condominium_members m
  where m.condominium_id=v_condominium
    and m.unit_id=p_unit_id
    and m.active
    and m.id<>p_outgoing_member_id
    and coalesce(m.data->>'current_owner','true')='true'
    and coalesce(m.data->>'position_status','Attivo') <> 'In chiusura'
    and trim(coalesce(m.data->>'role',''))='Proprietario';

  if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;

  v_snapshot := jsonb_build_object(
    'captured_at',now(),
    'transfer_date',p_transfer_date,
    'outgoing_member_id',p_outgoing_member_id,
    'unit_id',p_unit_id,
    'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),
    'legal_liability_review_required',true
  );

  select coalesce(m.data,'{}'::jsonb) into v_out_data
  from public.condominium_members m where m.id=p_outgoing_member_id for update;

  update public.condominium_members
  set active=true, updated_at=now(),
      data=v_out_data||jsonb_build_object(
        'position_status','In chiusura',
        'current_owner',false,
        'subentro_date',p_transfer_date,
        'subentro_type',p_transfer_type
      )
  where id=p_outgoing_member_id;

  update public.portal_access set active=false where member_id=p_outgoing_member_id;

  update public.workspace_members
  set active=false, updated_at=now()
  where member_id=p_outgoing_member_id and role='resident';

  insert into public.condominium_members(
    condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at
  )
  values(
    v_condominium,p_incoming_user_id,trim(p_incoming_name),
    nullif(lower(trim(coalesce(p_incoming_email,''))),''),
    'resident',true,'{}'::jsonb,
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object(
      'role','Proprietario',
      'position_status','Attivo',
      'current_owner',true,
      'subentro_date',p_transfer_date,
      'subentro_type',p_transfer_type
    ),
    p_unit_id,now(),now()
  )
  returning id into v_incoming_id;

  insert into public.condominium_member_transfers(
    workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,
    transfer_date,transfer_type,status,notes,data,created_by
  )
  values(
    v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,
    p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object(
      'financial_history_preserved',true,
      'legal_liability_review_required',true,
      'accounting_snapshot',v_snapshot,
      'outgoing_portal_deactivated',true
    ),
    auth.uid()
  )
  returning id into v_transfer_id;

  return v_transfer_id;
end;
$function$

```

## private.generate_fiscal_year_carryovers

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid`

```sql
CREATE OR REPLACE FUNCTION private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_source public.condominium_fiscal_years%rowtype;
  v_target public.condominium_fiscal_years%rowtype;
  v_count integer := 0;
  v_closing numeric := 0;
begin
  if (select auth.uid()) is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_source from public.condominium_fiscal_years
   where id=p_source_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Esercizio di origine non trovato'; end if;

  select * into v_target from public.condominium_fiscal_years
   where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Esercizio di destinazione non trovato'; end if;

  if exists (select 1 from public.condominiums c where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null) then
    raise exception 'Non è possibile generare riporti per un condominio archiviato';
  end if;
  if v_source.status<>'Chiuso' then raise exception 'L''esercizio di origine deve essere chiuso'; end if;
  if v_target.id=v_source.id then raise exception 'Gli esercizi devono essere diversi'; end if;
  if v_target.start_date<=v_source.end_date then raise exception 'L''esercizio di destinazione deve essere successivo a quello di origine'; end if;
  if v_target.status='Chiuso' then raise exception 'L''esercizio di destinazione è chiuso e non può ricevere il saldo iniziale'; end if;

  if exists (
    select 1 from public.condominium_fiscal_carryovers c
    where c.workspace_id=p_workspace_id and c.condominium_id=p_condominium_id
      and c.source_fiscal_year_id=p_source_fiscal_year_id and c.target_fiscal_year_id=p_target_fiscal_year_id
      and exists (select 1 from public.condominium_fiscal_carryover_compensations cc where cc.carryover_id=c.id)
  ) then
    raise exception 'I riporti dell''esercizio indicato hanno già compensazioni e non possono essere rigenerati';
  end if;

  select round(
    coalesce(v_source.opening_balance,0)
    + coalesce(sum(case when e.direction='Entrata' then e.amount else 0 end),0)
    - coalesce(sum(case when e.direction='Uscita' then e.amount else 0 end),0),2)
    into v_closing
  from public.condominium_ledger_entries e
  where e.workspace_id=p_workspace_id and e.condominium_id=p_condominium_id and e.fiscal_year_id=p_source_fiscal_year_id;

  /* Prima rimuoviamo eventuali riporti rigenerabili: il trigger sul saldo iniziale
     impedisce infatti di cambiarlo mentre esistono riporti collegati. */
  delete from public.condominium_fiscal_carryovers
   where workspace_id=p_workspace_id and condominium_id=p_condominium_id
     and source_fiscal_year_id=p_source_fiscal_year_id and target_fiscal_year_id=p_target_fiscal_year_id;

  update public.condominium_fiscal_years
   set opening_balance=v_closing
   where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;

  insert into public.condominium_fiscal_carryovers(
    workspace_id,condominium_id,source_fiscal_year_id,target_fiscal_year_id,unit_id,member_id,balance,kind,status,notes
  )
  select p_workspace_id,p_condominium_id,p_source_fiscal_year_id,p_target_fiscal_year_id,
         q.unit_id,q.member_id,q.balance,
         case when q.balance>0 then 'Debito' else 'Credito' end,
         'Da riportare',
         'Saldo individuale riportato dall''esercizio '||v_source.name
  from (
    select i.unit_id,i.member_id,
           round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2) balance
    from public.condominium_installments i
    left join (
      select installment_id,sum(amount) total_paid
      from public.condominium_payment_movements
      where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      group by installment_id
    ) pm on pm.installment_id=i.id
    where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.fiscal_year_id=p_source_fiscal_year_id
    group by i.unit_id,i.member_id
    having abs(round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2))>=0.01
  ) q;

  get diagnostics v_count=row_count;
  return v_count;
end;
$function$

```

## private.generate_installments_from_allocations_schedule

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean`

```sql
CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid DEFAULT NULL::uuid, p_percentages numeric[] DEFAULT NULL::numeric[], p_unify_by_member boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a record; m record; i int; n int; part numeric; group_sum numeric; prior numeric; created_count integer:=0;
begin
if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text||':'||p_condominium_id::text||':'||p_ledger_entry_id::text,0));
if exists(select 1 from public.condominiums c where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null) then raise exception 'Il condominio è archiviato e non può essere modificato'; end if;
if trim(coalesce(p_title,''))='' then raise exception 'Il titolo delle rate è obbligatorio'; end if;
n:=coalesce(array_length(p_due_dates,1),0);
if p_fiscal_year_id is not null and not exists(select 1 from public.condominium_fiscal_years fy where fy.id=p_fiscal_year_id and fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id) then raise exception 'Esercizio contabile selezionato non valido'; end if;
if exists(select 1 from unnest(p_due_dates) d where (select count(*) from public.condominium_fiscal_years fy where fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id and d between fy.start_date and fy.end_date)<>1) then raise exception 'Ogni scadenza deve ricadere in un solo esercizio contabile valido'; end if;
if p_fiscal_year_id is not null and exists(select 1 from public.condominium_fiscal_years fy where fy.id=p_fiscal_year_id and fy.status='Chiuso') then raise exception 'Esercizio contabile di riferimento della spesa chiuso'; end if;
if exists(select 1 from unnest(p_due_dates) d join public.condominium_fiscal_years fy on fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id and d between fy.start_date and fy.end_date where fy.status='Chiuso') then raise exception 'Una o più scadenze ricadono in un esercizio contabile chiuso'; end if;
if n<1 or n>12 then raise exception 'Indicare da 1 a 12 scadenze'; end if;
for i in 1..n loop if p_due_dates[i] is null or (i>1 and p_due_dates[i]<=p_due_dates[i-1]) then raise exception 'Le scadenze devono essere valide, cronologiche e non duplicate'; end if; end loop;
if p_percentages is not null and (array_length(p_percentages,1)<>n or abs((select sum(x) from unnest(p_percentages) x)-100)>0.001 or exists(select 1 from unnest(p_percentages) x where x<=0)) then raise exception 'Percentuali rate non valide'; end if;
if not exists(select 1 from public.condominium_ledger_entries where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and direction='Uscita' and amount>0) then raise exception 'Spesa non valida'; end if;
if exists(select 1 from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id) then raise exception 'La spesa ha già rate collegate'; end if;
if not exists(select 1 from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id and amount>0) then raise exception 'La spesa non ha ripartizioni'; end if;
if p_unify_by_member then
if exists(select 1 from public.condominium_expense_allocations ea where ea.workspace_id=p_workspace_id and ea.condominium_id=p_condominium_id and ea.ledger_entry_id=p_ledger_entry_id and (select count(*) from public.condominium_members cm where cm.condominium_id=p_condominium_id and cm.unit_id=ea.unit_id and cm.active and trim(coalesce(cm.data->>'role',''))='Proprietario' and coalesce(cm.data->>'position_status','')<>'In chiusura')<>1) then raise exception 'Unificazione non consentita: ogni unità deve avere un unico proprietario corrente'; end if;
if exists(select 1 from public.condominium_expense_allocations ea join public.condominium_members cm on cm.condominium_id=p_condominium_id and cm.unit_id=ea.unit_id and cm.active and trim(coalesce(cm.data->>'role',''))='Proprietario' and coalesce(cm.data->>'position_status','')<>'In chiusura' where ea.workspace_id=p_workspace_id and ea.condominium_id=p_condominium_id and ea.ledger_entry_id=p_ledger_entry_id and nullif(trim(cm.user_id::text),'') is null and nullif(lower(trim(coalesce(cm.email,''))),'') is null) then raise exception 'Unificazione non consentita: almeno un proprietario corrente non dispone di un identificativo stabile'; end if;
end if;
for i in 1..n loop
if p_unify_by_member then
for m in select (array_agg(cm.id order by cm.id))[1] member_id,case when cm.user_id is not null then 'u:'||cm.user_id::text else 'e:'||lower(trim(cm.email)) end owner_key from public.condominium_members cm where cm.condominium_id=p_condominium_id and cm.active and trim(coalesce(cm.data->>'role',''))='Proprietario' and coalesce(cm.data->>'position_status','')<>'In chiusura' and exists(select 1 from public.condominium_expense_allocations a2 where a2.workspace_id=p_workspace_id and a2.condominium_id=p_condominium_id and a2.ledger_entry_id=p_ledger_entry_id and a2.unit_id=cm.unit_id) group by case when cm.user_id is not null then 'u:'||cm.user_id::text else 'e:'||lower(trim(cm.email)) end order by (array_agg(cm.id order by cm.id))[1] loop
group_sum:=0;
for a in select ea.* from public.condominium_expense_allocations ea join public.condominium_members cm2 on cm2.condominium_id=p_condominium_id and cm2.unit_id=ea.unit_id and cm2.active and trim(coalesce(cm2.data->>'role',''))='Proprietario' and coalesce(cm2.data->>'position_status','')<>'In chiusura' where ea.workspace_id=p_workspace_id and ea.condominium_id=p_condominium_id and ea.ledger_entry_id=p_ledger_entry_id and case when cm2.user_id is not null then 'u:'||cm2.user_id::text else 'e:'||lower(trim(cm2.email)) end=m.owner_key order by ea.id loop
if i=n then if p_percentages is null then part:=round(a.amount-round(a.amount/n,2)*(n-1),2); else prior:=coalesce((select sum(round(a.amount*x/100,2)) from unnest(p_percentages[1:n-1]) x),0); part:=round(a.amount-prior,2); end if;
else if p_percentages is null then part:=round(a.amount/n,2); else part:=round(a.amount*p_percentages[i]/100,2); end if; end if;
group_sum:=group_sum+part;
end loop;
if group_sum>0 then
insert into public.condominium_installments(workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes)
select p_workspace_id,p_condominium_id,y.id,p_ledger_entry_id,m.member_id,null,trim(p_title)||' - rata '||i||'/'||n,round(group_sum,2),0,'Da pagare',p_due_dates[i],'Rata unificata per proprietario' from public.condominium_fiscal_years y where y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and p_due_dates[i] between y.start_date and y.end_date order by y.start_date limit 1;
created_count:=created_count+1;
end if;
end loop;
else
for a in select * from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id and amount>0 order by id loop
if i=n then if p_percentages is null then part:=round(a.amount-round(a.amount/n,2)*(n-1),2); else prior:=coalesce((select sum(round(a.amount*x/100,2)) from unnest(p_percentages[1:n-1]) x),0); part:=round(a.amount-prior,2); end if;
else if p_percentages is null then part:=round(a.amount/n,2); else part:=round(a.amount*p_percentages[i]/100,2); end if; end if;
insert into public.condominium_installments(workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes)
select p_workspace_id,p_condominium_id,y.id,p_ledger_entry_id,a.member_id,a.unit_id,trim(p_title)||' - rata '||i||'/'||n,part,0,'Da pagare',p_due_dates[i],coalesce(a.notes,'') from public.condominium_fiscal_years y where y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and p_due_dates[i] between y.start_date and y.end_date order by y.start_date limit 1;
created_count:=created_count+1;
end loop;
end if;
end loop;
return created_count;
end;
$function$

```

## private.register_condominium_installment_payment

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text`

```sql
CREATE OR REPLACE FUNCTION private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text DEFAULT 'Bonifico'::text, p_reference text DEFAULT ''::text, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_installment public.condominium_installments%rowtype;
  v_new_paid numeric;
  v_status text;
  v_year_status text;
  v_start date;
  v_end date;
  v_allocation public.condominium_expense_allocations%rowtype;
  v_residual numeric;
  v_result_paid numeric;
  v_allocation_paid numeric;
  v_allocation_target numeric;
  v_remaining numeric;
  v_member_id uuid;
  v_owner_user_id uuid;
  v_owner_email text;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if exists (
    select 1 from public.condominiums c
    where c.id=p_condominium_id
      and c.workspace_id=p_workspace_id
      and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato e non può ricevere nuovi pagamenti';
  end if;

  if p_amount is null
     or p_amount::text in ('NaN','Infinity','-Infinity')
     or p_amount<=0 then
    raise exception 'L''importo del pagamento deve essere maggiore di zero';
  end if;

  if p_payment_date is null then
    raise exception 'La data del pagamento è obbligatoria';
  end if;

  select * into v_installment
  from public.condominium_installments
  where id=p_installment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Rata non trovata o non appartenente al condominio';
  end if;

  if v_installment.fiscal_year_id is not null then
    select status,start_date,end_date
    into v_year_status,v_start,v_end
    from public.condominium_fiscal_years
    where id=v_installment.fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id;

    if not found then
      raise exception 'Esercizio contabile della rata non valido';
    end if;

    if v_year_status='Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere modificato';
    end if;

    if p_payment_date<v_start or p_payment_date>v_end then
      raise exception 'La data del pagamento non rientra nell''esercizio contabile della rata';
    end if;
  end if;

  if v_installment.amount is null or v_installment.amount<=0 then
    raise exception 'Importo della rata non valido';
  end if;

  if coalesce(v_installment.paid_amount,0)<0
     or coalesce(v_installment.paid_amount,0)>v_installment.amount then
    raise exception 'Importo già pagato della rata non valido';
  end if;

  v_residual:=round(v_installment.amount-coalesce(v_installment.paid_amount,0),2);

  if v_residual<=0.005 then
    raise exception 'La rata risulta già completamente pagata';
  end if;

  if round(p_amount::numeric,2)>v_residual+0.005 then
    raise exception 'Il pagamento supera il residuo della rata: residuo %',
      to_char(v_residual,'FM999999990.00');
  end if;

  v_new_paid:=round(
    coalesce(v_installment.paid_amount,0)+round(p_amount::numeric,2)
  ,2);
  v_result_paid:=v_new_paid;

  if v_new_paid>=v_installment.amount-0.005 then
    v_new_paid:=round(v_installment.amount::numeric,2);
    v_status:='Pagato';
  elsif v_new_paid>0 then
    v_status:='Parzialmente pagato';
  else
    v_status:='Da pagare';
  end if;

  perform set_config('bethag.allow_installment_paid_update','on',true);

  insert into public.condominium_payment_movements(
    workspace_id,condominium_id,installment_id,payment_date,
    amount,method,reference,notes
  )
  values (
    p_workspace_id,p_condominium_id,p_installment_id,p_payment_date,
    round(p_amount::numeric,2),
    coalesce(nullif(trim(coalesce(p_method,'')),''),'Bonifico'),
    trim(coalesce(p_reference,'')),
    trim(coalesce(p_notes,''))
  );

  update public.condominium_installments
  set paid_amount=v_new_paid,status=v_status
  where id=p_installment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id;

  perform set_config('bethag.allow_allocation_paid_update','on',true);

  if v_installment.ledger_entry_id is not null then

    /*
      Rata unificata: il saldo viene distribuito esclusivamente tra le
      ripartizioni appartenenti allo stesso proprietario identificato
      dalla rata, mantenendo la semantica dell'unificazione.
    */
    if v_installment.unit_id is null and v_installment.member_id is not null then
      v_member_id:=v_installment.member_id;

      select cm.user_id, nullif(lower(trim(cm.email)),'')
      into v_owner_user_id,v_owner_email
      from public.condominium_members cm
      where cm.id=v_member_id
        and cm.condominium_id=p_condominium_id
        and cm.active
        and trim(coalesce(cm.data->>'role',''))='Proprietario';

      if not found then
        raise exception 'Proprietario della rata unificata non valido';
      end if;

      v_remaining:=v_new_paid;

      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=p_workspace_id
          and a.condominium_id=p_condominium_id
          and a.ledger_entry_id=v_installment.ledger_entry_id
          and exists (
            select 1
            from public.condominium_members cm
            where cm.condominium_id=p_condominium_id
              and cm.unit_id=a.unit_id
              and cm.active
              and trim(coalesce(cm.data->>'role',''))='Proprietario'
              and (
                (v_owner_user_id is not null and cm.user_id=v_owner_user_id)
                or
                (v_owner_user_id is null
                 and nullif(lower(trim(cm.email)),'') is not null
                 and nullif(lower(trim(cm.email)),'')=v_owner_email)
              )
          )
        order by a.id
        for update
      loop
        v_allocation_target:=least(
          round(coalesce(v_allocation.amount,0),2),
          greatest(round(v_remaining,2),0)
        );

        update public.condominium_expense_allocations
        set paid_amount=v_allocation_target,
            status=case
              when v_allocation_target>=amount-0.005 then 'Pagato'
              when v_allocation_target>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;

        v_remaining:=round(v_remaining-v_allocation_target,2);
        exit when v_remaining<=0.005;
      end loop;

      if v_remaining>0.005 then
        raise exception 'Il pagamento non è stato interamente riconciliato con le ripartizioni del proprietario';
      end if;

    else
      /*
        Rata non unificata: la ripartizione viene riconciliata sulla coppia
        unità + proprietario. Prima della correzione il solo unit_id poteva
        attribuire lo stesso totale pagato a più proprietari della stessa unità.
      */
      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=p_workspace_id
          and a.condominium_id=p_condominium_id
          and a.ledger_entry_id=v_installment.ledger_entry_id
          and a.unit_id=v_installment.unit_id
          and (
            (v_installment.member_id is not null and a.member_id=v_installment.member_id)
            or
            (v_installment.member_id is null and a.member_id is null)
          )
        order by a.id
        for update
      loop
        select least(
          v_allocation.amount,
          coalesce(sum(i.paid_amount),0)
        )
        into v_allocation_paid
        from public.condominium_installments i
        where i.workspace_id=p_workspace_id
          and i.condominium_id=p_condominium_id
          and i.ledger_entry_id=v_installment.ledger_entry_id
          and i.unit_id=v_allocation.unit_id
          and (
            (v_installment.member_id is not null and i.member_id=v_installment.member_id)
            or
            (v_installment.member_id is null and i.member_id is null)
          );

        update public.condominium_expense_allocations
        set paid_amount=coalesce(v_allocation_paid,0),
            status=case
              when coalesce(v_allocation_paid,0)>=amount-0.005 then 'Pagato'
              when coalesce(v_allocation_paid,0)>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;
      end loop;
    end if;
  end if;

  return v_result_paid;
end;
$function$

```

## private.reverse_condominium_installment_payment

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text`

```sql
CREATE OR REPLACE FUNCTION private.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_payment public.condominium_payment_movements%rowtype;
  v_year_status text;
  v_actor uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'La motivazione dello storno è obbligatoria';
  end if;

  select * into v_payment
  from public.condominium_payment_movements
  where id=p_payment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Pagamento non trovato o non appartenente al condominio';
  end if;

  select fy.status into v_year_status
  from public.condominium_installments i
  left join public.condominium_fiscal_years fy on fy.id=i.fiscal_year_id
  where i.id=v_payment.installment_id
    and i.workspace_id=p_workspace_id
    and i.condominium_id=p_condominium_id;

  if v_year_status='Chiuso' then
    raise exception 'L''esercizio contabile è chiuso: storno non consentito';
  end if;

  if exists (
    select 1 from public.condominium_payment_reversal_audit
    where original_payment_id=v_payment.id
  ) then
    raise exception 'Il pagamento è già stato stornato';
  end if;

  insert into public.condominium_payment_reversal_audit(
    original_payment_id,workspace_id,condominium_id,installment_id,
    amount,payment_date,method,reference,notes,reversal_reason,reversed_by
  )
  values (
    v_payment.id,v_payment.workspace_id,v_payment.condominium_id,
    v_payment.installment_id,v_payment.amount,v_payment.payment_date,
    v_payment.method,v_payment.reference,v_payment.notes,
    trim(p_reason),v_actor
  );

  delete from public.condominium_payment_movements
  where id=v_payment.id;

  return true;
end;
$function$

```

## public.close_fiscal_year_and_generate_carryovers

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid`

```sql
CREATE OR REPLACE FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_fiscal_year_and_generate_carryovers($1,$2,$3); end $function$

```

## public.confirm_allocation_intake

Argomenti: `p_workspace_id uuid, p_intake_id uuid`

```sql
CREATE OR REPLACE FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_intake public.condominium_allocation_intakes%rowtype;
 v_row jsonb;
 v_count integer:=0;
 v_unit_id uuid;
 v_amount numeric;
 v_millesimi numeric;
 v_total numeric:=0;
 v_total_millesimi numeric:=0;
 v_expense_amount numeric;
 v_table_total numeric;
 v_table_scope text;
 v_expected_millesimi numeric;
 v_building_code text;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;

 select * into v_intake from public.condominium_allocation_intakes
 where id=p_intake_id and workspace_id=p_workspace_id for update;

 if not found then raise exception 'Acquisizione riparto non trovata'; end if;
 if v_intake.status='Confermato' then
   return (select count(*) from public.condominium_expense_allocations where workspace_id=p_workspace_id and ledger_entry_id=v_intake.ledger_entry_id);
 end if;
 if v_intake.status='Annullato' then raise exception 'L''acquisizione è stata annullata'; end if;
 if coalesce(jsonb_array_length(v_intake.validation_errors),0)>0 then raise exception 'Il riparto contiene errori di validazione e non può essere confermato'; end if;
 if v_intake.ledger_entry_id is null then raise exception 'Collegare prima una spesa contabile'; end if;
 if coalesce(jsonb_array_length(v_intake.rows),0)=0 then raise exception 'Nessuna quota da confermare'; end if;

 select amount into v_expense_amount from public.condominium_ledger_entries
 where id=v_intake.ledger_entry_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and direction='Uscita';
 if v_expense_amount is null then raise exception 'La spesa collegata non è valida'; end if;
 if v_intake.expense_amount is not null and abs(v_intake.expense_amount-v_expense_amount)>0.005 then raise exception 'L''importo dell''acquisizione non coincide con la spesa contabile'; end if;

 if v_intake.allocation_table_id is not null then
   select total_millesimi,scope_mode into v_table_total,v_table_scope
   from public.condominium_millesimal_tables
   where id=v_intake.allocation_table_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and active=true;
   if not found then raise exception 'La tabella millesimale selezionata non è valida'; end if;
 end if;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round(coalesce((v_row->>'amount')::numeric,0),2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   if v_unit_id is null or v_amount<=0 or v_millesimi<0 then raise exception 'Riga di riparto non valida'; end if;
   if not exists(select 1 from public.condominium_units where id=v_unit_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id) then raise exception 'L''unità indicata non appartiene al condominio'; end if;

   if v_intake.allocation_table_id is not null then
     if v_table_scope='units' and not exists(select 1 from public.condominium_millesimal_tables t where t.id=v_intake.allocation_table_id and v_unit_id=any(t.scope_unit_ids)) then raise exception 'L''unità % non rientra nell''ambito della tabella millesimale selezionata',v_unit_id; end if;
     if v_table_scope='buildings' then
       select lower(trim(coalesce(data->>'building_code',data->>'civic_code',data->>'fabbricato',''))) into v_building_code from public.condominium_units where id=v_unit_id;
       if not exists(select 1 from public.condominium_millesimal_tables t cross join lateral unnest(t.scope_building_codes) as codes(code) where t.id=v_intake.allocation_table_id and lower(trim(codes.code))=v_building_code) then raise exception 'L''unità % non rientra nell''ambito per fabbricato/civico della tabella selezionata',v_unit_id; end if;
     end if;
     select value into v_expected_millesimi from public.condominium_millesimal_values where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and table_id=v_intake.allocation_table_id and unit_id=v_unit_id limit 1;
     if v_expected_millesimi is not null and abs(v_expected_millesimi-v_millesimi)>0.005 then raise exception 'I millesimi dell''unità % non coincidono con la tabella selezionata',v_unit_id; end if;
   end if;

   v_total:=v_total+v_amount; v_total_millesimi:=v_total_millesimi+v_millesimi; v_count:=v_count+1;
 end loop;

 if abs(v_total-v_expense_amount)>0.005 then raise exception 'La somma delle quote (%s) non coincide con la spesa (%s)',round(v_total,2),round(v_expense_amount,2); end if;
 if v_intake.allocation_table_id is not null and v_table_total is not null and abs(v_total_millesimi-v_table_total)>0.01 then raise exception 'I millesimi del riparto (%s) non coincidono con il totale della tabella (%s)',round(v_total_millesimi,3),round(v_table_total,3); end if;

 delete from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and ledger_entry_id=v_intake.ledger_entry_id;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round((v_row->>'amount')::numeric,2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   insert into public.condominium_expense_allocations(workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
   values(p_workspace_id,v_intake.condominium_id,v_intake.ledger_entry_id,v_intake.allocation_table_id,v_unit_id,null,
          case when v_intake.source='AI' then 'AI - confermato' else 'Manuale - confermato' end,
          v_millesimi,v_amount,0,(select due_date from public.condominium_ledger_entries where id=v_intake.ledger_entry_id),'Da pagare',coalesce(v_intake.notes,''));
 end loop;

 update public.condominium_allocation_intakes
 set status='Confermato',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id and workspace_id=p_workspace_id;

 return v_count;
end;
$function$

```

## public.confirm_condominium_member_transfer

Argomenti: `p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb`

```sql
CREATE OR REPLACE FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text DEFAULT 'Vendita'::text, p_notes text DEFAULT ''::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 return private.confirm_condominium_member_transfer(p_unit_id,p_outgoing_member_id,p_incoming_name,p_incoming_email,p_incoming_user_id,p_transfer_date,p_transfer_type,p_notes,p_data);
end;
$function$

```

## public.generate_fiscal_year_carryovers

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid`

```sql
CREATE OR REPLACE FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_fiscal_year_carryovers($1,$2,$3,$4); end $function$

```

## public.generate_installments_from_allocations_schedule

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean`

```sql
CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[] DEFAULT NULL::numeric[], p_unify_by_member boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations_schedule($1,$2,$3,$4,$5,$6,$7,$8); end $function$

```

## public.preview_condominium_member_transfer

Argomenti: `p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date`

```sql
CREATE OR REPLACE FUNCTION public.preview_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_workspace uuid; v_condominium uuid; v_result jsonb;
begin
 if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
 select u.workspace_id,u.condominium_id into v_workspace,v_condominium
 from public.condominium_units u where u.id=p_unit_id;
 if v_workspace is null or not private.can_access_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.condominium_members m where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;

 select jsonb_build_object(
  'transfer_date',p_transfer_date,'unit_id',p_unit_id,'outgoing_member_id',p_outgoing_member_id,
  'outstanding_before',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'installments_before',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),'[]'::jsonb),
  'extraordinary_deliberated_before_due_after',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'amount',a.amount,'paid_amount',a.paid_amount,'due_date',a.due_date,'status',a.status,'ledger_entry_id',a.ledger_entry_id,'deliberation_date',l.deliberation_date,'description',l.description) order by l.deliberation_date,a.due_date,a.id) from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),'[]'::jsonb),
  'unit_expenses',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'expense_type',l.expense_type,'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,'amount',l.amount,'assembly_id',l.assembly_id) order by coalesce(l.deliberation_date,l.entry_date),l.id) from public.condominium_ledger_entries l where l.unit_id=p_unit_id and l.condominium_id=v_condominium and (l.entry_date<=p_transfer_date or (l.deliberation_date is not null and l.deliberation_date<=p_transfer_date))),'[]'::jsonb),
  'review_flags',jsonb_build_object(
    'unpaid_before_transfer',exists(select 1 from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date and i.amount-i.paid_amount>0.005),
    'extraordinary_deliberated_before_due_after',exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),
    'legal_liability_review_required',true
  )
 ) into v_result;
 return v_result;
end;
$function$

```

## public.register_condominium_installment_payment

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text`

```sql
CREATE OR REPLACE FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text DEFAULT 'Bonifico'::text, p_reference text DEFAULT ''::text, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.register_condominium_installment_payment($1,$2,$3,$4,$5,$6,$7,$8); end $function$

```

## public.reverse_condominium_installment_payment

Argomenti: `p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text`

```sql
CREATE OR REPLACE FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.reverse_condominium_installment_payment($1,$2,$3,$4);
$function$

```