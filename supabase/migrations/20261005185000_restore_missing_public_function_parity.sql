-- Restore missing public function parity from production.
CREATE OR REPLACE FUNCTION public.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select private.apply_resend_communication_event(
    p_provider_message_id,p_event_id,p_event_type,p_email,p_event_at
  );
$function$
;

CREATE OR REPLACE FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.archive_condominium($1,$2,$3); end $function$
;

CREATE OR REPLACE FUNCTION public.audit_document_ai_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old text := coalesce(nullif(btrim(old.data->>'aiStatus'),''),'Non elaborato');
  v_new text := coalesce(nullif(btrim(new.data->>'aiStatus'),''),'Non elaborato');
begin
  if v_old is distinct from v_new then
    insert into public.condominium_audit_log
      (workspace_id,condominium_id,entity_type,entity_id,action,description,data)
    values
      (new.workspace_id,new.condominium_id,'document',new.id,'AI_STATUS_CHANGE',
       'Cambio stato elaborazione AI documento',
       jsonb_build_object('from',v_old,'to',v_new,'title',new.title,'timestamp',now()));
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_condominium_member_unit_legacy_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.condominium_members
  set data = data - 'unitId' - 'apartment',
      updated_at = now()
  where unit_id = old.id;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_condominium_fiscal_year($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.confirm_condominium_creation_intake($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations($1,$2,$3,$4,$5,$6); end $function$
;

CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[] DEFAULT NULL::numeric[], p_unify_by_member boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations_schedule($1,$2,$3,$4,$5,$6,$7,$8); end $function$
;

CREATE OR REPLACE FUNCTION public.get_member_transfer_accounting_snapshot(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 t public.condominium_member_transfers%rowtype;
 result jsonb;
begin
 select * into t from public.condominium_member_transfers where id=p_transfer_id;
 if t.id is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
 if not private.can_access_workspace_module(t.workspace_id,'condomini') then raise exception 'FORBIDDEN'; end if;

 select jsonb_build_object(
   'captured_accounting_snapshot', coalesce(t.data->'accounting_snapshot','{}'::jsonb),
   'transfer', jsonb_build_object(
      'id',t.id,'unit_id',t.unit_id,'outgoing_member_id',t.outgoing_member_id,
      'incoming_member_id',t.incoming_member_id,'transfer_date',t.transfer_date,
      'transfer_type',t.transfer_type,'status',t.status
   ),
   'outgoing', jsonb_build_object(
      'installments_due_before', coalesce((select sum(i.amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date),0),
      'installments_paid_before', coalesce((select sum(i.paid_amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date),0),
      'installments_residual', coalesce((select sum(i.amount-i.paid_amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date),0),
      'allocations_before', coalesce((select sum(a.amount) from condominium_expense_allocations a where a.member_id=t.outgoing_member_id and (a.due_date is null or a.due_date <= t.transfer_date)),0)
   ),
   'post_transfer', jsonb_build_object(
      'installments_after', coalesce((select sum(i.amount) from condominium_installments i where i.member_id=t.incoming_member_id and i.due_date > t.transfer_date),0),
      'allocations_after', coalesce((select sum(a.amount) from condominium_expense_allocations a where a.member_id=t.incoming_member_id and (a.due_date is null or a.due_date > t.transfer_date)),0)
   ),
   'unit_expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',l.id,'description',l.description,'expense_type',l.expense_type,
        'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,
        'amount',l.amount,'assembly_id',l.assembly_id,
        'deliberation_before_transfer',
          case when l.deliberation_date is not null and l.deliberation_date <= t.transfer_date then true else false end
      ) order by coalesce(l.deliberation_date,l.entry_date),l.id)
      from condominium_ledger_entries l
      where l.unit_id=t.unit_id and l.condominium_id=t.condominium_id
        and (l.entry_date <= t.transfer_date or (l.deliberation_date is not null and l.deliberation_date <= t.transfer_date))
   ),'[]'::jsonb)
 ) into result;
 return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_condominium_expense_allocation_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ledger_amount numeric;
  v_other_total numeric;
begin
  if new.amount is null or new.amount < 0 then
    raise exception 'Importo della ripartizione non valido';
  end if;

  select le.amount
    into v_ledger_amount
  from public.condominium_ledger_entries le
  where le.id=new.ledger_entry_id
    and le.workspace_id=new.workspace_id
    and le.condominium_id=new.condominium_id
    and le.direction='Uscita'
  for update;

  if not found then
    raise exception 'La spesa collegata alla ripartizione non è valida';
  end if;

  select coalesce(sum(ea.amount),0)
    into v_other_total
  from public.condominium_expense_allocations ea
  where ea.ledger_entry_id=new.ledger_entry_id
    and ea.workspace_id=new.workspace_id
    and ea.condominium_id=new.condominium_id
    and ea.id is distinct from new.id;

  if round(v_other_total + new.amount,2) > round(v_ledger_amount,2) + 0.005 then
    raise exception 'Le ripartizioni superano l''importo della spesa';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_fiscal_carryover_compensation_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_c public.condominium_fiscal_carryovers%rowtype;
  v_total numeric;
  v_target public.condominium_installments%rowtype;
  v_target_comp numeric;
begin
  select * into v_c
  from public.condominium_fiscal_carryovers
  where id=new.carryover_id
  for update;

  if not found then
    raise exception 'Partita riportata non trovata';
  end if;

  if new.amount is null or new.amount<=0 then
    raise exception 'Importo compensazione non valido';
  end if;

  select coalesce(sum(x.amount),0)
    into v_total
  from public.condominium_fiscal_carryover_compensations x
  where x.carryover_id=new.carryover_id
    and (tg_op='INSERT' or x.id<>new.id);

  v_total:=round(v_total+new.amount,2);

  if v_total>round(abs(v_c.balance)+coalesce(v_total,0)-coalesce(v_total,0),2)+0.005 then
    -- The carryover balance is reduced after the compensation insert.
    -- Therefore the pre-insert remaining balance alone is not the original cap.
    -- Reconstruct the original cap from existing compensations plus current balance.
    null;
  end if;

  if v_total>round(abs(v_c.balance)+(
    select coalesce(sum(x.amount),0)
    from public.condominium_fiscal_carryover_compensations x
    where x.carryover_id=new.carryover_id
      and (tg_op='INSERT' or x.id<>new.id)
  ),2)+0.005 then
    raise exception 'Le compensazioni superano il valore originario della partita riportata';
  end if;

  if new.target_installment_id is not null then
    select * into v_target
    from public.condominium_installments
    where id=new.target_installment_id
    for update;

    if not found then
      raise exception 'Rata di destinazione non trovata';
    end if;

    select coalesce(sum(x.amount),0)
      into v_target_comp
    from public.condominium_fiscal_carryover_compensations x
    where x.target_installment_id=new.target_installment_id
      and (tg_op='INSERT' or x.id<>new.id);

    if round(v_target_comp+new.amount,2)>round(v_target.amount-v_target.paid_amount,2)+0.005 then
      raise exception 'Le compensazioni superano il residuo della rata di destinazione';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.list_archived_condominiums(p_workspace_id uuid)
 RETURNS SETOF condominiums
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return query select * from private.list_archived_condominiums($1); end $function$
;

CREATE OR REPLACE FUNCTION public.prepare_communication_recipients(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_catalog'
AS $function$ select private.prepare_communication_recipients(p_communication_id); $function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_condominium_accounting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_year_id uuid;
  v_new_year_id uuid;
  v_status text;
  v_old_parent_id uuid;
  v_new_parent_id uuid;
begin
  if tg_table_name in ('condominium_ledger_entries','condominium_budgets','condominium_installments') then
    if tg_op <> 'INSERT' then v_old_year_id := old.fiscal_year_id; end if;
    if tg_op <> 'DELETE' then v_new_year_id := new.fiscal_year_id; end if;
  elsif tg_table_name = 'condominium_expense_allocations' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.ledger_entry_id;
      select le.fiscal_year_id into v_old_year_id
      from public.condominium_ledger_entries le where le.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
      select le.fiscal_year_id into v_new_year_id
      from public.condominium_ledger_entries le where le.id = v_new_parent_id;
    end if;
  elsif tg_table_name = 'condominium_payment_movements' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.installment_id;
      select i.fiscal_year_id into v_old_year_id
      from public.condominium_installments i where i.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.installment_id;
      select i.fiscal_year_id into v_new_year_id
      from public.condominium_installments i where i.id = v_new_parent_id;
    end if;
  end if;

  if v_old_year_id is not null then
    select fy.status into v_status
    from public.condominium_fiscal_years fy where fy.id = v_old_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile di origine è chiuso: modifica non consentita.';
    end if;
  end if;

  if v_new_year_id is not null and v_new_year_id is distinct from v_old_year_id then
    select fy.status into v_status
    from public.condominium_fiscal_years fy where fy.id = v_new_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere eliminato';
  end if;
  if exists (select 1 from public.condominium_ledger_entries where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_installments where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_budgets where fiscal_year_id=old.id) then
    raise exception 'L''esercizio ha dati contabili collegati e non può essere eliminato';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_payment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_year_id uuid;
  v_status text;
begin
  select i.fiscal_year_id into v_year_id
  from public.condominium_installments i
  where i.id=old.installment_id;

  if v_year_id is not null then
    select status into v_status from public.condominium_fiscal_years where id=v_year_id;
    if v_status='Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e i pagamenti non possono essere modificati';
    end if;
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_record_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere modificato';
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere eliminato';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_reopen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op='INSERT' then
    if new.status='Chiuso'
       and coalesce(current_setting('bethag.allow_fiscal_year_status_update',true),'off')<>'on' then
      raise exception 'Un nuovo esercizio non può essere creato direttamente come chiuso: utilizzare la procedura di chiusura contabile';
    end if;
    return new;
  end if;

  if old.status='Chiuso' and new.status<>'Chiuso' then
    raise exception 'L''esercizio contabile è chiuso e non può essere riaperto.';
  end if;

  if new.status='Chiuso' and old.status is distinct from 'Chiuso'
     and coalesce(current_setting('bethag.allow_fiscal_year_status_update',true),'off')<>'on' then
    raise exception 'La chiusura dell''esercizio deve essere effettuata tramite la procedura di chiusura contabile.';
  end if;

  if new.start_date>new.end_date then
    raise exception 'La data di inizio esercizio non può essere successiva alla data di fine.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere modificato o riaperto';
  end if;
  if new.status='Chiuso' then
    return new;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_condominium_unit_delete_with_financial_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if exists (
    select 1 from public.condominium_expense_allocations
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_ALLOCATIONS: impossibile eliminare l''unità % perché contiene ripartizioni contabili. Eliminare o trasferire prima le ripartizioni collegate.', old.unit_code
      using errcode = '23503';
  end if;
  if exists (
    select 1 from public.condominium_installments
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_INSTALLMENTS: impossibile eliminare l''unità % perché contiene rate. Eliminare o trasferire prima le rate collegate.', old.unit_code
      using errcode = '23503';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_condominium_unit_delete_with_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.condominium_members where unit_id = old.id) then
    raise exception 'UNIT_HAS_MEMBERS: impossibile eliminare l''unità % perché contiene uno o più condòmini. Spostare prima i condòmini ad altra unità oppure eliminarli esplicitamente.', old.unit_code
      using errcode = '23503';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_payment_core_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.amount is distinct from old.amount
     or new.payment_date is distinct from old.payment_date
     or new.installment_id is distinct from old.installment_id
     or new.workspace_id is distinct from old.workspace_id
     or new.condominium_id is distinct from old.condominium_id then
    raise exception 'Importo, data e collegamento del pagamento sono immutabili: utilizzare lo storno con motivazione';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_self_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if auth.uid() is not null and (new.role is distinct from old.role or new.active is distinct from old.active) then raise exception 'I campi role e active del profilo non sono modificabili dall utente'; end if; return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.prevent_unsafe_condominium_unit_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_members integer; v_children integer; v_alloc integer; v_inst integer;
begin
  select count(*) into v_members from public.condominium_members where condominium_id=old.condominium_id and unit_id=old.id;
  if v_members>0 then raise exception 'L''unità è associata a uno o più condòmini e non può essere eliminata. Rimuovi prima le associazioni.'; end if;
  select count(*) into v_children from public.condominium_units where condominium_id=old.condominium_id and id<>old.id and nullif(trim(coalesce(data->>'incorporatedInUnitId','')), '')=old.id::text;
  if v_children>0 then raise exception 'L''unità è collegata come unità principale di una o più pertinenze e non può essere eliminata. Rimuovi prima i collegamenti.'; end if;
  select count(*) into v_alloc from public.condominium_expense_allocations where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  select count(*) into v_inst from public.condominium_installments where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  if v_alloc>0 or v_inst>0 then raise exception 'L''unità ha movimenti contabili o rate collegate e non può essere eliminata.'; end if;
  return old;
end; $function$
;

CREATE OR REPLACE FUNCTION public.preview_condominium_unit_transformation(p_condominium_id uuid, p_transformation_type text, p_source_unit_ids uuid[])
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
with requested as (
  select coalesce(cardinality(p_source_unit_ids),0) as requested_count,
         count(distinct x.unit_id) as distinct_count
  from unnest(coalesce(p_source_unit_ids, array[]::uuid[])) as x(unit_id)
),
eligible as (
  select u.id,u.unit_code,u.building_code,u.data,u.lifecycle_status
  from public.condominium_units u
  where u.id=any(coalesce(p_source_unit_ids,array[]::uuid[]))
    and u.condominium_id=p_condominium_id
    and u.lifecycle_status='Attiva'
),
counts as (
  select count(*)::integer as eligible_count from eligible
),
issues as (
  select coalesce(jsonb_agg(message order by priority),'[]'::jsonb) as errors
  from (values
    (1,case when p_condominium_id is null then 'Condominio non specificato.' end),
    (2,case when p_transformation_type not in ('Fusione','Frazionamento') or p_transformation_type is null then 'Tipo di trasformazione non valido.' end),
    (3,case when (select requested_count from requested)=0 then 'Selezionare almeno un’unità di origine.' end),
    (4,case when (select requested_count from requested)<>(select distinct_count from requested) then 'La selezione contiene unità duplicate.' end),
    (5,case when p_transformation_type='Fusione' and (select requested_count from requested)<2 then 'La fusione richiede almeno due unità di origine.' end),
    (6,case when p_transformation_type='Frazionamento' and (select requested_count from requested)<>1 then 'Il frazionamento richiede una sola unità di origine.' end),
    (7,case when (select eligible_count from counts)<>(select distinct_count from requested) then 'Una o più unità non esistono, non sono attive o non sono accessibili nel condominio selezionato.' end)
  ) v(priority,message)
  where message is not null
)
select jsonb_build_object(
  'condominium_id',p_condominium_id,
  'transformation_type',p_transformation_type,
  'requested_source_count',(select requested_count from requested),
  'source_unit_count',(select eligible_count from counts),
  'valid',jsonb_array_length((select errors from issues))=0,
  'validation_errors',(select errors from issues),
  'source_units',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'unit_code',e.unit_code,'building_code',e.building_code,'data',e.data,'lifecycle_status',e.lifecycle_status) order by e.unit_code) from eligible e),'[]'::jsonb),
  'active_members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'unit_id',m.unit_id,'name',m.name,'email',m.email,'user_id',m.user_id,'role',m.role,'active',m.active,'data',m.data) order by m.unit_id,m.id) from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and m.active),'[]'::jsonb),
  'ownership_summary',coalesce((select jsonb_agg(jsonb_build_object('owner_key',x.owner_key,'member_count',x.member_count,'unit_ids',x.unit_ids) order by x.owner_key) from (select case when m.user_id is not null then 'u:'||m.user_id::text when nullif(lower(trim(coalesce(m.email,''))),'') is not null then 'e:'||lower(trim(m.email)) else 'm:'||m.id::text end owner_key,count(*) member_count,jsonb_agg(distinct m.unit_id) unit_ids from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and m.active and trim(coalesce(m.data->>'role',m.role,''))='Proprietario' group by 1) x),'[]'::jsonb),
  'open_installments',coalesce((select round(sum(greatest(i.amount-i.paid_amount,0)),2) from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),0),
  'open_allocations',coalesce((select round(sum(greatest(a.amount-a.paid_amount,0)),2) from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),0),
  'millesimal_tables',coalesce((select jsonb_agg(jsonb_build_object('table_id',mt.id,'name',mt.name,'total_millesimi',mt.total_millesimi,'basis_type',mt.basis_type,'affected_values',coalesce((select jsonb_agg(jsonb_build_object('unit_id',mv.unit_id,'value',mv.value,'excluded',mv.excluded)) from public.condominium_millesimal_values mv where mv.table_id=mt.id and mv.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),'[]'::jsonb)) order by mt.name) from public.condominium_millesimal_tables mt where mt.condominium_id=p_condominium_id and mt.active),'[]'::jsonb),
  'accounting_resolution_required',exists(select 1 from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and i.amount-i.paid_amount>0.005) or exists(select 1 from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and a.amount-a.paid_amount>0.005),
  'millesimal_review_required',true,
  'unit_count_delta',case when p_transformation_type='Fusione' then 1-(select requested_count from requested) when p_transformation_type='Frazionamento' then null else 0 end
)
$function$
;

