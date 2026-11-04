-- Replay-only seeds for six pre-ledger SECURITY DEFINER trigger functions.
-- The recovered ledger revokes their EXECUTE privileges at 20260930114808, but contains
-- no CREATE statements for these six functions. Their current Production definitions were
-- captured read-only from pg_get_functiondef and are seeded before the first recorded ACL
-- operation. Later historical payloads remain responsible for triggers/ACL reconciliation.
-- Synthetic test scaffolding only; never deploy to QA or Production.

CREATE OR REPLACE FUNCTION public.guard_consumption_reading_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and l.fiscal_year_id=old.fiscal_year_id and a.allocation_basis='Consumo - '||trim(old.service_type) and a.unit_id=old.unit_id) then raise exception 'La lettura di consumo è già utilizzata in un riparto e non può essere modificata o cancellata'; end if; return case when tg_op='DELETE' then old else new end; end; $function$


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


CREATE OR REPLACE FUNCTION public.guard_fiscal_year_opening_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.opening_balance is distinct from old.opening_balance and exists(select 1 from public.condominium_fiscal_carryovers c where c.workspace_id=old.workspace_id and c.condominium_id=old.condominium_id and c.target_fiscal_year_id=old.id) then raise exception 'Il saldo iniziale è vincolato ai riporti dell''esercizio precedente e non può essere modificato manualmente'; end if; return new; end; $function$


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


CREATE OR REPLACE FUNCTION public.prevent_fiscal_year_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_count bigint;
begin
 select count(*) into v_count from public.condominium_ledger_entries where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene movimenti contabili'; end if;
 select count(*) into v_count from public.condominium_installments where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene rate'; end if;
 select count(*) into v_count from public.condominium_budgets where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene voci di preventivo'; end if;
 select count(*) into v_count from public.condominium_consumption_readings where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene dati di consumo'; end if;
 select count(*) into v_count from public.condominium_fiscal_carryovers where source_fiscal_year_id=old.id or target_fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: esistono partite riportate collegate'; end if;
 if old.status='Chiuso' then raise exception 'Un esercizio chiuso non può essere cancellato'; end if;
 return old;
end; $function$


CREATE OR REPLACE FUNCTION public.validate_allocation_rule_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.allocation_table_id is null then raise exception 'Una regola di riparto deve indicare una tabella millesimale'; end if; if not exists(select 1 from public.condominium_millesimal_tables t where t.id=new.allocation_table_id and t.workspace_id=new.workspace_id and t.condominium_id=new.condominium_id) then raise exception 'La tabella della regola di riparto non appartiene al condominio selezionato'; end if; if new.priority is null or new.priority<0 then raise exception 'La priorità della regola di riparto non può essere negativa'; end if; if coalesce(trim(new.name),'')='' then raise exception 'Il nome della regola di riparto è obbligatorio'; end if; if coalesce(trim(new.expense_type),'')='' and coalesce(trim(new.category),'')='' then raise exception 'La regola deve indicare almeno il tipo di spesa o la categoria'; end if; return new; end; $function$

