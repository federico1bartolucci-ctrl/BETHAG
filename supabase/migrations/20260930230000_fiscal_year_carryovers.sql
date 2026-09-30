-- Fiscal year individual credits/debts carried forward.
create table if not exists public.condominium_fiscal_carryovers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  source_fiscal_year_id uuid not null,
  target_fiscal_year_id uuid not null,
  unit_id uuid,
  member_id uuid,
  balance numeric(14,2) not null,
  kind text not null check (kind in ('Debito','Credito')),
  status text not null default 'Da riportare' check (status in ('Da riportare','Parzialmente compensato','Compensato')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_carryovers_balance_nonzero check (abs(balance) >= 0.01),
  constraint fiscal_carryovers_balance_kind check ((kind='Debito' and balance>0) or (kind='Credito' and balance<0)),
  constraint fiscal_carryovers_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint fiscal_carryovers_condominium_fk foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  constraint fiscal_carryovers_source_year_fk foreign key (source_fiscal_year_id) references public.condominium_fiscal_years(id) on delete restrict,
  constraint fiscal_carryovers_target_year_fk foreign key (target_fiscal_year_id) references public.condominium_fiscal_years(id) on delete restrict,
  constraint fiscal_carryovers_unit_fk foreign key (unit_id) references public.condominium_units(id) on delete restrict,
  constraint fiscal_carryovers_member_fk foreign key (member_id) references public.condominium_members(id) on delete set null
);
create index if not exists condominium_fiscal_carryovers_target_idx on public.condominium_fiscal_carryovers(workspace_id, condominium_id, target_fiscal_year_id);
create index if not exists condominium_fiscal_carryovers_unit_idx on public.condominium_fiscal_carryovers(unit_id);
alter table public.condominium_fiscal_carryovers enable row level security;
drop policy if exists "managers manage fiscal carryovers" on public.condominium_fiscal_carryovers;
create policy "managers manage fiscal carryovers" on public.condominium_fiscal_carryovers for all to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
drop policy if exists "authorized users read fiscal carryovers" on public.condominium_fiscal_carryovers;
create policy "authorized users read fiscal carryovers" on public.condominium_fiscal_carryovers for select to authenticated using (private.can_access_workspace_module(workspace_id,'contabilita'));

create or replace function public.generate_fiscal_year_carryovers(p_workspace_id uuid,p_condominium_id uuid,p_source_fiscal_year_id uuid,p_target_fiscal_year_id uuid)
returns integer language plpgsql security invoker set search_path to public as $$
declare v_source public.condominium_fiscal_years%rowtype; v_target public.condominium_fiscal_years%rowtype; v_count integer:=0;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
 select * into v_source from public.condominium_fiscal_years where id=p_source_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
 if not found then raise exception 'Esercizio di origine non trovato'; end if;
 select * into v_target from public.condominium_fiscal_years where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
 if not found then raise exception 'Esercizio di destinazione non trovato'; end if;
 if v_source.status<>'Chiuso' then raise exception 'L''esercizio di origine deve essere chiuso'; end if;
 if v_target.id=v_source.id then raise exception 'Gli esercizi devono essere diversi'; end if;
 delete from public.condominium_fiscal_carryovers where workspace_id=p_workspace_id and condominium_id=p_condominium_id and source_fiscal_year_id=p_source_fiscal_year_id and target_fiscal_year_id=p_target_fiscal_year_id;
 insert into public.condominium_fiscal_carryovers(workspace_id,condominium_id,source_fiscal_year_id,target_fiscal_year_id,unit_id,member_id,balance,kind,status,notes)
 select p_workspace_id,p_condominium_id,p_source_fiscal_year_id,p_target_fiscal_year_id,q.unit_id,q.member_id,q.balance,case when q.balance>0 then 'Debito' else 'Credito' end,'Da riportare','Saldo individuale riportato dall''esercizio '||v_source.name
 from (
   select i.unit_id,max(i.member_id) as member_id,round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2) as balance
   from public.condominium_installments i
   left join (select installment_id,sum(amount) as total_paid from public.condominium_payment_movements where workspace_id=p_workspace_id and condominium_id=p_condominium_id group by installment_id) pm on pm.installment_id=i.id
   where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.fiscal_year_id=p_source_fiscal_year_id
   group by i.unit_id
   having abs(round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2))>=0.01
 ) q;
 get diagnostics v_count=row_count;
 return v_count;