CREATE OR REPLACE FUNCTION public.require_confirmed_genealogy_for_unit_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.lifecycle_status is not distinct from old.lifecycle_status
     and new.lifecycle_effective_date is not distinct from old.lifecycle_effective_date then
    return new;
  end if;

  if current_user = 'postgres' then
    return new;
  end if;

  if new.lifecycle_status = 'Attiva' then
    raise exception 'UNIT_LIFECYCLE_REACTIVATION_REQUIRES_TRUSTED_RPC: la riattivazione deve essere gestita da una procedura autorizzata';
  end if;

  if old.lifecycle_status <> 'Attiva'
     or new.lifecycle_status not in ('Storica','Soppressa') then
    raise exception 'UNIT_LIFECYCLE_TRANSITION_INVALID: transizione dello stato catastale non consentita';
  end if;

  if new.lifecycle_effective_date is null or not exists (
    select 1
    from public.condominium_unit_transformation_items i
    join public.condominium_unit_transformations t on t.id = i.transformation_id
    where i.unit_id = old.id
      and i.direction = 'Fonte'
      and t.condominium_id = old.condominium_id
      and t.workspace_id = old.workspace_id
      and t.status = 'Confermata'
      and t.effective_date = new.lifecycle_effective_date
  ) then
    raise exception 'UNIT_LIFECYCLE_REQUIRES_CONFIRMED_GENEALOGY: unità storicizzabile o sopprimibile solo tramite trasformazione catastale confermata con data coincidente';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_stale_communication_recipients(p_communication_id uuid, p_age interval DEFAULT '00:15:00'::interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_ws uuid; v_count integer;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
 if p_age < interval '5 minutes' then raise exception 'Intervallo di recupero troppo breve'; end if;
 select workspace_id into v_ws from public.communications where id=p_communication_id and condominium_id is not null;
 if v_ws is null then raise exception 'Comunicazione non trovata'; end if;
 if not private.can_manage_workspace_module(v_ws,'comunicazioni') then raise exception 'Permessi insufficienti'; end if;
 update public.communication_recipients
 set status='pending', queued_at=null, error_message=null, updated_at=now()
 where communication_id=p_communication_id and status='queued'
   and queued_at is not null and queued_at < now()-p_age;
 get diagnostics v_count=row_count;
 return jsonb_build_object('reset',v_count);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.restore_condominium($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.reverse_condominium_installment_payment($1,$2,$3,$4);
$function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_expense_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ledger_id uuid;
  v_total numeric;
  v_paid numeric;
  v_status text;
  v_has_installments boolean;
begin
  v_ledger_id := coalesce(new.ledger_entry_id, old.ledger_entry_id);

  if v_ledger_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount),0), coalesce(sum(paid_amount),0), count(*) > 0
    into v_total, v_paid, v_has_installments
  from public.condominium_installments
  where ledger_entry_id=v_ledger_id;

  if not v_has_installments then
    v_status := 'Registrato';
  elsif v_paid >= v_total - 0.005 and v_total > 0 then
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif exists (
    select 1 from public.condominium_installments
    where ledger_entry_id=v_ledger_id
      and due_date < current_date
      and paid_amount < amount
  ) then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  update public.condominium_ledger_entries
  set payment_status=v_status
  where id=v_ledger_id;

  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_installment_from_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_installment_id uuid;
  v_workspace_id uuid;
  v_condominium_id uuid;
  v_amount numeric;
  v_paid numeric;
  v_status text;
  v_due_date date;
  v_unit_id uuid;
  v_member_id uuid;
  v_owner_user_id uuid;
  v_owner_email text;
  v_remaining numeric;
  v_allocation public.condominium_expense_allocations%rowtype;
  v_target numeric;
