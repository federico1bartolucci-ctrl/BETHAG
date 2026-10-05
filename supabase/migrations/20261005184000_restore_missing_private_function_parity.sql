-- Restore private function parity from production.
-- Definitions are restored verbatim; direct API execution remains revoked.
CREATE OR REPLACE FUNCTION private.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.communication_recipients%rowtype;
  v_status text;
  v_comm uuid;
  v_counts jsonb;
begin
  if nullif(trim(p_provider_message_id),'') is null
     or nullif(trim(p_event_type),'') is null then
    raise exception 'Evento Resend incompleto';
  end if;

  select * into v_row
  from public.communication_recipients
  where provider_message_id=p_provider_message_id
    and (p_email is null or lower(trim(email))=lower(trim(p_email)))
  for update;

  if not found then
    return jsonb_build_object('status','ignored','reason','recipient_not_found');
  end if;

  v_status:=case p_event_type
    when 'email.delivered' then 'delivered'
    when 'email.bounced' then 'failed'
    when 'email.complained' then 'failed'
    when 'email.sent' then case when v_row.status='queued' then 'sent' else v_row.status end
    else v_row.status
  end;

  update public.communication_recipients
  set status=v_status,
      event_type=p_event_type,
      provider_event_id=coalesce(p_event_id,provider_event_id),
      delivered_at=case when p_event_type='email.delivered' then coalesce(p_event_at,now()) else delivered_at end,
      bounced_at=case when p_event_type='email.bounced' then coalesce(p_event_at,now()) else bounced_at end,
      complained_at=case when p_event_type='email.complained' then coalesce(p_event_at,now()) else complained_at end,
      error_message=case
        when p_event_type='email.bounced' then 'email.bounced'
        when p_event_type='email.complained' then 'email.complained'
        else error_message
      end,
      updated_at=now()
  where id=v_row.id
  returning communication_id into v_comm;

  select jsonb_build_object(
    'pending',count(*) filter(where status in ('pending','queued')),
    'sent',count(*) filter(where status='sent'),
    'delivered',count(*) filter(where status='delivered'),
    'failed',count(*) filter(where status='failed')
  ) into v_counts
  from public.communication_recipients
  where communication_id=v_comm;

  update public.communications
  set email_status=case
    when (v_counts->>'pending')::int>0 then 'In elaborazione'
    when (v_counts->>'failed')::int>0
      and ((v_counts->>'sent')::int+(v_counts->>'delivered')::int)>0 then 'Parzialmente inviata'
    when (v_counts->>'failed')::int>0 then 'Errore'
    when (v_counts->>'delivered')::int>0 and (v_counts->>'sent')::int=0 then 'Consegnata'
    when (v_counts->>'sent')::int>0 then 'Inviata'
    else email_status
  end,
  updated_at=now()
  where id=v_comm;

  return jsonb_build_object(
    'status','updated',
    'communication_id',v_comm,
    'counts',v_counts
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_archived_at timestamptz;
  v_archived_by uuid;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = coalesce(archived_at, now()),
      archived_by = case when archived_at is null then auth.uid() else archived_by end,
      archive_reason = case
        when nullif(trim(coalesce(p_reason,'')),'') is null then archive_reason
        else trim(p_reason)
      end,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
  returning archived_at, archived_by, archive_reason
  into v_archived_at, v_archived_by, v_reason;

  if not found then
    raise exception 'Condominio non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'archived',
      'Condominio archiviato',
      jsonb_build_object(
        'archived_at', v_archived_at,
        'archived_by', v_archived_by,
        'reason', v_reason
      )
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_year public.condominium_fiscal_years%rowtype;
begin
  if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id, 'contabilita') then raise exception 'Operazione non autorizzata'; end if;

  select * into v_year
  from public.condominium_fiscal_years
  where id=p_fiscal_year_id and workspace_id=p_workspace_id
  for update;

  if not found then raise exception 'Esercizio contabile non trovato'; end if;
  if v_year.status='Chiuso' then return v_year.id; end if;

  if exists (
    select 1 from public.condominiums c
    where c.id=v_year.condominium_id and c.workspace_id=v_year.workspace_id and c.archived_at is not null
  ) then raise exception 'Non è possibile chiudere un esercizio di un condominio archiviato'; end if;

  if exists (
    select 1 from public.condominium_ledger_entries l
    where l.workspace_id=v_year.workspace_id and l.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id
      and (l.entry_date<v_year.start_date or l.entry_date>v_year.end_date)
  ) then raise exception 'L''esercizio contiene movimenti contabili fuori periodo'; end if;

  if exists (
    select 1 from public.condominium_installments i
    where i.workspace_id=v_year.workspace_id and i.condominium_id=v_year.condominium_id
      and i.fiscal_year_id=v_year.id and i.due_date is not null
      and (i.due_date<v_year.start_date or i.due_date>v_year.end_date)
  ) then raise exception 'L''esercizio contiene rate con scadenza fuori periodo'; end if;

  if exists (
    select 1 from public.condominium_ledger_entries l
    where l.workspace_id=v_year.workspace_id and l.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id and l.direction='Uscita'
      and (
        (select coalesce(sum(i.amount),0) from public.condominium_installments i
         where i.workspace_id=l.workspace_id and i.condominium_id=l.condominium_id
           and i.ledger_entry_id=l.id and i.status<>'Accorpata') > l.amount+0.005
        or
        (select coalesce(sum(i.paid_amount),0) from public.condominium_installments i
         where i.workspace_id=l.workspace_id and i.condominium_id=l.condominium_id
           and i.ledger_entry_id=l.id and i.status<>'Accorpata')
        >
        (select coalesce(sum(pm.amount),0)
         from public.condominium_payment_movements pm
         join public.condominium_installments pi on pi.id=pm.installment_id
         where pi.ledger_entry_id=l.id and pm.workspace_id=l.workspace_id and pm.condominium_id=l.condominium_id)+0.005
      )
  ) then raise exception 'L''esercizio presenta rate o pagamenti non riconciliati'; end if;

  if exists (
    select 1
    from public.condominium_expense_allocations a
    join public.condominium_ledger_entries l on l.id=a.ledger_entry_id
    where a.workspace_id=v_year.workspace_id and a.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id
    group by a.ledger_entry_id,l.amount
    having abs(sum(a.amount)-l.amount)>0.005
  ) then raise exception 'L''esercizio presenta ripartizioni non riconciliate'; end if;

  perform set_config('bethag.allow_fiscal_year_status_update','on',true);

  update public.condominium_fiscal_years
  set status='Chiuso', updated_at=now()
  where id=v_year.id;

  return v_year.id;
