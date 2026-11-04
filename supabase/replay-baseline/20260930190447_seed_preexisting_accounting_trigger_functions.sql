-- Replay-only seeds for pre-ledger accounting/financial trigger functions.
-- These functions exist in Production but have no CREATE payload before their first
-- recorded ACL/patch operations. The earliest dependency is guard_installment_paid_amount_update,
-- patched by 20260930190448; the others are granted at 20261005132430 before some are
-- redefined by 20261005132509. Definitions were captured read-only from Production.
-- Never deploy this compatibility seed to QA or Production.

CREATE OR REPLACE FUNCTION public.guard_installment_paid_amount_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if tg_op='UPDATE' and new.paid_amount is distinct from old.paid_amount and coalesce(current_setting('bethag.allow_installment_paid_update',true),'off') <> 'on' then
  raise exception 'Il totale pagato della rata può essere modificato esclusivamente tramite la registrazione di un movimento di pagamento';
 end if;
 if tg_op='UPDATE' and coalesce(old.paid_amount,0)>0 and (new.amount is distinct from old.amount or new.unit_id is distinct from old.unit_id or new.ledger_entry_id is distinct from old.ledger_entry_id or new.fiscal_year_id is distinct from old.fiscal_year_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then
  raise exception 'Una rata con pagamenti registrati non può modificare importo, unità, esercizio o collegamento contabile';
 end if;
 return new;
end; $function$


CREATE OR REPLACE FUNCTION public.guard_installment_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if old.ledger_entry_id is not null then raise exception 'La rata è collegata a un riparto contabile e non può essere cancellata singolarmente'; end if; if exists(select 1 from public.condominium_payment_movements where installment_id=old.id) then raise exception 'La rata ha movimenti di pagamento collegati e non può essere cancellata'; end if; return old; end; $function$


CREATE OR REPLACE FUNCTION public.guard_ledger_entry_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
 v_allocations integer:=0;
 v_installments integer:=0;
begin
 if tg_op='DELETE' then
  select count(*) into v_allocations
  from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  select count(*) into v_installments
  from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  if v_allocations>0 or v_installments>0 then
    raise exception 'La voce contabile è collegata a ripartizioni o rate e non può essere cancellata';
  end if;
  return old;
 end if;

 if tg_op='UPDATE' then
  select count(*) into v_allocations
  from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  select count(*) into v_installments
  from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  if (v_allocations>0 or v_installments>0) and (
    new.amount is distinct from old.amount
    or new.direction is distinct from old.direction
    or new.fiscal_year_id is distinct from old.fiscal_year_id
    or new.condominium_id is distinct from old.condominium_id
    or new.workspace_id is distinct from old.workspace_id
    or new.supplier_id is distinct from old.supplier_id
    or new.document_id is distinct from old.document_id
  ) then
    raise exception 'La voce contabile è già collegata a ripartizioni o rate: importo, direzione, esercizio, fornitore, documento e appartenenza non possono essere modificati';
  end if;
  return new;
 end if;

 return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.guard_ledger_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where ledger_entry_id=old.id) then raise exception 'La voce contabile ha ripartizioni collegate e non può essere cancellata'; end if; return old; end; $function$


CREATE OR REPLACE FUNCTION public.guard_millesimal_table_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_allocations integer:=0;
begin
 select count(*) into v_allocations from public.condominium_expense_allocations a where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and a.allocation_table_id=old.id;
 if tg_op='DELETE' and v_allocations>0 then raise exception 'La tabella millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata'; end if;
 if tg_op='UPDATE' and v_allocations>0 and (new.basis_type is distinct from old.basis_type or new.scope_mode is distinct from old.scope_mode or new.scope_unit_ids is distinct from old.scope_unit_ids or new.scope_building_codes is distinct from old.scope_building_codes or new.total_millesimi is distinct from old.total_millesimi or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then raise exception 'La tabella millesimale è già utilizzata da ripartizioni esistenti e la base di calcolo non può essere modificata'; end if;
 return coalesce(new,old);
end; $function$


CREATE OR REPLACE FUNCTION public.guard_millesimal_table_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where allocation_table_id=old.id) then raise exception 'La tabella millesimale ha ripartizioni collegate e non può essere cancellata'; end if; if exists(select 1 from public.condominium_millesimal_values where table_id=old.id) then raise exception 'La tabella millesimale ha quote collegate e non può essere cancellata'; end if; return old; end; $function$