begin
  v_installment_id := coalesce(new.installment_id, old.installment_id);
  v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  v_condominium_id := coalesce(new.condominium_id, old.condominium_id);

  select amount, due_date, unit_id, member_id
    into v_amount, v_due_date, v_unit_id, v_member_id
  from public.condominium_installments
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id
  for update;

  if not found then
    return coalesce(new, old);
  end if;

  select round(coalesce(sum(amount),0)::numeric,2)
    into v_paid
  from public.condominium_payment_movements
  where installment_id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  if v_paid > v_amount + 0.005 then
    raise exception 'I pagamenti della rata superano l''importo della rata.';
  end if;

  if v_paid >= v_amount - 0.005 then
    v_paid := round(v_amount::numeric,2);
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif v_due_date < current_date then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  perform set_config('bethag.allow_installment_paid_update','on',true);

  update public.condominium_installments
  set paid_amount=v_paid,status=v_status
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  /*
    Dopo INSERT/UPDATE/DELETE di un movimento, riallinea anche le
    ripartizioni interessate. Questo è indispensabile soprattutto per
    lo storno: la rata può tornare parzialmente/non pagata e le
    ripartizioni devono riflettere lo stesso saldo.
  */
  perform set_config('bethag.allow_allocation_paid_update','on',true);

  if v_unit_id is null and v_member_id is not null then
    select cm.user_id, nullif(lower(trim(cm.email)),'')
      into v_owner_user_id, v_owner_email
    from public.condominium_members cm
    where cm.id=v_member_id
      and cm.condominium_id=v_condominium_id
      and cm.active
      and trim(coalesce(cm.data->>'role',''))='Proprietario';

    if found then
      v_remaining := v_paid;

      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=v_workspace_id
          and a.condominium_id=v_condominium_id
          and a.ledger_entry_id=(
            select i.ledger_entry_id
            from public.condominium_installments i
            where i.id=v_installment_id
          )
          and exists (
            select 1
            from public.condominium_members cm
            where cm.condominium_id=v_condominium_id
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
        v_target := least(
          round(coalesce(v_allocation.amount,0),2),
          greatest(round(v_remaining,2),0)
        );

        update public.condominium_expense_allocations
        set paid_amount=v_target,
            status=case
              when v_target>=amount-0.005 then 'Pagato'
              when v_target>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;

        v_remaining := round(v_remaining-v_target,2);
        exit when v_remaining<=0.005;
      end loop;
    end if;
  else
    update public.condominium_expense_allocations a
    set paid_amount=v_paid,
        status=case
          when v_paid>=a.amount-0.005 then 'Pagato'
          when v_paid>0 then 'Parzialmente pagato'
          else 'Da pagare'
        end
    where a.workspace_id=v_workspace_id
      and a.condominium_id=v_condominium_id
      and a.unit_id=v_unit_id
      and (
        (v_member_id is not null and a.member_id=v_member_id)
        or
        (v_member_id is null and a.member_id is null)
      )
      and a.ledger_entry_id=(
        select i.ledger_entry_id
        from public.condominium_installments i
        where i.id=v_installment_id
      );
  end if;

  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_documents_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_audit_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid;
begin
  if new.workspace_id is null then
    raise exception 'workspace_id audit obbligatorio';
  end if;

  if new.condominium_id is not null then
    select workspace_id into v_workspace
    from public.condominiums
    where id=new.condominium_id;

    if v_workspace is null then
      raise exception 'Condominio audit non trovato';
    end if;
    if v_workspace<>new.workspace_id then
      raise exception 'Workspace audit e condominio non coincidono';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_communication_recipient_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_ws uuid; v_cond uuid; v_member_cond uuid; v_member_user uuid; v_active boolean;
begin
 select workspace_id,condominium_id into v_ws,v_cond from public.communications where id=new.communication_id;
 if v_ws is null then raise exception 'La comunicazione del destinatario non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Destinatario e comunicazione devono appartenere allo stesso workspace'; end if;
 if new.condominium_id is distinct from v_cond then raise exception 'Destinatario e comunicazione devono appartenere allo stesso condominio'; end if;
 if new.member_id is not null then
   select condominium_id,user_id,active into v_member_cond,v_member_user,v_active from public.condominium_members where id=new.member_id;
   if v_member_cond is null or v_member_cond<>new.condominium_id then raise exception 'Il membro del destinatario non appartiene al condominio'; end if;
   if not coalesce(v_active,false) then raise exception 'Il membro del destinatario non è attivo'; end if;
   if new.user_id is not null and v_member_user is not null and new.user_id<>v_member_user then raise exception 'Utente e membro del destinatario non corrispondono'; end if;
 end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_communication_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_ws uuid; v_archived timestamptz;
begin
 if new.condominium_id is null then
   if new.published then raise exception 'Una comunicazione senza condominio non può essere pubblicata'; end if;
   return new;
 end if;
 select workspace_id,archived_at into v_ws,v_archived from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio della comunicazione non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Comunicazione e condominio devono appartenere allo stesso workspace'; end if;
 if new.published and v_archived is not null then raise exception 'Una comunicazione non può essere pubblicata su un condominio archiviato'; end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_allocation_intake_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_ws uuid;
  v_cond uuid;
begin
  if new.document_id is not null then
    select workspace_id, condominium_id
    into v_ws, v_cond
    from public.documents
    where id=new.document_id;

    if v_ws is null then
      raise exception 'Il documento collegato all''acquisizione non esiste';
    end if;

    if v_ws <> new.workspace_id then
      raise exception 'Il documento collegato appartiene a un workspace diverso';
    end if;

    if v_cond is not null and v_cond <> new.condominium_id then
      raise exception 'Il documento collegato appartiene a un condominio diverso';
    end if;
  end if;

  if new.ledger_entry_id is not null and not exists (
    select 1
    from public.condominium_ledger_entries le
    where le.id=new.ledger_entry_id
      and le.workspace_id=new.workspace_id
      and le.condominium_id=new.condominium_id
  ) then
    raise exception 'La spesa contabile collegata non appartiene al condominio/workspace dell''acquisizione';
  end if;

  if new.allocation_table_id is not null and not exists (
    select 1
    from public.condominium_millesimal_tables mt
    where mt.id=new.allocation_table_id
      and mt.workspace_id=new.workspace_id
      and mt.condominium_id=new.condominium_id
  ) then
    raise exception 'La tabella millesimale collegata non appartiene al condominio/workspace dell''acquisizione';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_budget_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid; v_fy_ws uuid; v_fy_cond uuid;
begin
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio indicato non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Budget e condominio devono appartenere allo stesso workspace'; end if;
 if new.fiscal_year_id is not null then
   select workspace_id,condominium_id into v_fy_ws,v_fy_cond from public.condominium_fiscal_years where id=new.fiscal_year_id;
   if v_fy_ws is null then raise exception 'L''esercizio contabile indicato non esiste'; end if;
   if v_fy_ws<>new.workspace_id or v_fy_cond<>new.condominium_id then raise exception 'Budget ed esercizio contabile devono appartenere allo stesso workspace e condominio'; end if;
 end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_consumption_reading_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ws uuid;
  v_archived timestamptz;
begin
  select c.workspace_id,c.archived_at
    into v_ws,v_archived
  from public.condominiums c
  where c.id=new.condominium_id;

  if v_ws is null then
    raise exception 'Condominio della lettura non trovato';
  end if;

  if new.workspace_id<>v_ws then
    raise exception 'Workspace della lettura non coerente con il condominio';
  end if;

  if v_archived is not null then
    raise exception 'Non è possibile modificare consumi di un condominio archiviato';
  end if;

  if not exists (
    select 1 from public.condominium_units u
    where u.id=new.unit_id
      and u.workspace_id=new.workspace_id
      and u.condominium_id=new.condominium_id
  ) then
    raise exception 'Unità non coerente con workspace e condominio della lettura';
  end if;

  if new.fiscal_year_id is not null and not exists (
    select 1 from public.condominium_fiscal_years fy
    where fy.id=new.fiscal_year_id
      and fy.workspace_id=new.workspace_id
      and fy.condominium_id=new.condominium_id
  ) then
    raise exception 'Esercizio contabile non coerente con workspace e condominio della lettura';
  end if;

  if trim(coalesce(new.service_type,''))='' then
    raise exception 'Tipo di servizio obbligatorio';
  end if;

  if trim(coalesce(new.meter_code,''))='' then
    raise exception 'Codice contatore obbligatorio';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_creation_intake_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_doc uuid;
  v_doc_workspace uuid;
  v_doc_condominium uuid;
  v_size bigint;
begin
  if jsonb_typeof(new.source_documents) <> 'array' then
    raise exception 'source_documents deve essere un array';
  end if;

  for v_item in select value from jsonb_array_elements(new.source_documents)
  loop
    v_doc := nullif(v_item->>'document_id','')::uuid;
    if v_doc is not null then
      select d.workspace_id,d.condominium_id,d.file_size_bytes
      into v_doc_workspace,v_doc_condominium,v_size
      from public.documents d where d.id=v_doc;

      if v_doc_workspace is null then
        raise exception 'Documento sorgente non trovato';
      end if;
      if v_doc_workspace <> new.workspace_id then
        raise exception 'Documento sorgente appartenente a workspace diverso';
      end if;
      if v_doc_condominium is not null then
        raise exception 'Il documento sorgente è già associato a un condominio';
      end if;
      if coalesce(v_size,0) > 104857600 then
        raise exception 'Documento sorgente oltre il limite massimo di 100 MB';
      end if;
    end if;
  end loop;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_expense_allocation_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ledger record;
  v_unit record;
  v_table record;
  v_member record;
begin
  select workspace_id, condominium_id, direction
    into v_ledger
  from public.condominium_ledger_entries
  where id = new.ledger_entry_id;

  if not found then
    raise exception 'La spesa collegata alla ripartizione non esiste';
  end if;

  if v_ledger.workspace_id <> new.workspace_id or v_ledger.condominium_id <> new.condominium_id then
    raise exception 'Ripartizione e spesa devono appartenere allo stesso condominio e workspace';
  end if;

  if v_ledger.direction <> 'Uscita' then
    raise exception 'Una ripartizione può essere collegata solo a una spesa di uscita';
  end if;

  select workspace_id, condominium_id
    into v_unit
  from public.condominium_units
  where id = new.unit_id;

  if not found or v_unit.workspace_id <> new.workspace_id or v_unit.condominium_id <> new.condominium_id then
    raise exception 'L''unità della ripartizione deve appartenere allo stesso condominio e workspace';
  end if;

  if new.allocation_table_id is not null then
    select workspace_id, condominium_id
      into v_table
    from public.condominium_millesimal_tables
    where id = new.allocation_table_id;

    if not found or v_table.workspace_id <> new.workspace_id or v_table.condominium_id <> new.condominium_id then
      raise exception 'La tabella millesimale della ripartizione deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  if new.member_id is not null then
    select c.workspace_id, m.condominium_id
      into v_member
    from public.condominium_members m
    join public.condominiums c on c.id = m.condominium_id
    where m.id = new.member_id;

    if not found or v_member.workspace_id <> new.workspace_id or v_member.condominium_id <> new.condominium_id then
      raise exception 'Il condomino della ripartizione deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_expense_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_total numeric;
  v_paid numeric;
  v_status text;
  v_has_installments boolean;
begin
  if new.direction <> 'Uscita' then
    return new;
  end if;

  select coalesce(sum(amount),0),
         coalesce(sum(paid_amount),0),
         count(*) > 0
    into v_total,v_paid,v_has_installments
  from public.condominium_installments
  where ledger_entry_id=new.id
    and workspace_id=new.workspace_id
    and condominium_id=new.condominium_id;

  if not v_has_installments then
    return new;
  end if;

  if v_paid >= v_total - 0.005 and v_total > 0 then
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif exists (
    select 1 from public.condominium_installments
    where ledger_entry_id=new.id
      and workspace_id=new.workspace_id
      and condominium_id=new.condominium_id
      and due_date < current_date
      and paid_amount < amount
  ) then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  new.payment_status := v_status;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_fiscal_year_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_workspace uuid;
begin
  select c.workspace_id into v_workspace
  from public.condominiums c
  where c.id=new.condominium_id;

  if v_workspace is null then
    raise exception 'Il condominio indicato non esiste';
  end if;

  if new.workspace_id<>v_workspace then
    raise exception 'L''esercizio contabile e il condominio devono appartenere allo stesso workspace';
  end if;

  if new.start_date>new.end_date then
    raise exception 'La data iniziale dell''esercizio non può essere successiva alla data finale';
  end if;

  if nullif(btrim(new.name),'') is null then
    raise exception 'Il nome dell''esercizio contabile è obbligatorio';
  end if;

  if new.status not in ('Aperto','Provvisorio','Chiuso') then
    raise exception 'Stato dell''esercizio contabile non valido';
  end if;

  if exists (
    select 1
    from public.condominium_fiscal_years fy
    where fy.condominium_id=new.condominium_id
      and fy.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid)
      and new.start_date<=fy.end_date
      and fy.start_date<=new.end_date
  ) then
    raise exception 'Le date dell''esercizio contabile si sovrappongono a un altro esercizio dello stesso condominio';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_fund_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid;
