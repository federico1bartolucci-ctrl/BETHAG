-- Validate that the earlier transfer-close migration installed the unit-level unpaid installment guard.
-- This migration intentionally does not rewrite the function a second time.
do $migration$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);
  if position('v_open_unit_installments' in v_def)=0
     or position('into v_open_unit_installments' in v_def)=0
     or position('or v_open_unit_installments>0.005' in v_def)=0
     or position('i.member_id is null and i.amount-i.paid_amount>0.005' in v_def)=0 then
    raise exception 'Unit-level unpaid installment close guard is missing; refusing migration';
  end if;
end
$migration$;
