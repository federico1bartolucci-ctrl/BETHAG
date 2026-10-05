-- Reconcile non-portal public function security/configuration parity.
CREATE OR REPLACE FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_fiscal_year_and_generate_carryovers($1,$2,$3); end $function$
;

CREATE OR REPLACE FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.compensate_fiscal_carryover($1,$2,$3,$4,$5,$6); end $function$
;

CREATE OR REPLACE FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_fiscal_year_carryovers($1,$2,$3,$4); end $function$
;

CREATE OR REPLACE FUNCTION public.guard_installment_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if old.ledger_entry_id is not null then raise exception 'La rata è collegata a un riparto contabile e non può essere cancellata singolarmente'; end if; if exists(select 1 from public.condominium_payment_movements where installment_id=old.id) then raise exception 'La rata ha movimenti di pagamento collegati e non può essere cancellata'; end if; return old; end; $function$
;

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

CREATE OR REPLACE FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text DEFAULT 'Bonifico'::text, p_reference text DEFAULT ''::text, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.register_condominium_installment_payment($1,$2,$3,$4,$5,$6,$7,$8); end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_child_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_condominium uuid; v_archived timestamptz;
  v_doc_ws uuid; v_doc_cond uuid;
begin
  select w.workspace_id,w.condominium_id,c.archived_at
    into v_workspace,v_condominium,v_archived
  from public.condominium_works w
  join public.condominiums c on c.id=w.condominium_id
  where w.id=new.work_id;
  if v_workspace is null then raise exception 'Lavoro non trovato'; end if;
  if new.workspace_id<>v_workspace or new.condominium_id<>v_condominium then
    raise exception 'Workspace/condominio non coerenti con il lavoro';
  end if;
  if v_archived is not null then raise exception 'Non è possibile modificare dati di un lavoro archiviato'; end if;
  if new.document_id is not null then
    select d.workspace_id,d.condominium_id into v_doc_ws,v_doc_cond
    from public.documents d
    where d.legacy_id=new.document_id;
    if not found or v_doc_ws<>new.workspace_id or v_doc_cond is distinct from new.condominium_id then
      raise exception 'Il documento collegato al lavoro deve appartenere allo stesso workspace e condominio';
    end if;
  end if;
  return new;
end;
$function$
;
