-- Preserve the full incoming payment movement while capping the installment balance.
-- This aligns the payment reconciliation trigger with the overpayment-credit behavior
-- introduced by generate/register payment routines. No database is modified by this
-- repository migration until it is explicitly applied by the project operator.

do $migration$
declare
  v_signature regprocedure := 'public.sync_condominium_installment_from_payments()'::regprocedure;
  v_definition text;
  v_old text := 'if v_paid > v_amount + 0.005 then raise exception ''I pagamenti della rata superano l''''importo della rata.''; end if;';
  v_new text := 'v_paid := least(v_paid, v_amount);';
begin
  select pg_get_functiondef(v_signature) into v_definition;
  if position(v_old in v_definition) > 0 then
    if length(v_definition) - length(replace(v_definition, v_old, '')) <> length(v_old) then
      raise exception 'La guardia di overpayment compare più di una volta nella funzione di riconciliazione';
    end if;
    v_definition := replace(v_definition, v_old, v_new);
    execute v_definition;
  elsif position(v_new in v_definition) > 0 then
    raise notice 'La funzione di riconciliazione limita già il pagato all''importo della rata';
  else
    raise exception 'Definizione inattesa di public.sync_condominium_installment_from_payments(); revisione manuale richiesta';
  end if;
end
$migration$;
