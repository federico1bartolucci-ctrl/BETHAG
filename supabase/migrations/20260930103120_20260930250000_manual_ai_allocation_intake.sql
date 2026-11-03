-- BETHAG: acquisizione documentale/riparto con doppio percorso Manuale + AI.
-- L'AI non è necessaria per usare la contabilità: il percorso manuale resta sempre disponibile
-- agli utenti autorizzati dal modulo contabilità. Nessun dato AI viene scritto nel riparto
-- definitivo prima della conferma dell'amministratore/collaboratore autorizzato.

create table if not exists public.condominium_allocation_intakes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  source text not null default 'Manuale',
  status text not null default 'Bozza',
  document_id uuid references public.documents(id) on delete set null,
  ledger_entry_id uuid references public.condominium_ledger_entries(id) on delete set null,
  allocation_table_id uuid references public.condominium_millesimal_tables(id) on delete set null,
  title text not null default '',
  description text not null default '',
  expense_amount numeric(14,2),
  extracted_data jsonb not null default '{}'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint allocation_intake_source_ck check (source in ('Manuale','AI','Importazione')),
  constraint allocation_intake_status_ck check (status in ('Bozza','Da verificare','Confermato','Annullato')),
  constraint allocation_intake_amount_ck check (expense_amount is null or expense_amount >= 0)
);

create index if not exists condominium_allocation_intakes_lookup_idx
  on public.condominium_allocation_intakes(workspace_id, condominium_id, status, created_at desc);

alter table public.condominium_allocation_intakes enable row level security;

drop policy if exists "managers manage allocation intakes" on public.condominium_allocation_intakes;
create policy "managers manage allocation intakes"
on public.condominium_allocation_intakes
for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'contabilita'))
with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

drop policy if exists "authorized users read allocation intakes" on public.condominium_allocation_intakes;
create policy "authorized users read allocation intakes"
on public.condominium_allocation_intakes
for select to authenticated
using (private.can_access_workspace_module(workspace_id,'contabilita'));

grant select,insert,update,delete on public.condominium_allocation_intakes to authenticated;

create or replace function public.confirm_allocation_intake(
  p_workspace_id uuid,
  p_intake_id uuid
) returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_intake public.condominium_allocation_intakes%rowtype;
  v_row jsonb;
  v_count integer:=0;
  v_unit_id uuid;
  v_amount numeric;
  v_millesimi numeric;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_intake
  from public.condominium_allocation_intakes
  where id=p_intake_id and workspace_id=p_workspace_id
  for update;

  if not found then raise exception 'Acquisizione riparto non trovata'; end if;
  if v_intake.status='Confermato' then
    return (select count(*) from public.condominium_expense_allocations
      where workspace_id=p_workspace_id and ledger_entry_id=v_intake.ledger_entry_id);
  end if;
  if v_intake.status='Annullato' then raise exception 'L''acquisizione è stata annullata'; end if;
  if v_intake.ledger_entry_id is null then raise exception 'Collegare prima una spesa contabile'; end if;

  if coalesce(jsonb_array_length(v_intake.rows),0)=0 then
    raise exception 'Nessuna quota da confermare';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=v_intake.condominium_id
    and ledger_entry_id=v_intake.ledger_entry_id;

  for v_row in select value from jsonb_array_elements(v_intake.rows) loop
    v_unit_id := nullif(v_row->>'unit_id','')::uuid;
    v_amount := round(coalesce((v_row->>'amount')::numeric,0),2);
    v_millesimi := coalesce((v_row->>'millesimi')::numeric,0);

    if v_unit_id is null or v_amount < 0 or v_millesimi < 0 then
      raise exception 'Riga di riparto non valida';
    end if;

    if not exists(
      select 1 from public.condominium_units
      where id=v_unit_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id
    ) then
      raise exception 'L''unità indicata non appartiene al condominio';
    end if;

    insert into public.condominium_expense_allocations(
      workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,
      member_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
    )
    values(
      p_workspace_id,v_intake.condominium_id,v_intake.ledger_entry_id,v_intake.allocation_table_id,
      v_unit_id,null,
      case when v_intake.source='AI' then 'AI - confermato' else 'Manuale - confermato' end,
      v_millesimi,v_amount,0,
      (select due_date from public.condominium_ledger_entries where id=v_intake.ledger_entry_id),
      'Da pagare',coalesce(v_intake.notes,'')
    );
    v_count:=v_count+1;
  end loop;

  update public.condominium_allocation_intakes
  set status='Confermato', confirmed_by=auth.uid(), confirmed_at=now(), updated_at=now()
  where id=p_intake_id and workspace_id=p_workspace_id;

  return v_count;
end;
$$;

grant execute on function public.confirm_allocation_intake(uuid,uuid) to authenticated;
