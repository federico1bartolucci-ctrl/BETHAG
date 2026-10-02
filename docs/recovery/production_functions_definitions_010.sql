-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- public.guard_fund_integrity()
CREATE OR REPLACE FUNCTION public.guard_fund_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if new.target_amount is null or new.target_amount < 0
     or new.allocated_amount is null or new.allocated_amount < 0
     or new.used_amount is null or new.used_amount < 0 then
    raise exception 'Gli importi del fondo devono essere numerici e non negativi';
  end if;

  if tg_op = 'UPDATE'
     and new.used_amount is distinct from old.used_amount
     and coalesce(current_setting('bethag.allow_fund_used_update', true), 'off') <> 'on' then
    raise exception 'L''importo utilizzato del fondo è calcolato automaticamente dalla contabilità e non può essere modificato manualmente';
  end if;

  if new.used_amount > new.allocated_amount + 0.005 then
    raise exception 'L''importo utilizzato non può superare l''importo allocato';
  end if;

  return new;
end;
$function$
;

-- public.guard_installment_paid_amount_update()
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
;

-- public.guard_installment_parent_delete()
CREATE OR REPLACE FUNCTION public.guard_installment_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if old.ledger_entry_id is not null then raise exception 'La rata è collegata a un riparto contabile e non può essere cancellata singolarmente'; end if; if exists(select 1 from public.condominium_payment_movements where installment_id=old.id) then raise exception 'La rata ha movimenti di pagamento collegati e non può essere cancellata'; end if; return old; end; $function$
;

-- public.guard_ledger_entry_integrity()
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
;

-- public.guard_ledger_parent_delete()
CREATE OR REPLACE FUNCTION public.guard_ledger_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where ledger_entry_id=old.id) then raise exception 'La voce contabile ha ripartizioni collegate e non può essere cancellata'; end if; return old; end; $function$
;

-- public.guard_millesimal_table_integrity()
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
;

-- public.guard_millesimal_table_parent_delete()
CREATE OR REPLACE FUNCTION public.guard_millesimal_table_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where allocation_table_id=old.id) then raise exception 'La tabella millesimale ha ripartizioni collegate e non può essere cancellata'; end if; if exists(select 1 from public.condominium_millesimal_values where table_id=old.id) then raise exception 'La tabella millesimale ha quote collegate e non può essere cancellata'; end if; return old; end; $function$
;

-- public.guard_millesimal_value_integrity()
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
;