begin
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio indicato non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Fondo e condominio devono appartenere allo stesso workspace'; end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_installment_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_payment_total numeric;
begin
  select coalesce(sum(amount),0)
    into v_payment_total
  from public.condominium_payment_movements
  where installment_id = new.id
    and workspace_id = new.workspace_id
    and condominium_id = new.condominium_id;

  v_payment_total := round(v_payment_total::numeric,2);

  if abs(coalesce(new.paid_amount,0) - v_payment_total) > 0.005 then
    raise exception 'Il pagato della rata deve corrispondere ai movimenti di pagamento registrati';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Importo della rata non valido';
  end if;

  if v_payment_total >= new.amount - 0.005 then
    new.paid_amount := round(new.amount::numeric,2);
    new.status := 'Pagato';
  elsif v_payment_total > 0 then
    new.paid_amount := v_payment_total;
    new.status := 'Parzialmente pagato';
  elsif new.due_date is not null and new.due_date < current_date then
    new.paid_amount := 0;
    new.status := 'Scaduto';
  else
    new.paid_amount := 0;
    new.status := 'Da pagare';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_installment_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ledger record;
  v_unit record;
  v_year record;
  v_member record;
begin
  if new.ledger_entry_id is not null then
    select workspace_id, condominium_id, direction
      into v_ledger
    from public.condominium_ledger_entries
    where id = new.ledger_entry_id;

    if not found or v_ledger.workspace_id <> new.workspace_id or v_ledger.condominium_id <> new.condominium_id then
      raise exception 'La rata e il movimento contabile devono appartenere allo stesso condominio e workspace';
    end if;

    if v_ledger.direction <> 'Uscita' then
      raise exception 'Una rata contabile può essere collegata solo a una spesa di uscita';
    end if;
  end if;

  if new.unit_id is not null then
    select workspace_id, condominium_id
      into v_unit
    from public.condominium_units
    where id = new.unit_id;

    if not found or v_unit.workspace_id <> new.workspace_id or v_unit.condominium_id <> new.condominium_id then
      raise exception 'L''unità della rata deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  if new.fiscal_year_id is not null then
    select workspace_id, condominium_id
      into v_year
    from public.condominium_fiscal_years
    where id = new.fiscal_year_id;

    if not found or v_year.workspace_id <> new.workspace_id or v_year.condominium_id <> new.condominium_id then
      raise exception 'L''esercizio della rata deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  if new.member_id is not null then
    select c.workspace_id, m.condominium_id
      into v_member
    from public.condominium_members m
    join public.condominiums c on c.id = m.condominium_id
    where m.id = new.member_id;

    if not found or v_member.workspace_id <> new.workspace_id or v_member.condominium_id <> new.condominium_id then
      raise exception 'Il condomino della rata deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_installment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ledger_amount numeric;
  v_total numeric;
