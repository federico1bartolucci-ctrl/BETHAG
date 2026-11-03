-- Serialize all accounting writes and member-transfer financial reads through one
-- transaction-scoped mutex per workspace/condominium.
--
-- This is intentionally conservative: the mutex is condominium-scoped rather
-- than unit-scoped so operations that aggregate multiple units cannot interleave
-- with transfer confirmation/closure. No production migration is executed here.

create or replace function private.lock_condominium_accounting_scope(
  p_workspace_id uuid,
  p_condominium_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $function$
begin
  if p_workspace_id is null or p_condominium_id is null then
    raise exception 'ACCOUNTING_SCOPE_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_workspace_id::text || ':' || p_condominium_id::text || ':accounting',
      0
    )
  );
end;
$function$;

revoke execute on function private.lock_condominium_accounting_scope(uuid,uuid) from public,anon;
grant execute on function private.lock_condominium_accounting_scope(uuid,uuid) to authenticated;

create or replace function private.serialize_accounting_write()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_workspace uuid;
  v_condominium uuid;
begin
  if tg_op = 'DELETE' then
    v_workspace := old.workspace_id;
    v_condominium := old.condominium_id;
  else
    v_workspace := new.workspace_id;
    v_condominium := new.condominium_id;
  end if;

  perform private.lock_condominium_accounting_scope(v_workspace, v_condominium);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke execute on function private.serialize_accounting_write() from public,anon;

drop trigger if exists trg_serialize_accounting_installment_write on public.condominium_installments;
create trigger trg_serialize_accounting_installment_write
before insert or update or delete on public.condominium_installments
for each row execute function private.serialize_accounting_write();

drop trigger if exists trg_serialize_accounting_allocation_write on public.condominium_expense_allocations;
create trigger trg_serialize_accounting_allocation_write
before insert or update or delete on public.condominium_expense_allocations
for each row execute function private.serialize_accounting_write();

drop trigger if exists trg_serialize_accounting_ledger_write on public.condominium_ledger_entries;
create trigger trg_serialize_accounting_ledger_write
before insert or update or delete on public.condominium_ledger_entries
for each row execute function private.serialize_accounting_write();

drop trigger if exists trg_serialize_accounting_carryover_write on public.condominium_fiscal_carryovers;
create trigger trg_serialize_accounting_carryover_write
before insert or update or delete on public.condominium_fiscal_carryovers
for each row execute function private.serialize_accounting_write();

drop trigger if exists trg_serialize_accounting_payment_write on public.condominium_payment_movements;
create trigger trg_serialize_accounting_payment_write
before insert or update or delete on public.condominium_payment_movements
for each row execute function private.serialize_accounting_write();

do $migration$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  -- Consumption-based allocation regeneration also reads the ledger and existing
  -- installments before deleting/rebuilding allocation rows. Lock at RPC entry;
  -- row triggers alone would acquire the mutex too late to protect that snapshot.
  v_def := pg_get_functiondef('public.generate_consumption_allocations(uuid,uuid,uuid,uuid,text)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' in v_def)=0 then
    v_old := 'if not private.can_manage_workspace_module(p_workspace_id,''contabilita'') then raise exception ''Autorizzazione gestione contabilità richiesta''; end if;';
    v_new := v_old || chr(10) || ' perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Consumption-allocation authorization anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Installment generation: acquire the shared condominium mutex before the
  -- existing per-expense mutex, establishing one global lock order.
  v_def := pg_get_functiondef('private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' in v_def)=0 then
    v_old := 'if not private.can_manage_workspace_module(p_workspace_id,''contabilita'') then';
    v_new := 'perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' || chr(10) || chr(10) || v_old;
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Installment-generation authorization anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Payment registration: lock before reading the installment and its
  -- allocations, so transfer closure cannot observe an intermediate state.
  v_def := pg_get_functiondef('public.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' in v_def)=0 then
    v_old := 'begin';
    v_new := 'begin' || chr(10) || '  perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Payment-registration begin anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Payment reversal: lock before reading the payment/installment.
  v_def := pg_get_functiondef('private.reverse_condominium_installment_payment(uuid,uuid,uuid,text)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' in v_def)=0 then
    v_old := 'if auth.uid() is null then raise exception ''Autenticazione richiesta''; end if;';
    v_new := v_old || chr(10) || '  perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Payment-reversal authorization anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Carryover regeneration: lock before checking/deleting existing rows.
  v_def := pg_get_functiondef('public.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' in v_def)=0 then
    v_old := 'begin';
    v_new := 'begin' || chr(10) || '  perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Carryover-regeneration begin anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Carryover compensation: lock before reading the carryover/target installment.
  v_def := pg_get_functiondef('public.compensate_fiscal_carryover(uuid,uuid,uuid,uuid,numeric,text)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);' in v_def)=0 then
    v_old := 'begin';
    v_new := 'begin' || chr(10) || '  perform private.lock_condominium_accounting_scope(p_workspace_id,p_condominium_id);';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Carryover-compensation begin anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Transfer confirmation: acquire the same mutex before taking the unit
  -- snapshot. The unit row lock remains in place as a secondary ownership lock.
  v_def := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(v_workspace,v_condominium);' in v_def)=0 then
    v_old := 'select u.workspace_id,u.condominium_id into v_workspace,v_condominium from public.condominium_units u';
    if position(v_old in v_def)=0 then
      raise exception 'Transfer-confirmation unit context anchor missing';
    end if;
    v_new := v_old || chr(10) || '  perform private.lock_condominium_accounting_scope(v_workspace,v_condominium);';
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;

  -- Transfer closure: obtain the transfer row first, then the shared mutex
  -- before any financial guard is evaluated.
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);
  if position('perform private.lock_condominium_accounting_scope(v_workspace,v_condominium);' in v_def)=0 then
    v_old := 'select t.workspace_id,t.condominium_id,t.unit_id,t.outgoing_member_id,t.status into v_workspace,v_condominium,v_unit,v_outgoing,v_transfer_status from public.condominium_member_transfers t where t.id=p_transfer_id for update;';
    if position(v_old in v_def)=0 then
      raise exception 'Transfer-close context anchor missing';
    end if;
    v_new := v_old || chr(10) || '  perform private.lock_condominium_accounting_scope(v_workspace,v_condominium);';
    v_def := replace(v_def,v_old,v_new);
  end if;
  execute v_def;
end
$migration$;
