-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- public.guard_unit_scope_changes()
CREATE OR REPLACE FUNCTION public.guard_unit_scope_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_old_building text;
  v_new_building text;
  v_old_civic text;
  v_new_civic text;
  v_old_fabbricato text;
  v_new_fabbricato text;
begin
  v_old_building := nullif(btrim(coalesce(old.building_code, '')), '');
  v_new_building := nullif(btrim(coalesce(new.building_code, '')), '');
  v_old_civic := nullif(btrim(coalesce(old.data->>'civic_code', old.data->>'civicCode', old.data->>'civico', '')), '');
  v_new_civic := nullif(btrim(coalesce(new.data->>'civic_code', new.data->>'civicCode', new.data->>'civico', '')), '');
  v_old_fabbricato := nullif(btrim(coalesce(old.data->>'fabbricato', old.data->>'building_code', old.data->>'buildingCode', '')), '');
  v_new_fabbricato := nullif(btrim(coalesce(new.data->>'fabbricato', new.data->>'building_code', new.data->>'buildingCode', '')), '');

  if old.workspace_id is distinct from new.workspace_id
     or old.condominium_id is distinct from new.condominium_id then
    if exists (
      select 1 from public.condominium_expense_allocations
      where unit_id = old.id
    ) or exists (
      select 1 from public.condominium_installments
      where unit_id = old.id
    ) then
      raise exception 'UNIT_HAS_FINANCIAL_HISTORY: impossibile spostare un''unità con storico contabile tra workspace o condomini';
    end if;
  end if;

  if v_old_building is distinct from v_new_building
     or v_old_civic is distinct from v_new_civic
     or v_old_fabbricato is distinct from v_new_fabbricato then
    if exists (
      select 1 from public.condominium_expense_allocations
      where workspace_id = old.workspace_id
        and condominium_id = old.condominium_id
        and unit_id = old.id
    ) or exists (
      select 1 from public.condominium_installments
      where workspace_id = old.workspace_id
        and condominium_id = old.condominium_id
        and unit_id = old.id
    ) then
      raise exception 'UNIT_SCOPE_LOCKED: fabbricato, edificio o civico non possono essere modificati dopo la registrazione di movimenti contabili o rate per l''unità';
    end if;
  end if;

  return new;
end;
$function$
;

-- public.list_archived_condominiums(p_workspace_id uuid)
CREATE OR REPLACE FUNCTION public.list_archived_condominiums(p_workspace_id uuid)
 RETURNS SETOF condominiums
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return query select * from private.list_archived_condominiums($1); end $function$
;

-- public.normalize_condominium_member_contact()
CREATE OR REPLACE FUNCTION public.normalize_condominium_member_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.email is not null then
    new.email := nullif(lower(btrim(new.email)),'');
  end if;
  new.role := nullif(btrim(new.role),'');
  if new.role is null then
    new.role := 'resident';
  end if;
  return new;
end;
$function$
;

-- public.normalize_condominium_member_names()
CREATE OR REPLACE FUNCTION public.normalize_condominium_member_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_data jsonb;
begin
  v_data := coalesce(new.data,'{}'::jsonb);
  if nullif(btrim(coalesce(v_data->>'lastName','')),'') is not null then
    v_data := jsonb_set(v_data,'{lastName}',to_jsonb(upper(btrim(v_data->>'lastName'))),true);
  end if;
  if nullif(btrim(coalesce(v_data->>'firstName','')),'') is not null then
    v_data := jsonb_set(v_data,'{firstName}',to_jsonb(initcap(lower(btrim(v_data->>'firstName')))),true);
  end if;
  new.data := v_data;
  return new;
end;
$function$
;

-- public.prepare_communication_recipients(p_communication_id uuid)
CREATE OR REPLACE FUNCTION public.prepare_communication_recipients(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_catalog'
AS $function$ select private.prepare_communication_recipients(p_communication_id); $function$
;

-- public.prevent_archived_condominium_mutation()
CREATE OR REPLACE FUNCTION public.prevent_archived_condominium_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_condominium_id uuid;
begin
  if tg_op='DELETE' then
    return old;
  end if;

  v_condominium_id := new.condominium_id;

  if v_condominium_id is not null and exists (
    select 1
    from public.condominiums c
    where c.id=v_condominium_id
      and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato: modifica non consentita';
  end if;

  return new;
end;
$function$
;

-- public.prevent_closed_condominium_accounting()
CREATE OR REPLACE FUNCTION public.prevent_closed_condominium_accounting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_year_id uuid;
  v_status text;
begin
  if tg_table_name = 'condominium_ledger_entries' then
    v_year_id := case when tg_op = 'DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name = 'condominium_budgets' then
    v_year_id := case when tg_op = 'DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name = 'condominium_installments' then
    v_year_id := case when tg_op = 'DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name = 'condominium_expense_allocations' then
    select fiscal_year_id into v_year_id from public.condominium_ledger_entries
    where id = case when tg_op = 'DELETE' then old.ledger_entry_id else new.ledger_entry_id end;
  elsif tg_table_name = 'condominium_payment_movements' then
    select fiscal_year_id into v_year_id from public.condominium_installments
    where id = case when tg_op = 'DELETE' then old.installment_id else new.installment_id end;
  end if;

  if v_year_id is not null then
    select status into v_status from public.condominium_fiscal_years where id = v_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso: modifica non consentita.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$
;

-- public.prevent_closed_fiscal_year_delete()
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