end; $$;
grant execute on function public.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) to authenticated;

-- Permit intentional overpayments: the installment itself is capped at its due amount,
-- while the full payment movement is retained and the excess becomes a carried credit.
create or replace function public.register_condominium_installment_payment(p_workspace_id uuid,p_condominium_id uuid,p_installment_id uuid,p_payment_date date,p_amount numeric,p_method text default 'Bonifico',p_reference text default '',p_notes text default '')
returns numeric language plpgsql set search_path to public as $$
declare v_installment public.condominium_installments%rowtype; v_new_paid numeric; v_status text; v_year_status text; v_start date; v_end date; v_allocation public.condominium_expense_allocations%rowtype;
begin
 if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 then raise exception 'L''importo del pagamento deve essere maggiore di zero'; end if;
 if p_payment_date is null then raise exception 'La data del pagamento è obbligatoria'; end if;
 select * into v_installment from public.condominium_installments where id=p_installment_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
 if not found then raise exception 'Rata non trovata o non appartenente al condominio'; end if;
 if v_installment.fiscal_year_id is not null then
  select status,start_date,end_date into v_year_status,v_start,v_end from public.condominium_fiscal_years where id=v_installment.fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
  if not found then raise exception 'Esercizio contabile della rata non valido'; end if;
  if v_year_status='Chiuso' then raise exception 'L''esercizio contabile è chiuso e non può essere modificato'; end if;
  if p_payment_date<v_start or p_payment_date>v_end then raise exception 'La data del pagamento non rientra nell''esercizio contabile della rata'; end if;
 end if;
 if v_installment.amount is null or v_installment.amount<=0 then raise exception 'Importo della rata non valido'; end if;
 if coalesce(v_installment.paid_amount,0)<0 or coalesce(v_installment.paid_amount,0)>v_installment.amount then raise exception 'Importo già pagato della rata non valido'; end if;
 v_new_paid:=least(round(v_installment.amount::numeric,2),round((coalesce(v_installment.paid_amount,0)+p_amount)::numeric,2));
 if abs(v_new_paid-v_installment.amount)<=0.005 then v_new_paid:=round(v_installment.amount::numeric,2); v_status:='Pagato'; elsif v_new_paid>0 then v_status:='Parzialmente pagato'; else v_status:='Da pagare'; end if;
 insert into public.condominium_payment_movements(workspace_id,condominium_id,installment_id,payment_date,amount,method,reference,notes) values (p_workspace_id,p_condominium_id,p_installment_id,p_payment_date,round(p_amount::numeric,2),coalesce(nullif(trim(coalesce(p_method,'')),''),'Bonifico'),trim(coalesce(p_reference,'')),trim(coalesce(p_notes,'')));
 update public.condominium_installments set paid_amount=v_new_paid,status=v_status where id=p_installment_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
 if v_installment.ledger_entry_id is not null and v_installment.unit_id is not null then
  for v_allocation in select a.* from public.condominium_expense_allocations a where a.workspace_id=p_workspace_id and a.condominium_id=p_condominium_id and a.ledger_entry_id=v_installment.ledger_entry_id and a.unit_id=v_installment.unit_id for update loop
   select least(v_allocation.amount,coalesce(sum(i.paid_amount),0)) into v_new_paid from public.condominium_installments i where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.ledger_entry_id=v_installment.ledger_entry_id and i.unit_id=v_installment.unit_id;
   update public.condominium_expense_allocations a set paid_amount=v_new_paid,status=case when v_new_paid>=a.amount-0.005 then 'Pagato' when v_new_paid>0 then 'Parzialmente pagato' else 'Da pagare' end where a.id=v_allocation.id;
  end loop;
 end if;
 return v_new_paid;
end; $$;
