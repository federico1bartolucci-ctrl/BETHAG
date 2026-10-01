create table if not exists public.condominium_payment_reversal_audit (
  id uuid primary key default gen_random_uuid(),
  original_payment_id uuid not null unique,
  workspace_id uuid not null,
  condominium_id uuid not null,
  installment_id uuid not null,
  amount numeric not null check (amount > 0),
  payment_date date not null,
  method text not null default 'Bonifico',
  reference text not null default '',
  notes text not null default '',
  reversal_reason text not null,
  reversed_at timestamptz not null default now(),
  reversed_by uuid not null
);

alter table public.condominium_payment_reversal_audit enable row level security;

drop policy if exists "Managers can read payment reversal audit" on public.condominium_payment_reversal_audit;
create policy "Managers can read payment reversal audit"
on public.condominium_payment_reversal_audit
for select to authenticated
using (private.can_manage_workspace_module(workspace_id,'contabilita'));

grant select on public.condominium_payment_reversal_audit to authenticated;
revoke insert,update,delete on public.condominium_payment_reversal_audit from authenticated,anon;

create or replace function public.sync_condominium_installment_from_payments()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_installment_id uuid; v_workspace_id uuid; v_condominium_id uuid;
  v_amount numeric; v_paid numeric; v_status text; v_due_date date;
  v_unit_id uuid; v_member_id uuid; v_owner_user_id uuid; v_owner_email text;
  v_remaining numeric; v_allocation public.condominium_expense_allocations%rowtype; v_target numeric;
begin
  v_installment_id := coalesce(new.installment_id, old.installment_id);
  v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  v_condominium_id := coalesce(new.condominium_id, old.condominium_id);

  select amount,due_date,unit_id,member_id into v_amount,v_due_date,v_unit_id,v_member_id
  from public.condominium_installments
  where id=v_installment_id and workspace_id=v_workspace_id and condominium_id=v_condominium_id
  for update;
  if not found then return coalesce(new,old); end if;

  select round(coalesce(sum(amount),0)::numeric,2) into v_paid
  from public.condominium_payment_movements
  where installment_id=v_installment_id and workspace_id=v_workspace_id and condominium_id=v_condominium_id;

  if v_paid > v_amount + 0.005 then raise exception 'I pagamenti della rata superano l''importo della rata.'; end if;
  if v_paid >= v_amount - 0.005 then v_paid:=round(v_amount::numeric,2); v_status:='Pagato';
  elsif v_paid>0 then v_status:='Parzialmente pagato';
  elsif v_due_date<current_date then v_status:='Scaduto';
  else v_status:='Da pagare'; end if;

  perform set_config('bethag.allow_installment_paid_update','on',true);
  update public.condominium_installments set paid_amount=v_paid,status=v_status
  where id=v_installment_id and workspace_id=v_workspace_id and condominium_id=v_condominium_id;

  perform set_config('bethag.allow_allocation_paid_update','on',true);

  if v_unit_id is null and v_member_id is not null then
    select cm.user_id,nullif(lower(trim(cm.email)),'') into v_owner_user_id,v_owner_email
    from public.condominium_members cm
    where cm.id=v_member_id and cm.condominium_id=v_condominium_id and cm.active
      and trim(coalesce(cm.data->>'role',''))='Proprietario';

    if found then
      v_remaining:=v_paid;
      for v_allocation in
        select a.* from public.condominium_expense_allocations a
        where a.workspace_id=v_workspace_id and a.condominium_id=v_condominium_id
          and a.ledger_entry_id=(select i.ledger_entry_id from public.condominium_installments i where i.id=v_installment_id)
          and exists (
            select 1 from public.condominium_members cm
            where cm.condominium_id=v_condominium_id and cm.unit_id=a.unit_id and cm.active
              and trim(coalesce(cm.data->>'role',''))='Proprietario'
              and ((v_owner_user_id is not null and cm.user_id=v_owner_user_id)
                or (v_owner_user_id is null and nullif(lower(trim(cm.email)),'') is not null and nullif(lower(trim(cm.email)),'')=v_owner_email))
          )
        order by a.id for update
      loop
        v_target:=least(round(coalesce(v_allocation.amount,0),2),greatest(round(v_remaining,2),0));
        update public.condominium_expense_allocations
        set paid_amount=v_target,status=case when v_target>=amount-0.005 then 'Pagato' when v_target>0 then 'Parzialmente pagato' else 'Da pagare' end
        where id=v_allocation.id;
        v_remaining:=round(v_remaining-v_target,2); exit when v_remaining<=0.005;
      end loop;
    end if;
  else
    update public.condominium_expense_allocations a
    set paid_amount=v_paid,status=case when v_paid>=a.amount-0.005 then 'Pagato' when v_paid>0 then 'Parzialmente pagato' else 'Da pagare' end
    where a.workspace_id=v_workspace_id and a.condominium_id=v_condominium_id and a.unit_id=v_unit_id
      and ((v_member_id is not null and a.member_id=v_member_id) or (v_member_id is null and a.member_id is null))
      and a.ledger_entry_id=(select i.ledger_entry_id from public.condominium_installments i where i.id=v_installment_id);
  end if;
  return coalesce(new,old);
end;
$function$;

create or replace function private.reverse_condominium_installment_payment(
  p_workspace_id uuid,p_condominium_id uuid,p_payment_id uuid,p_reason text
)
returns boolean language plpgsql security definer set search_path=public,pg_catalog
as $function$
declare v_payment public.condominium_payment_movements%rowtype; v_year_status text; v_actor uuid;
begin
  v_actor:=auth.uid();
  if v_actor is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'La motivazione dello storno è obbligatoria'; end if;

  select * into v_payment from public.condominium_payment_movements
  where id=p_payment_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Pagamento non trovato o non appartenente al condominio'; end if;

  select fy.status into v_year_status
  from public.condominium_installments i left join public.condominium_fiscal_years fy on fy.id=i.fiscal_year_id
  where i.id=v_payment.installment_id and i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id;
  if v_year_status='Chiuso' then raise exception 'L''esercizio contabile è chiuso: storno non consentito'; end if;

  if exists(select 1 from public.condominium_payment_reversal_audit where original_payment_id=v_payment.id) then
    raise exception 'Il pagamento è già stato stornato';
  end if;

  insert into public.condominium_payment_reversal_audit(
    original_payment_id,workspace_id,condominium_id,installment_id,amount,payment_date,method,reference,notes,reversal_reason,reversed_by
  ) values (
    v_payment.id,v_payment.workspace_id,v_payment.condominium_id,v_payment.installment_id,v_payment.amount,v_payment.payment_date,
    v_payment.method,v_payment.reference,v_payment.notes,trim(p_reason),v_actor
  );
  delete from public.condominium_payment_movements where id=v_payment.id;
  return true;
end;
$function$;

create or replace function public.reverse_condominium_installment_payment(
  p_workspace_id uuid,p_condominium_id uuid,p_payment_id uuid,p_reason text
)
returns boolean language sql security invoker set search_path=''
as $function$ select private.reverse_condominium_installment_payment($1,$2,$3,$4); $function$;

revoke execute on function private.reverse_condominium_installment_payment(uuid,uuid,uuid,text) from anon,public;
revoke execute on function public.reverse_condominium_installment_payment(uuid,uuid,uuid,text) from anon,public;
grant execute on function public.reverse_condominium_installment_payment(uuid,uuid,uuid,text) to authenticated;