CREATE OR REPLACE FUNCTION public.guard_millesimal_value_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_allocations integer:=0;
begin
 select count(*) into v_allocations from public.condominium_expense_allocations a where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and a.allocation_table_id=old.table_id;
 if tg_op='DELETE' and v_allocations>0 then raise exception 'La quota millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata'; end if;
 if tg_op='UPDATE' and v_allocations>0 and (new.value is distinct from old.value or new.excluded is distinct from old.excluded or new.table_id is distinct from old.table_id or new.unit_id is distinct from old.unit_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then raise exception 'La quota millesimale è già utilizzata da ripartizioni esistenti e non può essere modificata'; end if;
 return coalesce(new,old);
end; $function$


CREATE OR REPLACE FUNCTION public.prevent_financial_unit_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_alloc integer; v_inst integer;
begin
  select count(*) into v_alloc from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  select count(*) into v_inst from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  if v_alloc>0 or v_inst>0 then
    raise exception 'L''unità ha movimenti contabili o rate collegate e non può essere eliminata';
  end if;
  return old;
end;
$function$


CREATE OR REPLACE FUNCTION public.prevent_paid_allocation_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(old.paid_amount,0)>0 then
    raise exception 'Non è possibile cancellare una ripartizione con pagamenti registrati';
  end if;
  return old;
end;
$function$


CREATE OR REPLACE FUNCTION public.prevent_paid_installment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(old.paid_amount,0)>0 then
    raise exception 'Non è possibile cancellare una rata con pagamenti registrati: utilizzare una procedura di rettifica del pagamento';
  end if;
  return old;
end;
$function$


CREATE OR REPLACE FUNCTION public.sync_condominium_fund_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_old_fund uuid;
  v_new_fund uuid;
  v_fund uuid;
  v_used numeric;
begin
  v_old_fund := case when tg_op in ('UPDATE','DELETE') then old.fund_id else null end;
  v_new_fund := case when tg_op in ('INSERT','UPDATE') then new.fund_id else null end;

  if v_old_fund is not null and v_new_fund is not null and v_old_fund <> v_new_fund then
    if v_old_fund < v_new_fund then
      perform 1 from public.condominium_funds where id = v_old_fund for update;
      perform 1 from public.condominium_funds where id = v_new_fund for update;
    else
      perform 1 from public.condominium_funds where id = v_new_fund for update;
      perform 1 from public.condominium_funds where id = v_old_fund for update;
    end if;
  else
    v_fund := coalesce(v_new_fund, v_old_fund);
    if v_fund is not null then
      perform 1 from public.condominium_funds where id = v_fund for update;
    end if;
  end if;

  if v_old_fund is not null then
    select coalesce(sum(case when direction = 'Uscita' then amount else 0 end),0)
      into v_used
    from public.condominium_ledger_entries
    where fund_id = v_old_fund;

    perform set_config('bethag.allow_fund_used_update','on',true);
    update public.condominium_funds
       set used_amount = greatest(v_used,0),
           updated_at = now()
     where id = v_old_fund;
  end if;

  if v_new_fund is not null and v_new_fund is distinct from v_old_fund then
    select coalesce(sum(case when direction = 'Uscita' then amount else 0 end),0)
      into v_used
    from public.condominium_ledger_entries
    where fund_id = v_new_fund;

    perform set_config('bethag.allow_fund_used_update','on',true);
    update public.condominium_funds
       set used_amount = greatest(v_used,0),
           updated_at = now()
     where id = v_new_fund;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$


CREATE OR REPLACE FUNCTION public.validate_condominium_ledger_fund_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid; v_cond uuid;
begin
 if new.fund_id is null then return new; end if;
 if new.direction<>'Uscita' then raise exception 'Un fondo può essere collegato solo a un movimento di uscita'; end if;
 select workspace_id,condominium_id into v_ws,v_cond from public.condominium_funds where id=new.fund_id;
 if v_ws is null then raise exception 'Fondo non trovato'; end if;
 if v_ws<>new.workspace_id or v_cond<>new.condominium_id then raise exception 'Fondo e movimento contabile devono appartenere allo stesso workspace e condominio'; end if;
 return new;
end $function$

