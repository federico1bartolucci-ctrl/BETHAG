-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- private.is_workspace_manager(target_workspace uuid)
CREATE OR REPLACE FUNCTION private.is_workspace_manager(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.active = true
      and wm.role in ('admin','collaborator')
  );
$function$
;

-- private.is_workspace_member(target_workspace uuid)
CREATE OR REPLACE FUNCTION private.is_workspace_member(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
); $function$
;

-- private.is_workspace_staff(target_workspace uuid)
CREATE OR REPLACE FUNCTION private.is_workspace_staff(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
    and wm.role in ('admin','collaborator')
); $function$
;

-- private.list_archived_condominiums(p_workspace_id uuid)
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

-- private.prepare_communication_recipients(p_communication_id uuid)
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

-- private.prevent_new_installment_for_closing_member()
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

-- private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text)
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

-- private.reset_stale_communication_recipients(p_communication_id uuid, p_age interval)
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