begin
  if new.ledger_entry_id is null then
    return new;
  end if;

  select le.amount
    into v_ledger_amount
  from public.condominium_ledger_entries le
  where le.id=new.ledger_entry_id
    and le.workspace_id=new.workspace_id
    and le.condominium_id=new.condominium_id
    and le.direction='Uscita'
  for update;

  if not found or v_ledger_amount is null or v_ledger_amount<=0 then
    raise exception 'Movimento contabile della rata non valido';
  end if;

  select coalesce(sum(i.amount),0)
    into v_total
  from public.condominium_installments i
  where i.ledger_entry_id=new.ledger_entry_id
    and i.workspace_id=new.workspace_id
    and i.condominium_id=new.condominium_id
    and i.id is distinct from new.id;

  if round(v_total + new.amount,2) > round(v_ledger_amount,2) + 0.005 then
    raise exception 'Il totale delle rate supera l''importo della spesa';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_ledger_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ws uuid;
  v_cond uuid;
  v_ref_ws uuid;
  v_ref_cond uuid;
begin
  if new.fiscal_year_id is not null then
    select workspace_id, condominium_id into v_ws, v_cond
    from public.condominium_fiscal_years where id=new.fiscal_year_id;
    if not found then
      raise exception 'L''esercizio contabile indicato non esiste';
    end if;
    if v_ws <> new.workspace_id or v_cond <> new.condominium_id then
      raise exception 'Il movimento e l''esercizio contabile devono appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.unit_id is not null then
    select workspace_id, condominium_id into v_ref_ws, v_ref_cond
    from public.condominium_units where id=new.unit_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond <> new.condominium_id then
      raise exception 'L''unità collegata al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.member_id is not null then
    select c.workspace_id, m.condominium_id into v_ref_ws, v_ref_cond
    from public.condominium_members m
    join public.condominiums c on c.id=m.condominium_id
    where m.id=new.member_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond <> new.condominium_id then
      raise exception 'Il condòmino collegato al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.supplier_id is not null then
    select workspace_id, condominium_id into v_ref_ws, v_ref_cond
    from public.suppliers where id=new.supplier_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond is distinct from new.condominium_id then
      raise exception 'Il fornitore collegato al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.document_id is not null then
    select workspace_id, condominium_id into v_ref_ws, v_ref_cond
    from public.documents where id=new.document_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond is distinct from new.condominium_id then
      raise exception 'Il documento collegato al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  return new;
end
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_millesimal_table_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_workspace_id uuid;
begin
  select workspace_id
    into v_workspace_id
  from public.condominiums
  where id=new.condominium_id;

  if not found then
    raise exception 'Condominio non trovato';
  end if;

  if new.workspace_id <> v_workspace_id then
    raise exception 'La tabella millesimale deve appartenere allo stesso workspace del condominio';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_millesimal_value_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_table_condo uuid;
  v_table_workspace uuid;
  v_unit_condo uuid;
  v_unit_workspace uuid;
begin
  select condominium_id, workspace_id
    into v_table_condo, v_table_workspace
  from public.condominium_millesimal_tables
  where id=new.table_id;

  if not found then
    raise exception 'Tabella millesimale non trovata';
  end if;

  select condominium_id, workspace_id
    into v_unit_condo, v_unit_workspace
  from public.condominium_units
  where id=new.unit_id;

  if not found then
    raise exception 'Unità immobiliare non trovata';
  end if;

  if new.condominium_id <> v_table_condo
     or new.condominium_id <> v_unit_condo
     or new.workspace_id <> v_table_workspace
     or new.workspace_id <> v_unit_workspace then
    raise exception 'Tabella millesimale e unità devono appartenere allo stesso condominio e workspace';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_payment_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid; v_cond uuid;
begin
  select workspace_id, condominium_id into v_ws, v_cond
  from public.condominium_installments where id=new.installment_id;
  if not found then raise exception 'La rata associata al pagamento non esiste'; end if;
  if v_ws <> new.workspace_id or v_cond <> new.condominium_id then
    raise exception 'Il pagamento e la rata devono appartenere allo stesso workspace e condominio';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_request_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
 v_ws uuid;
 v_member_cond uuid;
 v_member_user uuid;
 v_member_active boolean;
begin
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio della richiesta non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Richiesta e condominio devono appartenere allo stesso workspace'; end if;

 if new.member_id is not null then
   select condominium_id,user_id,active
   into v_member_cond,v_member_user,v_member_active
   from public.condominium_members
   where id=new.member_id;

   if v_member_cond is null then raise exception 'Il condòmino della richiesta non esiste'; end if;
   if v_member_cond<>new.condominium_id then raise exception 'Il condòmino e la richiesta devono appartenere allo stesso condominio'; end if;
   if not coalesce(v_member_active,false) then raise exception 'Il condòmino indicato non è attivo'; end if;

   if new.requester_user_id is not null and v_member_user is not null and new.requester_user_id<>v_member_user then
     raise exception 'L''utente richiedente non corrisponde al condòmino indicato';
   end if;
 end if;

 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_op <> 'UPDATE' or new.status = old.status then
    return new;
  end if;

  if old.status in ('Chiusa','Annullata') then
    raise exception 'Una richiesta chiusa o annullata non può essere riaperta';
  end if;

  if not (
    (old.status='Nuova' and new.status in ('In lavorazione','Annullata'))
    or
    (old.status='In lavorazione' and new.status in ('In attesa','Risolta','Annullata'))
    or
    (old.status='In attesa' and new.status in ('In lavorazione','Risolta','Annullata'))
    or
    (old.status='Risolta' and new.status in ('In lavorazione','Chiusa'))
  ) then
    raise exception 'Transizione stato richiesta non consentita: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_document_ai_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  old_ai text := nullif(btrim(coalesce(old.data->>'aiStatus','Non elaborato')),'');
  new_ai text := nullif(btrim(coalesce(new.data->>'aiStatus','Non elaborato')),'');
begin
  if old_ai is null then old_ai := 'Non elaborato'; end if;
  if new_ai is null then new_ai := 'Non elaborato'; end if;

  if old_ai <> new_ai and not (
    (old_ai='Non elaborato' and new_ai='In elaborazione') or
    (old_ai='Errore' and new_ai='In elaborazione') or
    (old_ai='In elaborazione' and new_ai in ('Elaborato','Errore')) or
    (old_ai='Elaborato' and new_ai in ('Confermato','In elaborazione','Errore')) or
    (old_ai='Confermato' and new_ai='In elaborazione')
  ) then
    raise exception 'Transizione AI documento non consentita: % -> %', old_ai, new_ai;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_document_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_publication text;
  v_ai_status text;
