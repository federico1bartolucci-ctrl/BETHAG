-- Replay-only reconstruction of a pre-ledger relation first used by 20261001081847.
-- Definition is reconstructed from the read-only Production catalog (2026-11-04).
-- Never deploy this synthetic prerequisite to QA or Production.
create table public.condominium_member_transfers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  unit_id uuid not null references public.condominium_units(id) on delete cascade,
  outgoing_member_id uuid not null references public.condominium_members(id) on delete restrict,
  incoming_member_id uuid references public.condominium_members(id) on delete set null,
  transfer_date date not null,
  transfer_type text not null default 'Vendita'
    check (transfer_type in ('Vendita','Acquisto','Donazione','Successione','Altro')),
  status text not null default 'Confermato'
    check (status in ('Bozza','Confermato','Chiuso','Annullato')),
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null
);

-- Pre-ledger private transfer-close implementation.
-- The first recorded ledger operation on this function is ALTER FUNCTION at 20261001081847;
-- none of the 247 payloads contains its CREATE statement. The body below is reconstructed
-- from the read-only Production catalog. The later recorded migration 20261003050722 is
-- idempotent when this final unit-carryover guard is already present. Test-only; never deploy.
create or replace function private.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_workspace uuid;
  v_outgoing_ids uuid[];
  v_transfer_status text;
  v_scope text;
  v_open_installments numeric;
  v_open_allocations numeric;
  v_open_carryovers numeric;
  v_open_unit_carryovers numeric;
  v_outgoing_id uuid;
  v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.workspace_id,t.status,coalesce(t.data->>'transfer_scope','whole_property'),
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
              else array[t.outgoing_member_id] end
    into v_workspace,v_transfer_status,v_scope,v_outgoing_ids
  from public.condominium_member_transfers t where t.id=p_transfer_id for update;
  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
  if v_scope='ownership_share' then raise exception 'TRANSFER_QUOTA_NOT_CLOSABLE'; end if;
  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments
    from public.condominium_installments i
    where i.member_id=any(v_outgoing_ids) and i.amount-i.paid_amount>0.005;
  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations
    from public.condominium_expense_allocations a
    where a.member_id=any(v_outgoing_ids) and a.amount-a.paid_amount>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_carryovers
    from public.condominium_fiscal_carryovers c
    where c.member_id=any(v_outgoing_ids) and abs(c.balance)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers
    from public.condominium_fiscal_carryovers c
    join public.condominium_member_transfers t on t.id=p_transfer_id
    where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id
      and c.unit_id=t.unit_id and c.member_id is null and abs(c.balance)>0.005;
  if v_open_installments>0.005 or v_open_allocations>0.005
     or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then
    raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: i cedenti mantengono la posizione attiva finché tutte le situazioni contabili non sono chiuse';
  end if;
  foreach v_outgoing_id in array v_outgoing_ids loop
    select coalesce(m.data,'{}'::jsonb) into v_out_data
    from public.condominium_members m where m.id=v_outgoing_id for update;
    update public.condominium_members
    set active=false,updated_at=now(),
        data=v_out_data||jsonb_build_object('position_status','Archiviato','current_owner',false)
    where id=v_outgoing_id;
  end loop;
  update public.condominium_member_transfers
  set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),
      data=coalesce(data,'{}'::jsonb)||jsonb_build_object('financial_positions_closed',true)
  where id=p_transfer_id;
  return true;
end;
$function$;
