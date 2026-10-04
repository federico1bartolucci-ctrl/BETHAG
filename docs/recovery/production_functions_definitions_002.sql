-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- private.can_manage_workspace_module(target_workspace uuid, required_permission text)
CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(target_workspace uuid, required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$
;

-- private.claim_first_workspace_admin(p_workspace_id uuid)
CREATE OR REPLACE FUNCTION private.claim_first_workspace_admin(p_workspace_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select w.id
    into target_workspace
  from public.workspaces w
  where (p_workspace_id is null or w.id = p_workspace_id)
  order by w.created_at
  limit 1;

  if target_workspace is null then
    raise exception 'Workspace BETHAG non trovato';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_workspace::text, 0));

  if exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
  ) then
    raise exception 'Il workspace è già stato inizializzato';
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    active,
    permissions
  )
  values (
    target_workspace,
    auth.uid(),
    'admin',
    true,
    '{}'::jsonb
  );

  update public.profiles
  set role = 'admin',
      active = true,
      updated_at = now()
  where id = auth.uid();

  return target_workspace;
end;
$function$
;

-- private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
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

-- private.close_condominium_member_transfer(p_transfer_id uuid)
CREATE OR REPLACE FUNCTION private.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_workspace uuid; v_outgoing uuid; v_transfer_status text; v_open_installments numeric; v_open_allocations numeric; v_open_carryovers numeric; v_out_data jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select t.workspace_id,t.outgoing_member_id,t.status into v_workspace,v_outgoing,v_transfer_status
 from public.condominium_member_transfers t where t.id=p_transfer_id for update;
 if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
 select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005;
 select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations from public.condominium_expense_allocations a where a.member_id=v_outgoing and a.amount-a.paid_amount>0.005;
 select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=v_outgoing and abs(c.balance)>0.005;
 if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 then
   raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: il cedente mantiene la posizione attiva finché tutte le situazioni contabili non sono chiuse';
 end if;
 select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=v_outgoing for update;
 update public.condominium_members set active=false,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','Archiviato') where id=v_outgoing;
 update public.condominium_member_transfers set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),data=coalesce(data,'{}'::jsonb)||jsonb_build_object('financial_positions_closed',true) where id=p_transfer_id;
 return true;
end; $function$
;

-- private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
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

-- private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text)
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

-- private.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text)
CREATE OR REPLACE FUNCTION private.complete_portal_registration(p_full_name text, p_fiscal_code text DEFAULT NULL::text, p_condominium_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid:=auth.uid();
  v_email text;
  v_member public.condominium_members%rowtype;
  v_candidate_count integer:=0;
  v_workspace uuid;
  v_request_id uuid;
begin
  if v_user_id is null then raise exception 'Autenticazione richiesta'; end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id=v_user_id and u.email_confirmed_at is not null;

  if v_email is null then raise exception 'E-mail non ancora verificata'; end if;

  select count(*) into v_candidate_count
  from public.condominium_members cm
  where cm.active=true
    and (
      lower(trim(cm.name))=lower(trim(p_full_name))
      or (
        coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>''
        and regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')
          = regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')
      )
    );

  if v_candidate_count=1 then
    select cm.* into v_member
    from public.condominium_members cm
    where cm.active=true
      and (
        lower(trim(cm.name))=lower(trim(p_full_name))
        or (
          coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>''
          and regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')
            = regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')
        )
      )
    limit 1;

    select c.workspace_id into v_workspace
    from public.condominiums c
    where c.id=v_member.condominium_id;

    if exists (
      select 1 from public.condominiums c
      where c.id=v_member.condominium_id
        and c.workspace_id=v_workspace
        and c.archived_at is not null
    ) then
      raise exception 'Il condominio è archiviato: registrazione portale non consentita';
    end if;

    if lower(trim(v_member.email))=v_email then
      update public.condominium_members
      set user_id=v_user_id,updated_at=now()
      where id=v_member.id;

      insert into public.portal_access(
        workspace_id,condominium_id,legacy_id,name,email,role,apartment,
        permissions,active,user_id,data
      )
      values(
        v_workspace,v_member.condominium_id,v_member.legacy_id,v_member.name,
        v_email,'resident',coalesce(v_member.data->>'apartment',''),
        '[ "documenti","verbali","regolamento","assemblee","comunicazioni" ]'::jsonb,
        true,v_user_id,coalesce(v_member.data,'{}'::jsonb)
      )
      on conflict do update set
        name=excluded.name,legacy_id=excluded.legacy_id,apartment=excluded.apartment,
        permissions=excluded.permissions,active=true,user_id=excluded.user_id,
        data=excluded.data,updated_at=now();

      insert into public.workspace_members(
        workspace_id,user_id,role,active,permissions,condominium_id,legacy_id
      )
      values(
        v_workspace,v_user_id,'resident',true,'{}'::jsonb,
        v_member.condominium_id,v_member.legacy_id
      )
      on conflict(workspace_id,user_id)
      do update set active=true,role='resident',
        condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;

      update public.profiles
      set full_name=v_member.name,email=v_email,role='resident',active=true,updated_at=now()
      where id=v_user_id;

      update public.portal_registration_requests
      set status='approved',matched_member_id=v_member.id,
          workspace_id=v_workspace,requested_user_id=v_user_id,
          reviewed_at=coalesce(reviewed_at,now()),updated_at=now()
      where lower(trim(email))=v_email and status in ('pending','email_mismatch');

      return jsonb_build_object(
        'status','approved',
        'workspace_id',v_workspace,
        'condominium_id',v_member.condominium_id,
        'member_id',v_member.id
      );
    end if;

    insert into public.portal_registration_requests(
      workspace_id,requested_user_id,email,full_name,fiscal_code,
      condominium_name,status,matched_member_id,note
    )
    values(
      v_workspace,v_user_id,v_email,trim(p_full_name),
      nullif(trim(p_fiscal_code),''),
      nullif(trim(p_condominium_name),''),
      'email_mismatch',v_member.id,
      'Incongruenza e-mail: e-mail dell''account diversa da quella presente nell''anagrafica del condòmino.'
    )
    on conflict do nothing
    returning id into v_request_id;

    return jsonb_build_object('status','email_mismatch','request_id',v_request_id);
  end if;

  select c.workspace_id into v_workspace
  from public.condominiums c
  where p_condominium_name is not null
    and lower(trim(c.name))=lower(trim(p_condominium_name))
  group by c.workspace_id
  having count(*)=1
  limit 1;

  if v_workspace is null then
    select min(w.id) into v_workspace
    from public.workspaces w
    having count(*)=1;
  end if;

  insert into public.portal_registration_requests(
    workspace_id,requested_user_id,email,full_name,fiscal_code,
    condominium_name,status,note
  )
  values(
    v_workspace,v_user_id,v_email,trim(p_full_name),
    nullif(trim(p_fiscal_code),''),
    nullif(trim(p_condominium_name),''),
    'pending','Profilo condòmino non individuato automaticamente.'
  )
  on conflict do nothing returning id into v_request_id;

  update public.profiles
  set full_name=trim(p_full_name),email=v_email,role='resident',active=true,updated_at=now()
  where id=v_user_id;

  return jsonb_build_object('status','pending','request_id',v_request_id);
end;
$function$
;

-- private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
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