end;
$function$
;

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
;

CREATE OR REPLACE FUNCTION private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_c public.condominium_fiscal_carryovers%rowtype;
 v_amount numeric;
 v_remaining numeric;
 v_new_balance numeric;
 v_target public.condominium_installments%rowtype;
 v_target_year public.condominium_fiscal_years%rowtype;
 v_already_applied numeric;
 v_target_residual numeric;
begin
 if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
   raise exception 'Autorizzazione gestione contabilità richiesta';
 end if;

 if exists (
   select 1 from public.condominiums c
   where c.id=p_condominium_id
     and c.workspace_id=p_workspace_id
     and c.archived_at is not null
 ) then
   raise exception 'Il condominio è archiviato e non può essere modificato';
 end if;

 if p_amount is null
    or p_amount::text in ('NaN','Infinity','-Infinity')
    or p_amount<=0 then
   raise exception 'L''importo della compensazione deve essere maggiore di zero';
 end if;

 select * into v_c
 from public.condominium_fiscal_carryovers
 where id=p_carryover_id
   and workspace_id=p_workspace_id
   and condominium_id=p_condominium_id
 for update;

 if not found then raise exception 'Partita riportata non trovata'; end if;
 if v_c.status='Compensato' then raise exception 'La partita riportata è già completamente compensata'; end if;

 v_remaining:=round(abs(v_c.balance::numeric),2);
 v_amount:=round(p_amount::numeric,2);

 if v_remaining<=0.005 then
   raise exception 'La partita riportata non ha più un residuo compensabile';
 end if;

 if v_amount>v_remaining+0.005 then
   raise exception 'La compensazione supera il residuo della partita: residuo %',
     to_char(v_remaining,'FM999999990.00');
 end if;

 if v_c.kind='Debito' and p_target_installment_id is not null then
   raise exception 'Un debito riportato non può essere utilizzato come credito su una rata corrente';
 end if;

 if p_target_installment_id is not null then
   select * into v_target
   from public.condominium_installments
   where id=p_target_installment_id
     and workspace_id=p_workspace_id
     and condominium_id=p_condominium_id
   for update;

   if not found then raise exception 'Rata di destinazione non trovata'; end if;
   if v_c.kind<>'Credito' then
     raise exception 'Solo un credito riportato può essere applicato a una rata corrente';
   end if;

   select * into v_target_year
   from public.condominium_fiscal_years
   where id=v_c.target_fiscal_year_id
     and workspace_id=p_workspace_id
     and condominium_id=p_condominium_id
   for update;

   if not found then raise exception 'Esercizio di destinazione della partita riportata non trovato'; end if;
   if v_target_year.status='Chiuso' then raise exception 'L''esercizio di destinazione è chiuso'; end if;

   if v_target.fiscal_year_id is distinct from v_c.target_fiscal_year_id then
     raise exception 'La rata di destinazione deve appartenere all''esercizio destinatario della partita riportata';
   end if;

   if v_target.unit_id is distinct from v_c.unit_id then
     raise exception 'La rata di destinazione deve appartenere alla stessa unità della partita riportata';
   end if;

   /*
     Se il riporto è proprietario-specifico, anche la rata di destinazione
     deve essere dello stesso proprietario. Se il riporto è a livello unità
     (member_id NULL), può essere applicato soltanto a una rata ugualmente
     a livello unità, evitando di trasferire un credito comune su una
     posizione individuale non equivalente.
   */
   if v_c.member_id is not null and v_target.member_id is distinct from v_c.member_id then
     raise exception 'La rata di destinazione deve appartenere allo stesso proprietario della partita riportata';
   end if;

   if v_c.member_id is null and v_target.member_id is not null then
     raise exception 'Una partita riportata a livello di unità non può essere applicata a una rata proprietario-specifica';
   end if;

   select round(coalesce(sum(amount),0),2)
   into v_already_applied
   from public.condominium_fiscal_carryover_compensations
   where target_installment_id=v_target.id;

   v_target_residual:=round(v_target.amount-v_target.paid_amount-v_already_applied,2);

   if v_target_residual<=0.005 then
     raise exception 'La rata di destinazione non ha più un residuo compensabile';
   end if;

   if v_amount>v_target_residual+0.005 then
     raise exception 'La compensazione supera il residuo effettivo della rata di destinazione: residuo %',
       to_char(v_target_residual,'FM999999990.00');
   end if;
 end if;

 insert into public.condominium_fiscal_carryover_compensations(
   workspace_id,condominium_id,carryover_id,target_installment_id,
   amount,notes,created_by
 )
 values(
   p_workspace_id,p_condominium_id,p_carryover_id,p_target_installment_id,
   v_amount,trim(coalesce(p_notes,'')),v_uid
 );

 if v_c.kind='Debito' then
   v_new_balance:=round(abs(v_c.balance)-v_amount,2);
 else
   v_new_balance:=-round(abs(v_c.balance)-v_amount,2);
 end if;

 if abs(v_new_balance)<=0.005 then
   v_new_balance:=0;
   update public.condominium_fiscal_carryovers
   set balance=0,status='Compensato',updated_at=now()
   where id=v_c.id;
 else
   update public.condominium_fiscal_carryovers
   set balance=v_new_balance,status='Parzialmente compensato',updated_at=now()
   where id=v_c.id;
 end if;

 return v_new_balance;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_workspace_id uuid;
 v_status text;
 v_validation_errors jsonb;
 v_condominium_workspace uuid;
 v_archived_at timestamptz;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;

 select workspace_id,status,validation_errors
 into v_workspace_id,v_status,v_validation_errors
 from public.condominium_creation_intakes
 where id=p_intake_id
 for update;

 if v_workspace_id is null then raise exception 'Importazione condominiale non trovata'; end if;
 if not private.can_manage_workspace_module(v_workspace_id,'condomini') then raise exception 'Autorizzazione gestione condomini richiesta'; end if;
 if v_status <> 'Da verificare' then raise exception 'L''importazione deve essere nello stato Da verificare'; end if;
 if coalesce(jsonb_array_length(v_validation_errors),0) > 0 then
   raise exception 'L''importazione contiene errori di validazione e non può essere confermata';
 end if;

 select workspace_id,archived_at
 into v_condominium_workspace,v_archived_at
 from public.condominiums
 where id=p_condominium_id
 for update;

 if v_condominium_workspace is null then raise exception 'Condominio non trovato'; end if;
 if v_condominium_workspace <> v_workspace_id then raise exception 'Il condominio appartiene a un workspace diverso'; end if;
 if v_archived_at is not null then raise exception 'Non è possibile confermare un condominio archiviato'; end if;

 update public.condominium_creation_intakes
 set status='Confermato',created_condominium_id=p_condominium_id,
     confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id;

 return p_condominium_id;
