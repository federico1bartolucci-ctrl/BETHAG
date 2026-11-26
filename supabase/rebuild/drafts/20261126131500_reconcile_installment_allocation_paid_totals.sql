-- Forward-only reconciliation of installment payments and expense allocations.
-- Historical baseline migrations remain immutable. CREATE OR REPLACE preserves the
-- existing function ownership and grants; this migration changes function bodies only.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_condominium_installment_from_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_installment_id uuid;
  v_workspace_id uuid;
  v_ledger_entry_id uuid;
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

  -- Serialize trigger-driven allocation reconciliation by ledger entry before locking installments.
  select ledger_entry_id into v_ledger_entry_id
  from public.condominium_installments
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  if found and v_ledger_entry_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_workspace_id::text||':'||v_condominium_id::text||':'||v_ledger_entry_id::text,
        0
      )
    );
  end if;


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
      select round(coalesce(sum(i.paid_amount),0)::numeric,2)
        into v_remaining
      from public.condominium_installments i
      where i.workspace_id=v_workspace_id
        and i.condominium_id=v_condominium_id
        and i.ledger_entry_id=(
          select current_installment.ledger_entry_id
          from public.condominium_installments current_installment
          where current_installment.id=v_installment_id
        )
        and i.unit_id is null
        and i.member_id=v_member_id;

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

      end loop;
    end if;
  else
    -- Distribute cumulative paid totals across every allocation row for this
    -- exact unit/member pair; never copy the same total into duplicate rows.
    select round(coalesce(sum(i.paid_amount),0)::numeric,2)
      into v_remaining
    from public.condominium_installments i
    where i.workspace_id=v_workspace_id
      and i.condominium_id=v_condominium_id
      and i.ledger_entry_id=v_ledger_entry_id
      and i.unit_id is not distinct from v_unit_id
      and i.member_id is not distinct from v_member_id;

    for v_allocation in
      select a.*
      from public.condominium_expense_allocations a
      where a.workspace_id=v_workspace_id
        and a.condominium_id=v_condominium_id
        and a.ledger_entry_id=v_ledger_entry_id
        and a.unit_id is not distinct from v_unit_id
        and a.member_id is not distinct from v_member_id
      order by a.id
      for update
    loop
      v_target := least(
        round(coalesce(v_allocation.amount,0)::numeric,2),
        greatest(round(coalesce(v_remaining,0)::numeric,2),0)
      );

      update public.condominium_expense_allocations
      set paid_amount=v_target,
          status=case
            when v_target>=v_allocation.amount-0.005 then 'Pagato'
            when v_target>0 then 'Parzialmente pagato'
            else 'Da pagare'
          end
      where id=v_allocation.id;

      v_remaining := round(v_remaining-v_target,2);
    end loop;
  end if;

  return coalesce(new, old);
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
  v_ledger_entry_id uuid;
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

  -- Serialize payment reconciliation across installments of the same ledger entry.
  select ledger_entry_id into v_ledger_entry_id
  from public.condominium_installments
  where id=p_installment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id;

  if not found then
    raise exception 'Rata non trovata o non appartenente al condominio';
  end if;

  if v_ledger_entry_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        p_workspace_id::text||':'||p_condominium_id::text||':'||v_ledger_entry_id::text,
        0
      )
    );
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

      select round(coalesce(sum(i.paid_amount),0)::numeric,2)
      into v_remaining
      from public.condominium_installments i
      where i.workspace_id=p_workspace_id
        and i.condominium_id=p_condominium_id
        and i.ledger_entry_id=v_installment.ledger_entry_id
        and i.unit_id is null
        and i.member_id=v_member_id;

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
        where i.workspace_id=p_works
    else
      /*
        Rata non unificata: distribuire il totale cumulativo tra tutte le
        righe della stessa unità e dello stesso proprietario, in ordine stabile.
        Copiare il totale su ogni riga sovrastimerebbe i pagamenti in presenza
        di più ripartizioni per la stessa coppia unità/proprietario.
      */
      select round(coalesce(sum(i.paid_amount),0)::numeric,2)
      into v_remaining
      from public.condominium_installments i
      where i.workspace_id=p_workspace_id
        and i.condominium_id=p_condominium_id
        and i.ledger_entry_id=v_installment.ledger_entry_id
        and i.unit_id is not distinct from v_installment.unit_id
        and i.member_id is not distinct from v_installment.member_id;

      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=p_workspace_id
          and a.condominium_id=p_condominium_id
          and a.ledger_entry_id=v_installment.ledger_entry_id
          and a.unit_id is not distinct from v_installment.unit_id
          and a.member_id is not distinct from v_installment.member_id
        order by a.id
        for update
      loop
        v_allocation_target:=least(
          round(coalesce(v_allocation.amount,0)::numeric,2),
          greatest(round(coalesce(v_remaining,0)::numeric,2),0)
        );

        update public.condominium_expense_allocations
        set paid_amount=v_allocation_target,
            status=case
              when v_allocation_target>=v_allocation.amount-0.005 then 'Pagato'
              when v_allocation_target>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;

        v_remaining:=round(v_remaining-v_allocation_target,2);
      end loop;