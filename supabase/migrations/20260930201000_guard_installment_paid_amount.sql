-- BETHAG: installment paid_amount is controlled only by the payment RPC.
create or replace function public.guard_installment_paid_amount_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.paid_amount is distinct from old.paid_amount then
    raise exception 'Il totale pagato della rata può essere modificato esclusivamente tramite la registrazione di un movimento di pagamento';
  end if;

  if tg_op = 'UPDATE'
     and coalesce(old.paid_amount,0) > 0
     and (
       new.amount is distinct from old.amount
       or new.unit_id is distinct from old.unit_id
       or new.ledger_entry_id is distinct from old.ledger_entry_id
       or new.fiscal_year_id is distinct from old.fiscal_year_id
       or new.condominium_id is distinct from old.condominium_id
       or new.workspace_id is distinct from old.workspace_id
     ) then
    raise exception 'Una rata con pagamenti registrati non può modificare importo, unità, esercizio o collegamento contabile';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_installment_paid_amount on public.condominium_installments;

create trigger trg_guard_installment_paid_amount
before update on public.condominium_installments
for each row
execute function public.guard_installment_paid_amount_update();

revoke all on function public.guard_installment_paid_amount_update() from public;
grant execute on function public.guard_installment_paid_amount_update() to authenticated;
