-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- public.get_member_transfer_accounting_snapshot(p_transfer_id uuid)
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

-- public.guard_condominium_expense_allocation_total()
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

-- public.guard_confirmed_unit_transformation_immutable()
CREATE OR REPLACE FUNCTION public.guard_confirmed_unit_transformation_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.status = 'Confermata' then
    raise exception 'CONFIRMED_TRANSFORMATION_IMMUTABLE: una trasformazione confermata è immodificabile';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$
;

-- public.guard_confirmed_unit_transformation_items_immutable()
CREATE OR REPLACE FUNCTION public.guard_confirmed_unit_transformation_items_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_transformation_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_transformation_id := old.transformation_id;
    if exists (
      select 1 from public.condominium_unit_transformations t
      where t.id = v_transformation_id and t.status = 'Confermata'
    ) then
      raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    v_transformation_id := new.transformation_id;
    if exists (
      select 1 from public.condominium_unit_transformations t
      where t.id = v_transformation_id and t.status = 'Confermata'
    ) then
      raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$
;

-- public.guard_consumption_reading_integrity()
CREATE OR REPLACE FUNCTION public.guard_consumption_reading_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and l.fiscal_year_id=old.fiscal_year_id and a.allocation_basis='Consumo - '||trim(old.service_type) and a.unit_id=old.unit_id) then raise exception 'La lettura di consumo è già utilizzata in un riparto e non può essere modificata o cancellata'; end if; return case when tg_op='DELETE' then old else new end; end; $function$
;

-- public.guard_expense_allocation_integrity()
CREATE OR REPLACE FUNCTION public.guard_expense_allocation_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_op='DELETE' then
    if coalesce(old.paid_amount,0)>0.005 then
      raise exception 'La ripartizione ha pagamenti registrati e non può essere cancellata';
    end if;
    if exists(
      select 1 from public.condominium_installments i
      where i.workspace_id=old.workspace_id
        and i.condominium_id=old.condominium_id
        and i.ledger_entry_id=old.ledger_entry_id
    ) then
      raise exception 'La ripartizione è collegata a rate e non può essere cancellata';
    end if;
    return old;
  end if;

  if tg_op='UPDATE' then
    if new.paid_amount is distinct from old.paid_amount
       and current_setting('bethag.allow_allocation_paid_update',true) is distinct from 'on' then
      raise exception 'Il pagato della ripartizione viene aggiornato esclusivamente dai movimenti di pagamento';
    end if;

    if coalesce(old.paid_amount,0)>0.005
       and (
         new.amount is distinct from old.amount
         or new.unit_id is distinct from old.unit_id
         or new.member_id is distinct from old.member_id
         or new.ledger_entry_id is distinct from old.ledger_entry_id
         or new.condominium_id is distinct from old.condominium_id
         or new.workspace_id is distinct from old.workspace_id
       ) then
      raise exception 'Una ripartizione con pagamenti registrati non può essere scollegata o modificata nei dati contabili';
    end if;

    if exists(
      select 1 from public.condominium_installments i
      where i.workspace_id=old.workspace_id
        and i.condominium_id=old.condominium_id
        and i.ledger_entry_id=old.ledger_entry_id
    ) and (
      new.amount is distinct from old.amount
      or new.unit_id is distinct from old.unit_id
      or new.member_id is distinct from old.member_id
      or new.ledger_entry_id is distinct from old.ledger_entry_id
      or new.condominium_id is distinct from old.condominium_id
      or new.workspace_id is distinct from old.workspace_id
    ) then
      raise exception 'Una ripartizione collegata a rate non può essere scollegata o modificata nei dati contabili';
    end if;
  end if;

  return new;
end;
$function$
;

-- public.guard_fiscal_carryover_compensation_total()
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

-- public.guard_fiscal_year_opening_balance()
CREATE OR REPLACE FUNCTION public.guard_fiscal_year_opening_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.opening_balance is distinct from old.opening_balance and exists(select 1 from public.condominium_fiscal_carryovers c where c.workspace_id=old.workspace_id and c.condominium_id=old.condominium_id and c.target_fiscal_year_id=old.id) then raise exception 'Il saldo iniziale è vincolato ai riporti dell''esercizio precedente e non può essere modificato manualmente'; end if; return new; end; $function$
;
