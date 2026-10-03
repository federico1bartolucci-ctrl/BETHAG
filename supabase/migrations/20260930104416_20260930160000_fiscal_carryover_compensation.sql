create table if not exists public.condominium_fiscal_carryover_compensations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  carryover_id uuid not null references public.condominium_fiscal_carryovers(id) on delete restrict,
  target_installment_id uuid null references public.condominium_installments(id) on delete restrict,
  amount numeric not null,
  notes text not null default '',
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint condominium_fiscal_carryover_compensations_amount_positive check (amount > 0)
);
alter table public.condominium_fiscal_carryover_compensations enable row level security;
drop policy if exists "carryover compensations managers select" on public.condominium_fiscal_carryover_compensations;
drop policy if exists "carryover compensations managers insert" on public.condominium_fiscal_carryover_compensations;
create policy "carryover compensations managers select" on public.condominium_fiscal_carryover_compensations
for select to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
create policy "carryover compensations managers insert" on public.condominium_fiscal_carryover_compensations
for insert to authenticated with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

create or replace function public.compensate_fiscal_carryover(
  p_workspace_id uuid,p_condominium_id uuid,p_carryover_id uuid,p_amount numeric,
  p_target_installment_id uuid default null,p_notes text default ''
) returns numeric language plpgsql security invoker set search_path=public as $function$
declare
 v_c public.condominium_fiscal_carryovers%rowtype;
 v_amount numeric; v_remaining numeric; v_new_balance numeric;
 v_target public.condominium_installments%rowtype;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
 if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 then raise exception 'L''importo della compensazione deve essere maggiore di zero'; end if;
 if not exists(select 1 from public.condominiums c where c.id=p_condominium_id) then raise exception 'Condominio non trovato'; end if;
 select * into v_c from public.condominium_fiscal_carryovers
 where id=p_carryover_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
 if not found then raise exception 'Partita riportata non trovata'; end if;
 if v_c.kind not in ('Debito','Credito') then raise exception 'Tipo di partita riportata non valido'; end if;
 if v_c.status='Compensato' then raise exception 'La partita riportata è già completamente compensata'; end if;
 v_remaining:=round(abs(v_c.balance::numeric),2); v_amount:=round(p_amount::numeric,2);
 if v_remaining<=0.005 then raise exception 'La partita riportata non ha più un residuo compensabile'; end if;
 if v_amount>v_remaining+0.005 then raise exception 'La compensazione supera il residuo della partita: residuo %',to_char(v_remaining,'FM999999990.00'); end if;
 if p_target_installment_id is not null then
   select * into v_target from public.condominium_installments
   where id=p_target_installment_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
   if not found then raise exception 'Rata di destinazione non trovata'; end if;
   if v_c.unit_id is distinct from v_target.unit_id then raise exception 'La rata di destinazione deve appartenere alla stessa unità della partita riportata'; end if;
   if v_target.status='Pagato' or round(v_target.amount-v_target.paid_amount,2)<=0.005 then raise exception 'La rata di destinazione è già completamente pagata'; end if;
   if v_amount>round(v_target.amount-v_target.paid_amount,2)+0.005 then raise exception 'La compensazione supera il residuo della rata di destinazione'; end if;
 end if;
 insert into public.condominium_fiscal_carryover_compensations(workspace_id,condominium_id,carryover_id,target_installment_id,amount,notes,created_by)
 values(p_workspace_id,p_condominium_id,p_carryover_id,p_target_installment_id,v_amount,trim(coalesce(p_notes,'')),auth.uid());
 if v_c.kind='Debito' then v_new_balance:=round(abs(v_c.balance)-v_amount,2);
 else v_new_balance:=-round(abs(v_c.balance)-v_amount,2); end if;
 if abs(v_new_balance)<=0.005 then
   v_new_balance:=0;
   update public.condominium_fiscal_carryovers set balance=0,status='Compensato',updated_at=now() where id=v_c.id;
 else
   update public.condominium_fiscal_carryovers set balance=v_new_balance,status='Parzialmente compensato',updated_at=now() where id=v_c.id;
 end if;
 return v_new_balance;
end;
$function$;
grant execute on function public.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) to authenticated;