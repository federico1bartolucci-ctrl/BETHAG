-- Harden accounting RLS: collaborators need the explicit contabilita permission
-- for mutations on accounting tables. Read-only policies for authorized users
-- are intentionally left unchanged.

do $$
declare
  r record;
  using_expr text := 'private.can_manage_workspace_module(workspace_id, ''contabilita'')';
begin
  for r in
    select tablename, policyname, cmd
    from pg_policies
    where schemaname='public'
      and tablename in (
        'condominium_budgets',
        'condominium_expense_allocations',
        'condominium_fiscal_years',
        'condominium_funds',
        'condominium_installments',
        'condominium_ledger_entries',
        'condominium_legal_cases',
        'condominium_millesimal_tables',
        'condominium_millesimal_values',
        'condominium_payment_movements',
        'condominium_tax_obligations'
      )
      and (
        coalesce(qual,'') ilike '%private.is_workspace_manager%'
        or coalesce(with_check,'') ilike '%private.is_workspace_manager%'
      )
  loop
    if r.cmd in ('ALL','UPDATE') then
      execute format(
        'alter policy %I on public.%I using (%s) with check (%s)',
        r.policyname, r.tablename, using_expr, using_expr
      );
    elsif r.cmd in ('SELECT','DELETE') then
      execute format(
        'alter policy %I on public.%I using (%s)',
        r.policyname, r.tablename, using_expr
      );
    elsif r.cmd = 'INSERT' then
      execute format(
        'alter policy %I on public.%I with check (%s)',
        r.policyname, r.tablename, using_expr
      );
    end if;
  end loop;
end $$;
