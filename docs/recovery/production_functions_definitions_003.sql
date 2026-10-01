-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb)
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
;

-- private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text)
CREATE OR REPLACE FUNCTION private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_condominium_id uuid;
  v_code_enabled boolean:=false;
  v_code_ok boolean:=false;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'condomini') then
    raise exception 'Operazione non autorizzata';
  end if;

  select coalesce(s.personal_code_enabled,false)
    into v_code_enabled
  from public.user_security_settings s
  where s.user_id=auth.uid();

  if v_code_enabled then
    select public.verify_personal_security_code(p_security_code) into v_code_ok;
    if not v_code_ok then raise exception 'Codice personale non valido'; end if;
  end if;

  select c.id into v_condominium_id
  from public.condominiums c
  where c.workspace_id=p_workspace_id and c.legacy_id=p_legacy_id
  for update;

  if v_condominium_id is null then raise exception 'Condominio non trovato'; end if;

  delete from public.portal_registration_requests
  where workspace_id=p_workspace_id
    and matched_member_id in (
      select id from public.condominium_members
      where condominium_id=v_condominium_id
    );

  delete from public.portal_access
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_work_documents
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_work_events
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_work_progress
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_works
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_register_items
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_suppliers
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.suppliers
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_payment_movements
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_installments
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_ledger_entries
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_budgets
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  -- Must precede fiscal-year deletion because this FK is intentionally RESTRICT.
  delete from public.condominium_fiscal_carryover_compensations
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_fiscal_carryovers
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_fiscal_years
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_funds
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_tax_obligations
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_legal_cases
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_millesimal_values
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_millesimal_tables
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_requests
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_members
  where condominium_id=v_condominium_id;
  delete from public.condominium_units
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.documents
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.deadlines
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.assemblies
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.communications
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.activities
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_insurance_policies
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_audit_log
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.workspace_members
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominiums
  where id=v_condominium_id and workspace_id=p_workspace_id;
end;
$function$
;

-- private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
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
;

-- private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid)
CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ declare v_count_before integer; v_count_after integer; begin if p_due_date is null then raise exception 'Titolo e scadenza sono obbligatori'; end if; select count(*) into v_count_before from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id; perform public.generate_installments_from_allocations_schedule(p_workspace_id,p_condominium_id,p_ledger_entry_id,p_title,array[p_due_date],p_fiscal_year_id,array[100]::numeric[],false); select count(*) into v_count_after from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id; return v_count_after-v_count_before; end; $function$
;

-- private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean)
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
;

-- private.guard_confirmed_intake_immutability()
CREATE OR REPLACE FUNCTION private.guard_confirmed_intake_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_op='DELETE' and old.status='Confermato' then
   raise exception 'Un''acquisizione confermata non può essere eliminata';
 end if;
 if tg_op='UPDATE' and old.status='Confermato' then
   raise exception 'Un''acquisizione confermata non può essere modificata';
 end if;
 return coalesce(new,old);
end;
$function$
;

-- private.handle_new_user()
CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();
  return new;
end;
$function$
;

-- private.is_workspace_admin(target_workspace uuid)
CREATE OR REPLACE FUNCTION private.is_workspace_admin(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and wm.role = 'admin'
  );
$function$
;
