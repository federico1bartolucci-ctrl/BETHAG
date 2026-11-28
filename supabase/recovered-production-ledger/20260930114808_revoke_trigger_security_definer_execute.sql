-- Trigger-only SECURITY DEFINER functions must not be exposed through PostgREST RPC.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.guard_consumption_reading_integrity()',
    'public.guard_expense_allocation_integrity()',
    'public.guard_fiscal_year_opening_balance()',
    'public.guard_fund_integrity()',
    'public.guard_unit_scope_changes()',
    'public.prevent_fiscal_year_delete()',
    'public.validate_allocation_rule_scope()'
  ] loop
    execute format('revoke all on function %s from public', fn);
  end loop;
end $$;