end;
$function$
;

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

CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ declare v_count_before integer; v_count_after integer; begin if p_due_date is null then raise exception 'Titolo e scadenza sono obbligatori'; end if; select count(*) into v_count_before from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id; perform public.generate_installments_from_allocations_schedule(p_workspace_id,p_condominium_id,p_ledger_entry_id,p_title,array[p_due_date],p_fiscal_year_id,array[100]::numeric[],false); select count(*) into v_count_after from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id; return v_count_after-v_count_before; end; $function$
;

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

CREATE OR REPLACE FUNCTION private.list_archived_condominiums(p_workspace_id uuid)
 RETURNS SETOF condominiums
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  return query
  select c.*
  from public.condominiums c
  where c.workspace_id = p_workspace_id
    and c.archived_at is not null
  order by c.archived_at desc, c.name asc;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.prepare_communication_recipients(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_comm public.communications%rowtype;
  v_count int;
  v_retry_count int;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select * into v_comm
  from public.communications
  where id=p_communication_id
  for update;

  if not found then
    raise exception 'Comunicazione non trovata';
  end if;

  if not private.can_manage_workspace_module(v_comm.workspace_id,'comunicazioni') then
    raise exception 'Autorizzazione gestione Comunicazioni richiesta';
  end if;

  if v_comm.condominium_id is null then
    raise exception 'La comunicazione deve essere associata a un condominio per l''invio email';
  end if;

  if exists(
    select 1 from public.condominiums c
    where c.id=v_comm.condominium_id and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato';
  end if;

  update public.communication_recipients
  set status='pending',
      provider_message_id=null,
      provider_event_id=null,
      sent_at=null,
      delivered_at=null,
      bounced_at=null,
      complained_at=null,
      queued_at=null,
      event_type=null,
      error_message=null,
      updated_at=now()
  where communication_id=p_communication_id
    and status='failed';

  get diagnostics v_retry_count=row_count;

  delete from public.communication_recipients
  where communication_id=p_communication_id
    and status='pending';

  insert into public.communication_recipients(
    communication_id,workspace_id,condominium_id,member_id,user_id,
    email,name,recipient_role,status
  )
  select
    v_comm.id,v_comm.workspace_id,m.condominium_id,m.id,m.user_id,
    lower(trim(m.email)),m.name,
    case
      when coalesce(m.data->>'role',m.role)='Proprietario' then 'owner'
      when coalesce(m.data->>'role',m.role)='Inquilino' then 'tenant'
      when m.role='council' then 'council'
      else 'resident'
    end,
    'pending'
  from public.condominium_members m
  where m.condominium_id=v_comm.condominium_id
    and m.active=true
    and nullif(trim(m.email),'') is not null
  on conflict (communication_id,lower(btrim(email))) do update set
    member_id=excluded.member_id,
    user_id=excluded.user_id,
    name=excluded.name,
    recipient_role=excluded.recipient_role,
    updated_at=now();

  select count(*) into v_count
  from public.communication_recipients
  where communication_id=p_communication_id
    and status='pending';

  update public.communications
  set email_status=case when v_count>0 then 'prepared' else 'no_recipients' end,
      email_prepared_at=case when v_count>0 then now() else null end,
      updated_at=now()
  where id=p_communication_id;

  return jsonb_build_object(
    'status',case when v_count>0 then 'prepared' else 'no_recipients' end,
    'recipient_count',v_count,
    'retried_failed',v_retry_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.prevent_new_installment_for_closing_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.member_id is not null
     and exists (
       select 1 from public.condominium_members cm
       where cm.id=new.member_id
         and cm.active
         and coalesce(cm.data->>'position_status','')='In chiusura'
     )
  then
    raise exception 'MEMBER_POSITION_CLOSING: il titolare è in chiusura e non può ricevere nuove rate';
  end if;
  return new;
end;
$function$
;

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
;

CREATE OR REPLACE FUNCTION private.reset_stale_communication_recipients(p_communication_id uuid DEFAULT NULL::uuid, p_age interval DEFAULT '00:15:00'::interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
 if p_age < interval '5 minutes' then raise exception 'Intervallo di recupero troppo breve'; end if;
 update public.communication_recipients
 set status='pending', queued_at=null, error_message=null, updated_at=now()
 where status='queued'
   and queued_at is not null
   and queued_at < now()-p_age
   and (p_communication_id is null or communication_id=p_communication_id);
 get diagnostics v_count=row_count;
 return jsonb_build_object('reset',v_count);
end;
$function$
;

CREATE OR REPLACE FUNCTION private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
    and archived_at is not null
  returning name into v_name;

  if not found then
    raise exception 'Condominio archiviato non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'restored',
      'Condominio ripristinato dall''archivio',
      jsonb_build_object(
        'restored_by', auth.uid(),
        'restored_at', now(),
        'name', v_name
      )
    );
end;
$function$
;

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
;

CREATE OR REPLACE FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_archived_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  if p_legacy_id is not null then
    select id, archived_at
      into v_id, v_archived_at
    from public.condominiums
    where workspace_id = p_workspace_id
      and legacy_id = p_legacy_id
    for update;

    if v_id is not null and v_archived_at is not null then
      raise exception 'Il condominio è archiviato: utilizzare prima il ripristino';
    end if;
  end if;

  insert into public.condominiums (
    workspace_id, legacy_id, name, address, city, postal_code, province, data
  )
  values (
    p_workspace_id, p_legacy_id, p_name, p_address, p_city, p_postal_code,
    p_province, coalesce(p_data, '{}'::jsonb)
  )
  on conflict (workspace_id, legacy_id)
  do update set
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    postal_code = excluded.postal_code,
    province = excluded.province,
    data = excluded.data,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.set_personal_security_code(p_code text, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if p_enabled and (p_code is null or length(trim(p_code)) < 6 or length(trim(p_code)) > 32) then
    raise exception 'Il codice personale deve contenere da 6 a 32 caratteri';
  end if;
  insert into public.user_security_settings(user_id, personal_code_hash, personal_code_enabled, updated_at)
  values (auth.uid(), case when p_enabled then crypt(trim(p_code), gen_salt('bf')) else null end, p_enabled, now())
  on conflict (user_id) do update set personal_code_hash=excluded.personal_code_hash, personal_code_enabled=excluded.personal_code_enabled, updated_at=now();
end; $function$
;

CREATE OR REPLACE FUNCTION private.touch_condominium_request_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.verify_personal_security_code(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  select personal_code_hash into v_hash from public.user_security_settings where user_id=auth.uid() and personal_code_enabled=true;
  if v_hash is null or p_code is null then return false; end if;
  return crypt(trim(p_code), v_hash)=v_hash;
end; $function$
;

DO $
declare r record;
begin
  for r in select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;