begin
  if new.status is not null and new.status not in ('Privato','Condiviso') then
    raise exception 'Stato documento non valido: %', new.status;
  end if;

  v_publication := nullif(btrim(new.data->>'publication'),'');
  if v_publication is not null and new.status is not null and v_publication <> new.status then
    raise exception 'Publication e status del documento devono coincidere';
  end if;

  v_ai_status := nullif(btrim(new.data->>'aiStatus'),'');
  if v_ai_status is not null and v_ai_status not in ('Non elaborato','In elaborazione','Elaborato','Confermato','Errore') then
    raise exception 'Stato AI del documento non valido: %', v_ai_status;
  end if;

  if coalesce(new.file_size_bytes,0) > 104857600
     and coalesce(v_ai_status,'Non elaborato') <> 'Errore' then
    raise exception 'Il documento supera il limite massimo di 100 MB e non può essere elaborato';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_document_upload_size(p_size_bytes bigint, p_warning_bytes bigint DEFAULT 52428800, p_max_bytes bigint DEFAULT 104857600)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if p_size_bytes is null or p_size_bytes < 0 then
    raise exception 'Dimensione file non valida';
  end if;
  if p_warning_bytes is null or p_warning_bytes <= 0 then
    raise exception 'Soglia di avviso non valida';
  end if;
  if p_max_bytes is null or p_max_bytes <= p_warning_bytes then
    raise exception 'Soglia massima non valida';
  end if;

  if p_size_bytes > p_max_bytes then
    return jsonb_build_object(
      'status','rejected',
      'size_bytes',p_size_bytes,
      'warning_bytes',p_warning_bytes,
      'max_bytes',p_max_bytes,
      'warning',true,
      'message','Il file supera la dimensione massima consentita.'
    );
  elsif p_size_bytes > p_warning_bytes then
    return jsonb_build_object(
      'status','warning',
      'size_bytes',p_size_bytes,
      'warning_bytes',p_warning_bytes,
      'max_bytes',p_max_bytes,
      'warning',true,
      'message','Il file è molto grande e potrebbe richiedere più tempo e risorse per archiviazione o elaborazione AI.'
    );
  end if;

  return jsonb_build_object(
    'status','ok',
    'size_bytes',p_size_bytes,
    'warning_bytes',p_warning_bytes,
    'max_bytes',p_max_bytes,
    'warning',false,
    'message','Dimensione file compatibile.'
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_fiscal_carryover_compensation_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_c public.condominium_fiscal_carryovers%rowtype;
 v_i public.condominium_installments%rowtype;
begin
 select * into v_c from public.condominium_fiscal_carryovers where id=new.carryover_id for share;
 if not found then raise exception 'Riporto da compensare non trovato'; end if;
 if v_c.workspace_id<>new.workspace_id then raise exception 'La compensazione non appartiene al workspace del riporto'; end if;
 if v_c.condominium_id<>new.condominium_id then raise exception 'La compensazione non appartiene al condominio del riporto'; end if;

 if new.target_installment_id is not null then
   select * into v_i from public.condominium_installments where id=new.target_installment_id for share;
   if not found then raise exception 'Rata destinataria della compensazione non trovata'; end if;
   if v_i.workspace_id<>v_c.workspace_id or v_i.condominium_id<>v_c.condominium_id or v_i.fiscal_year_id<>v_c.target_fiscal_year_id then
     raise exception 'La rata destinataria non è coerente con il riporto';
   end if;
   if v_c.kind<>'Credito' then raise exception 'Solo un credito può essere compensato su una rata dell''esercizio successivo'; end if;
   if v_c.unit_id is null then
     if v_i.unit_id is not null or v_i.member_id is distinct from v_c.member_id then
       raise exception 'La rata destinataria non è coerente con il proprietario del riporto';
     end if;
   else
     if v_i.unit_id is distinct from v_c.unit_id then
       raise exception 'La rata destinataria non è coerente con l''unità del riporto';
     end if;
     if v_i.member_id is distinct from v_c.member_id then
       raise exception 'La rata destinataria deve appartenere allo stesso proprietario della partita riportata';
     end if;
   end if;
 end if;

 if v_c.status='Compensato' then raise exception 'Il riporto è già completamente compensato'; end if;
 if new.amount<=0 then raise exception 'L''importo della compensazione deve essere positivo'; end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_fiscal_carryover_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_source public.condominium_fiscal_years%rowtype; v_target public.condominium_fiscal_years%rowtype; v_unit public.condominium_units%rowtype; v_member public.condominium_members%rowtype;
begin
 select * into v_source from public.condominium_fiscal_years where id=new.source_fiscal_year_id for share;
 if not found then raise exception 'Esercizio di origine del riporto non trovato'; end if;
 select * into v_target from public.condominium_fiscal_years where id=new.target_fiscal_year_id for share;
 if not found then raise exception 'Esercizio di destinazione del riporto non trovato'; end if;
 if v_source.workspace_id<>new.workspace_id or v_target.workspace_id<>new.workspace_id or v_source.condominium_id<>new.condominium_id or v_target.condominium_id<>new.condominium_id then
   raise exception 'Il riporto deve appartenere allo stesso workspace e condominio dei due esercizi';
 end if;
 if v_source.status<>'Chiuso' then raise exception 'Il riporto può provenire solo da un esercizio chiuso'; end if;
 if v_target.id=v_source.id or v_target.start_date<=v_source.end_date then raise exception 'L''esercizio di destinazione del riporto non è successivo all''origine'; end if;

 if new.unit_id is not null then
   select * into v_unit from public.condominium_units where id=new.unit_id for share;
   if not found then raise exception 'Unità del riporto non trovata'; end if;
   if v_unit.workspace_id<>new.workspace_id or v_unit.condominium_id<>new.condominium_id then
     raise exception 'L''unità del riporto non appartiene al condominio indicato';
   end if;
 elsif new.member_id is null then
   raise exception 'Un riporto senza unità deve identificare il proprietario';
 end if;

 if new.member_id is not null then
   select * into v_member from public.condominium_members where id=new.member_id for share;
   if not found then raise exception 'Proprietario del riporto non trovato'; end if;
   if v_member.condominium_id<>new.condominium_id then raise exception 'Il proprietario del riporto non appartiene al condominio indicato'; end if;
   if new.unit_id is not null and v_member.unit_id is not null and v_member.unit_id<>new.unit_id then
     raise exception 'Il proprietario del riporto non è associato all''unità indicata';
   end if;
 end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_ledger_entry_deliberation_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_workspace_condominium_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid;
begin
 if new.condominium_id is null then return new; end if;
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio indicato non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Record e condominio devono appartenere allo stesso workspace'; end if;
 return new;
end $function$
;

-- Reproduce production execute ACL for restored functions.
revoke execute on function admin_approve_portal_registration(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function admin_approve_portal_registration(uuid,uuid) to authenticated;
revoke execute on function apply_resend_communication_event(text,text,text,text,timestamp with time zone) from public, anon, authenticated, service_role;
grant execute on function apply_resend_communication_event(text,text,text,text,timestamp with time zone) to service_role;
revoke execute on function archive_condominium(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function archive_condominium(uuid,uuid,text) to authenticated;
grant execute on function archive_condominium(uuid,uuid,text) to service_role;
revoke execute on function assign_condominium_member_legacy_id() from public, anon, authenticated, service_role;
revoke execute on function audit_condominium_work_change() from public, anon, authenticated, service_role;
grant execute on function audit_condominium_work_change() to service_role;
revoke execute on function audit_condominium_work_progress_change() from public, anon, authenticated, service_role;
grant execute on function audit_condominium_work_progress_change() to service_role;
revoke execute on function audit_document_ai_change() from public, anon, authenticated, service_role;
grant execute on function audit_document_ai_change() to service_role;
revoke execute on function claim_first_workspace_admin(uuid) from public, anon, authenticated, service_role;
grant execute on function claim_first_workspace_admin(uuid) to authenticated;
grant execute on function claim_first_workspace_admin(uuid) to service_role;
revoke execute on function clean_deleted_member_owner_references() from public, anon, authenticated, service_role;
revoke execute on function clear_condominium_member_unit_legacy_fields() from public, anon, authenticated, service_role;
grant execute on function clear_condominium_member_unit_legacy_fields() to service_role;
revoke execute on function close_condominium_fiscal_year(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function close_condominium_fiscal_year(uuid,uuid) to authenticated;
grant execute on function close_condominium_fiscal_year(uuid,uuid) to service_role;
revoke execute on function close_condominium_member_transfer(uuid) from public, anon, authenticated, service_role;
grant execute on function close_condominium_member_transfer(uuid) to authenticated;
grant execute on function close_condominium_member_transfer(uuid) to service_role;
revoke execute on function close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid) to authenticated;
grant execute on function close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid) to service_role;
revoke execute on function compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) from public, anon, authenticated, service_role;
grant execute on function compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) to authenticated;
grant execute on function compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) to service_role;
revoke execute on function complete_portal_registration(text,text,text) from public, anon, authenticated, service_role;
grant execute on function complete_portal_registration(text,text,text) to authenticated;
grant execute on function complete_portal_registration(text,text,text) to service_role;
revoke execute on function confirm_allocation_intake(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function confirm_allocation_intake(uuid,uuid) to authenticated;
grant execute on function confirm_allocation_intake(uuid,uuid) to service_role;
revoke execute on function confirm_condominium_creation_intake(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function confirm_condominium_creation_intake(uuid,uuid) to authenticated;
grant execute on function confirm_condominium_creation_intake(uuid,uuid) to service_role;
revoke execute on function confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) to authenticated;
grant execute on function confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) to service_role;
revoke execute on function delete_condominium(uuid,bigint,text) from public, anon, authenticated, service_role;
grant execute on function delete_condominium(uuid,bigint,text) to authenticated;
grant execute on function delete_condominium(uuid,bigint,text) to service_role;
revoke execute on function ensure_table_millesimal_values() from public, anon, authenticated, service_role;
grant execute on function ensure_table_millesimal_values() to service_role;
revoke execute on function ensure_unit_millesimal_values() from public, anon, authenticated, service_role;
grant execute on function ensure_unit_millesimal_values() to service_role;
revoke execute on function generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) from public, anon, authenticated, service_role;
grant execute on function generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) to authenticated;
grant execute on function generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) to service_role;
revoke execute on function generate_consumption_allocations(uuid,uuid,uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function generate_consumption_allocations(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function generate_consumption_allocations(uuid,uuid,uuid,uuid,text) to service_role;
revoke execute on function generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) to service_role;
revoke execute on function generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) from public, anon, authenticated, service_role;
grant execute on function generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) to authenticated;
grant execute on function generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) to service_role;
revoke execute on function generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid) from public, anon, authenticated, service_role;
grant execute on function generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid) to authenticated;
grant execute on function generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid) to service_role;
revoke execute on function get_member_transfer_accounting_snapshot(uuid) from public, anon, authenticated, service_role;
grant execute on function get_member_transfer_accounting_snapshot(uuid) to authenticated;
grant execute on function get_member_transfer_accounting_snapshot(uuid) to service_role;
revoke execute on function guard_condominium_expense_allocation_total() from public, anon, authenticated, service_role;
grant execute on function guard_condominium_expense_allocation_total() to service_role;
revoke execute on function guard_confirmed_unit_transformation_immutable() from public, anon, authenticated, service_role;
grant execute on function guard_confirmed_unit_transformation_immutable() to anon;
grant execute on function guard_confirmed_unit_transformation_immutable() to authenticated;
grant execute on function guard_confirmed_unit_transformation_immutable() to service_role;
revoke execute on function guard_confirmed_unit_transformation_items_immutable() from public, anon, authenticated, service_role;
grant execute on function guard_confirmed_unit_transformation_items_immutable() to anon;
grant execute on function guard_confirmed_unit_transformation_items_immutable() to authenticated;
grant execute on function guard_confirmed_unit_transformation_items_immutable() to service_role;
revoke execute on function guard_consumption_reading_integrity() from public, anon, authenticated, service_role;
grant execute on function guard_consumption_reading_integrity() to service_role;
revoke execute on function guard_expense_allocation_integrity() from public, anon, authenticated, service_role;
grant execute on function guard_expense_allocation_integrity() to service_role;
revoke execute on function guard_fiscal_carryover_compensation_total() from public, anon, authenticated, service_role;
grant execute on function guard_fiscal_carryover_compensation_total() to service_role;
revoke execute on function guard_fiscal_year_opening_balance() from public, anon, authenticated, service_role;
grant execute on function guard_fiscal_year_opening_balance() to service_role;
revoke execute on function guard_fund_integrity() from public, anon, authenticated, service_role;
grant execute on function guard_fund_integrity() to service_role;
revoke execute on function guard_installment_paid_amount_update() from public, anon, authenticated, service_role;
grant execute on function guard_installment_paid_amount_update() to authenticated;
grant execute on function guard_installment_paid_amount_update() to service_role;
revoke execute on function guard_installment_parent_delete() from public, anon, authenticated, service_role;
grant execute on function guard_installment_parent_delete() to service_role;
revoke execute on function guard_ledger_entry_integrity() from public, anon, authenticated, service_role;
grant execute on function guard_ledger_entry_integrity() to authenticated;
grant execute on function guard_ledger_entry_integrity() to service_role;
revoke execute on function guard_ledger_parent_delete() from public, anon, authenticated, service_role;
grant execute on function guard_ledger_parent_delete() to authenticated;
grant execute on function guard_ledger_parent_delete() to service_role;
revoke execute on function guard_millesimal_table_integrity() from public, anon, authenticated, service_role;
grant execute on function guard_millesimal_table_integrity() to authenticated;
grant execute on function guard_millesimal_table_integrity() to service_role;
revoke execute on function guard_millesimal_table_parent_delete() from public, anon, authenticated, service_role;
grant execute on function guard_millesimal_table_parent_delete() to authenticated;
grant execute on function guard_millesimal_table_parent_delete() to service_role;
revoke execute on function guard_millesimal_value_integrity() from public, anon, authenticated, service_role;
grant execute on function guard_millesimal_value_integrity() to authenticated;
grant execute on function guard_millesimal_value_integrity() to service_role;
revoke execute on function guard_unit_scope_changes() from public, anon, authenticated, service_role;
grant execute on function guard_unit_scope_changes() to service_role;
revoke execute on function list_archived_condominiums(uuid) from public, anon, authenticated, service_role;
grant execute on function list_archived_condominiums(uuid) to authenticated;
grant execute on function list_archived_condominiums(uuid) to service_role;
revoke execute on function normalize_condominium_member_contact() from public, anon, authenticated, service_role;
grant execute on function normalize_condominium_member_contact() to service_role;
revoke execute on function normalize_condominium_member_names() from public, anon, authenticated, service_role;
grant execute on function normalize_condominium_member_names() to service_role;
revoke execute on function prepare_communication_recipients(uuid) from public, anon, authenticated, service_role;
grant execute on function prepare_communication_recipients(uuid) to authenticated;
grant execute on function prepare_communication_recipients(uuid) to service_role;
revoke execute on function prevent_archived_condominium_mutation() from public, anon, authenticated, service_role;
grant execute on function prevent_archived_condominium_mutation() to service_role;
revoke execute on function prevent_closed_condominium_accounting() from public, anon, authenticated, service_role;
grant execute on function prevent_closed_condominium_accounting() to service_role;
revoke execute on function prevent_closed_fiscal_year_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_closed_fiscal_year_delete() to anon;
grant execute on function prevent_closed_fiscal_year_delete() to authenticated;
grant execute on function prevent_closed_fiscal_year_delete() to service_role;
revoke execute on function prevent_closed_fiscal_year_payment_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_closed_fiscal_year_payment_delete() to anon;
grant execute on function prevent_closed_fiscal_year_payment_delete() to authenticated;
grant execute on function prevent_closed_fiscal_year_payment_delete() to service_role;
revoke execute on function prevent_closed_fiscal_year_record_mutation() from public, anon, authenticated, service_role;
grant execute on function prevent_closed_fiscal_year_record_mutation() to authenticated;
grant execute on function prevent_closed_fiscal_year_record_mutation() to service_role;
revoke execute on function prevent_closed_fiscal_year_reopen() from public, anon, authenticated, service_role;
grant execute on function prevent_closed_fiscal_year_reopen() to service_role;
revoke execute on function prevent_closed_fiscal_year_update() from public, anon, authenticated, service_role;
grant execute on function prevent_closed_fiscal_year_update() to anon;
grant execute on function prevent_closed_fiscal_year_update() to authenticated;
grant execute on function prevent_closed_fiscal_year_update() to service_role;
revoke execute on function prevent_condominium_unit_delete_with_financial_data() from public, anon, authenticated, service_role;
grant execute on function prevent_condominium_unit_delete_with_financial_data() to anon;
grant execute on function prevent_condominium_unit_delete_with_financial_data() to authenticated;
grant execute on function prevent_condominium_unit_delete_with_financial_data() to service_role;
revoke execute on function prevent_condominium_unit_delete_with_members() from public, anon, authenticated, service_role;
grant execute on function prevent_condominium_unit_delete_with_members() to anon;
grant execute on function prevent_condominium_unit_delete_with_members() to authenticated;
grant execute on function prevent_condominium_unit_delete_with_members() to service_role;
revoke execute on function prevent_financial_unit_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_financial_unit_delete() to anon;
grant execute on function prevent_financial_unit_delete() to authenticated;
grant execute on function prevent_financial_unit_delete() to service_role;
revoke execute on function prevent_fiscal_year_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_fiscal_year_delete() to service_role;
revoke execute on function prevent_member_delete_with_financial_history() from public, anon, authenticated, service_role;
grant execute on function prevent_member_delete_with_financial_history() to authenticated;
grant execute on function prevent_member_delete_with_financial_history() to service_role;
revoke execute on function prevent_member_unit_reassignment_with_financial_history() from public, anon, authenticated, service_role;
grant execute on function prevent_member_unit_reassignment_with_financial_history() to authenticated;
grant execute on function prevent_member_unit_reassignment_with_financial_history() to service_role;
revoke execute on function prevent_paid_allocation_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_paid_allocation_delete() to anon;
grant execute on function prevent_paid_allocation_delete() to authenticated;
grant execute on function prevent_paid_allocation_delete() to service_role;
revoke execute on function prevent_paid_installment_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_paid_installment_delete() to anon;
grant execute on function prevent_paid_installment_delete() to authenticated;
grant execute on function prevent_paid_installment_delete() to service_role;
revoke execute on function prevent_payment_core_mutation() from public, anon, authenticated, service_role;
grant execute on function prevent_payment_core_mutation() to authenticated;
grant execute on function prevent_payment_core_mutation() to service_role;
revoke execute on function prevent_profile_privilege_self_change() from public, anon, authenticated, service_role;
grant execute on function prevent_profile_privilege_self_change() to authenticated;
grant execute on function prevent_profile_privilege_self_change() to service_role;
revoke execute on function prevent_unsafe_condominium_unit_delete() from public, anon, authenticated, service_role;
grant execute on function prevent_unsafe_condominium_unit_delete() to service_role;
revoke execute on function preview_condominium_member_transfer(uuid,uuid,date) from public, anon, authenticated, service_role;
grant execute on function preview_condominium_member_transfer(uuid,uuid,date) to authenticated;
grant execute on function preview_condominium_member_transfer(uuid,uuid,date) to service_role;
revoke execute on function preview_condominium_unit_transformation(uuid,text,uuid[]) from public, anon, authenticated, service_role;
grant execute on function preview_condominium_unit_transformation(uuid,text,uuid[]) to authenticated;
grant execute on function preview_condominium_unit_transformation(uuid,text,uuid[]) to service_role;
revoke execute on function register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) from public, anon, authenticated, service_role;
grant execute on function register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) to authenticated;
grant execute on function register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) to service_role;
revoke execute on function require_confirmed_genealogy_for_unit_lifecycle() from public, anon, authenticated, service_role;
revoke execute on function require_trusted_unit_transformation_confirmation() from public, anon, authenticated, service_role;
revoke execute on function reset_stale_communication_recipients(uuid,interval) from public, anon, authenticated, service_role;
grant execute on function reset_stale_communication_recipients(uuid,interval) to authenticated;
grant execute on function reset_stale_communication_recipients(uuid,interval) to service_role;
revoke execute on function restore_condominium(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function restore_condominium(uuid,uuid) to authenticated;
grant execute on function restore_condominium(uuid,uuid) to service_role;
revoke execute on function reverse_condominium_installment_payment(uuid,uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function reverse_condominium_installment_payment(uuid,uuid,uuid,text) to authenticated;
grant execute on function reverse_condominium_installment_payment(uuid,uuid,uuid,text) to service_role;
revoke execute on function save_condominium(uuid,bigint,text,text,text,text,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function save_condominium(uuid,bigint,text,text,text,text,text,jsonb) to authenticated;
grant execute on function save_condominium(uuid,bigint,text,text,text,text,text,jsonb) to service_role;
revoke execute on function set_personal_security_code(text,boolean) from public, anon, authenticated, service_role;
grant execute on function set_personal_security_code(text,boolean) to authenticated;
grant execute on function set_personal_security_code(text,boolean) to service_role;
revoke execute on function sync_condominium_expense_payment_status() from public, anon, authenticated, service_role;
grant execute on function sync_condominium_expense_payment_status() to service_role;
revoke execute on function sync_condominium_fund_usage() from public, anon, authenticated, service_role;
grant execute on function sync_condominium_fund_usage() to service_role;
revoke execute on function sync_condominium_installment_from_payments() from public, anon, authenticated, service_role;
grant execute on function sync_condominium_installment_from_payments() to service_role;
revoke execute on function sync_condominium_member_unit_legacy_fields() from public, anon, authenticated, service_role;
grant execute on function sync_condominium_member_unit_legacy_fields() to service_role;
revoke execute on function sync_condominium_work_financial_summary_trigger() from public, anon, authenticated, service_role;
grant execute on function sync_condominium_work_financial_summary_trigger() to service_role;
revoke execute on function sync_condominium_work_financial_summary(uuid) from public, anon, authenticated, service_role;
grant execute on function sync_condominium_work_financial_summary(uuid) to service_role;
revoke execute on function touch_documents_updated_at() from public, anon, authenticated, service_role;
grant execute on function touch_documents_updated_at() to anon;
grant execute on function touch_documents_updated_at() to authenticated;
grant execute on function touch_documents_updated_at() to service_role;
revoke execute on function validate_allocation_rule_scope() from public, anon, authenticated, service_role;
grant execute on function validate_allocation_rule_scope() to service_role;
revoke execute on function validate_audit_scope() from public, anon, authenticated, service_role;
grant execute on function validate_audit_scope() to service_role;
revoke execute on function validate_communication_recipient_scope() from public, anon, authenticated, service_role;
grant execute on function validate_communication_recipient_scope() to anon;
grant execute on function validate_communication_recipient_scope() to authenticated;
grant execute on function validate_communication_recipient_scope() to service_role;
revoke execute on function validate_communication_scope() from public, anon, authenticated, service_role;
grant execute on function validate_communication_scope() to service_role;
revoke execute on function validate_condominium_allocation_intake_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_allocation_intake_scope() to anon;
grant execute on function validate_condominium_allocation_intake_scope() to authenticated;
grant execute on function validate_condominium_allocation_intake_scope() to service_role;
revoke execute on function validate_condominium_budget_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_budget_scope() to service_role;
revoke execute on function validate_condominium_consumption_reading_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_consumption_reading_scope() to anon;
grant execute on function validate_condominium_consumption_reading_scope() to authenticated;
grant execute on function validate_condominium_consumption_reading_scope() to service_role;
revoke execute on function validate_condominium_creation_intake_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_creation_intake_scope() to service_role;
revoke execute on function validate_condominium_expense_allocation_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_expense_allocation_scope() to service_role;
revoke execute on function validate_condominium_expense_payment_status() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_expense_payment_status() to service_role;
revoke execute on function validate_condominium_fiscal_year_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_fiscal_year_scope() to service_role;
revoke execute on function validate_condominium_fund_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_fund_scope() to service_role;
revoke execute on function validate_condominium_installment_paid_amount() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_installment_paid_amount() to service_role;
revoke execute on function validate_condominium_installment_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_installment_scope() to service_role;
revoke execute on function validate_condominium_installment_total() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_installment_total() to service_role;
revoke execute on function validate_condominium_ledger_fund_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_ledger_fund_scope() to anon;
grant execute on function validate_condominium_ledger_fund_scope() to authenticated;
grant execute on function validate_condominium_ledger_fund_scope() to service_role;
revoke execute on function validate_condominium_ledger_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_ledger_scope() to service_role;
revoke execute on function validate_condominium_legal_case_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_legal_case_scope() to service_role;
revoke execute on function validate_condominium_member_unit_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_member_unit_scope() to service_role;
revoke execute on function validate_condominium_millesimal_table_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_millesimal_table_scope() to anon;
grant execute on function validate_condominium_millesimal_table_scope() to authenticated;
grant execute on function validate_condominium_millesimal_table_scope() to service_role;
revoke execute on function validate_condominium_millesimal_value_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_millesimal_value_scope() to anon;
grant execute on function validate_condominium_millesimal_value_scope() to authenticated;
grant execute on function validate_condominium_millesimal_value_scope() to service_role;
revoke execute on function validate_condominium_payment_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_payment_scope() to service_role;
revoke execute on function validate_condominium_request_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_request_scope() to service_role;
revoke execute on function validate_condominium_request_status() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_request_status() to anon;
grant execute on function validate_condominium_request_status() to authenticated;
grant execute on function validate_condominium_request_status() to service_role;
revoke execute on function validate_condominium_tax_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_tax_scope() to service_role;
revoke execute on function validate_condominium_unit_relationship() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_unit_relationship() to service_role;
revoke execute on function validate_condominium_unit_workspace_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_unit_workspace_scope() to anon;
grant execute on function validate_condominium_unit_workspace_scope() to authenticated;
grant execute on function validate_condominium_unit_workspace_scope() to service_role;
revoke execute on function validate_condominium_work_child_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_work_child_scope() to service_role;
revoke execute on function validate_condominium_work_financial_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_work_financial_scope() to anon;
grant execute on function validate_condominium_work_financial_scope() to authenticated;
grant execute on function validate_condominium_work_financial_scope() to service_role;
revoke execute on function validate_condominium_work_progress_accounting_links() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_work_progress_accounting_links() to service_role;
revoke execute on function validate_condominium_work_reference_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_work_reference_scope() to anon;
grant execute on function validate_condominium_work_reference_scope() to authenticated;
grant execute on function validate_condominium_work_reference_scope() to service_role;
revoke execute on function validate_condominium_work_scope() from public, anon, authenticated, service_role;
grant execute on function validate_condominium_work_scope() to anon;
grant execute on function validate_condominium_work_scope() to authenticated;
grant execute on function validate_condominium_work_scope() to service_role;
revoke execute on function validate_confirmed_unit_transformation_genealogy() from public, anon, authenticated, service_role;
revoke execute on function validate_document_ai_transition() from public, anon, authenticated, service_role;
grant execute on function validate_document_ai_transition() to anon;
grant execute on function validate_document_ai_transition() to authenticated;
grant execute on function validate_document_ai_transition() to service_role;
revoke execute on function validate_document_metadata() from public, anon, authenticated, service_role;
grant execute on function validate_document_metadata() to anon;
grant execute on function validate_document_metadata() to authenticated;
grant execute on function validate_document_metadata() to service_role;
revoke execute on function validate_document_upload_size(bigint,bigint,bigint) from public, anon, authenticated, service_role;
grant execute on function validate_document_upload_size(bigint,bigint,bigint) to authenticated;
grant execute on function validate_document_upload_size(bigint,bigint,bigint) to service_role;
revoke execute on function validate_fiscal_carryover_compensation_scope() from public, anon, authenticated, service_role;
grant execute on function validate_fiscal_carryover_compensation_scope() to service_role;
revoke execute on function validate_fiscal_carryover_scope() from public, anon, authenticated, service_role;
grant execute on function validate_fiscal_carryover_scope() to service_role;
revoke execute on function validate_ledger_entry_deliberation_scope() from public, anon, authenticated, service_role;
grant execute on function validate_ledger_entry_deliberation_scope() to authenticated;
grant execute on function validate_ledger_entry_deliberation_scope() to service_role;
revoke execute on function validate_portal_access_scope() from public, anon, authenticated, service_role;
grant execute on function validate_portal_access_scope() to service_role;
revoke execute on function validate_portal_registration_request_scope() from public, anon, authenticated, service_role;
grant execute on function validate_portal_registration_request_scope() to service_role;
revoke execute on function validate_unit_owner_member_refs() from public, anon, authenticated, service_role;
grant execute on function validate_unit_owner_member_refs() to service_role;
revoke execute on function validate_workspace_condominium_scope() from public, anon, authenticated, service_role;
grant execute on function validate_workspace_condominium_scope() to service_role;
revoke execute on function verify_personal_security_code(text) from public, anon, authenticated, service_role;
grant execute on function verify_personal_security_code(text) to authenticated;
grant execute on function verify_personal_security_code(text) to service_role;
