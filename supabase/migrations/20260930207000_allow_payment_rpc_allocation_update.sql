-- BETHAG: allow paid_amount changes only inside the payment RPC.
create or replace function public.guard_expense_allocation_integrity()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
  if tg_op='DELETE' then
    if coalesce(old.paid_amount,0)>0.005 then raise exception 'La ripartizione ha pagamenti registrati e non può essere cancellata'; end if;
    if exists(select 1 from public.condominium_installments i where i.workspace_id=old.workspace_id and i.condominium_id=old.condominium_id and i.ledger_entry_id=old.ledger_entry_id and (i.unit_id is not distinct from old.unit_id)) then
      raise exception 'La ripartizione è collegata a rate e non può essere cancellata';
    end if;
    return old;
  end if;
  if tg_op='UPDATE' then
    if new.paid_amount is distinct from old.paid_amount and current_setting('bethag.allow_allocation_paid_update',true) is distinct from 'on' then
      raise exception 'Il pagato della ripartizione viene aggiornato esclusivamente dai movimenti di pagamento';
    end if;
    if coalesce(old.paid_amount,0)>0.005 and (new.amount is distinct from old.amount or new.unit_id is distinct from old.unit_id or new.ledger_entry_id is distinct from old.ledger_entry_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then
      raise exception 'Una ripartizione con pagamenti registrati non può essere scollegata o modificata nei dati contabili';
    end if;
    if exists(select 1 from public.condominium_installments i where i.workspace_id=old.workspace_id and i.condominium_id=old.condominium_id and i.ledger_entry_id=old.ledger_entry_id and (i.unit_id is not distinct from old.unit_id))
       and (new.amount is distinct from old.amount or new.unit_id is distinct from old.unit_id or new.ledger_entry_id is distinct from old.ledger_entry_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then
      raise exception 'Una ripartizione collegata a rate non può essere scollegata o modificata nei dati contabili';
    end if;
  end if;
  return new;
end; $$;

-- Replace the payment RPC with the same hardened implementation plus a transaction-local
-- capability flag consumed only by the allocation integrity trigger.
create or replace function public.register_condominium_installment_payment(
 p_workspace_id uuid,p_condominium_id uuid,p_installment_id uuid,p_payment_date date,
 p_amount numeric,p_method text default 'Bonifico',p_reference text default '',p_notes text default ''
) returns numeric language plpgsql security definer set search_path=public,pg_catalog as $function$
declare
 v_installment public.condominium_installments%rowtype;
 v_new_paid numeric; v_status text; v_year_status text; v_start date; v_end date;
 v_allocation public.condominium_expense_allocations%rowtype; v_residual numeric;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
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
 v_residual:=round(v_installment.amount-coalesce(v_installment.paid_amount,0),2);
 if v_residual<=0.005 then raise exception 'La rata risulta già completamente pagata'; end if;
 if round(p_amount::numeric,2)>v_residual+0.005 then raise exception 'Il pagamento supera il residuo della rata: residuo %',to_char(v_residual,'FM999999990.00'); end if;
 v_new_paid:=round(coalesce(v_installment.paid_amount,0)+round(p_amount::numeric,2),2);
 if v_new_paid>=v_installment.amount-0.005 then v_new_paid:=round(v_installment.amount::numeric,2); v_status:='Pagato';
 elsif v_new_paid>0 then v_status:='Parzialmente pagato'; else v_status:='Da pagare'; end if;
 insert into public.condominium_payment_movements(workspace_id,condominium_id,installment_id,payment_date,amount,method,reference,notes)
 values(p_workspace_id,p_condominium_id,p_installment_id,p_payment_date,round(p_amount::numeric,2),coalesce(nullif(trim(coalesce(p_method,'')),''),'Bonifico'),trim(coalesce(p_reference,'')),trim(coalesce(p_notes,'')));
 update public.condominium_installments set paid_amount=v_new_paid,status=v_status where id=p_installment_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
 perform set_config('bethag.allow_allocation_paid_update','on',true);
 if v_installment.ledger_entry_id is not null and v_installment.unit_id is not null then
   for v_allocation in select a.* from public.condominium_expense_allocations a where a.workspace_id=p_workspace_id and a.condominium_id=p_condominium_id and a.ledger_entry_id=v_installment.ledger_entry_id and a.unit_id=v_installment.unit_id for update loop
     select least(v_allocation.amount,coalesce(sum(i.paid_amount),0)) into v_new_paid from public.condominium_installments i where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.ledger_entry_id=v_installment.ledger_entry_id and i.unit_id=v_installment.unit_id;
     update public.condominium_expense_allocations a set paid_amount=v_new_paid,status=case when v_new_paid>=a.amount-0.005 then 'Pagato' when v_new_paid>0 then 'Parzialmente pagato' else 'Da pagare' end where a.id=v_allocation.id;
   end loop;
 end if;
 return v_new_paid;
end; $function$;
revoke all on function public.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) from public;
grant execute on function public.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) to authenticated;
