-- Reconcile accounting RLS with production.

-- Restore manager CRUD + RLS for accounting tables.

do $$
declare t text;
begin
  foreach t in array array['condominium_expense_allocations','condominium_fiscal_years','condominium_installments','condominium_ledger_entries','condominium_payment_movements'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Expense allocations
 drop policy if exists "Managers can delete condominium_expense_allocations" on public.condominium_expense_allocations;
 drop policy if exists "Managers can insert condominium_expense_allocations" on public.condominium_expense_allocations;
 drop policy if exists "Managers can read condominium_expense_allocations" on public.condominium_expense_allocations;
 drop policy if exists "Managers can update condominium_expense_allocations" on public.condominium_expense_allocations;
 create policy "Managers can delete condominium_expense_allocations" on public.condominium_expense_allocations for delete to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can insert condominium_expense_allocations" on public.condominium_expense_allocations for insert to authenticated with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can read condominium_expense_allocations" on public.condominium_expense_allocations for select to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can update condominium_expense_allocations" on public.condominium_expense_allocations for update to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita')) with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

-- Fiscal years
 drop policy if exists "Managers can delete condominium_fiscal_years" on public.condominium_fiscal_years;
 drop policy if exists "Managers can insert condominium_fiscal_years" on public.condominium_fiscal_years;
 drop policy if exists "Managers can read condominium_fiscal_years" on public.condominium_fiscal_years;
 drop policy if exists "Managers can update condominium_fiscal_years" on public.condominium_fiscal_years;
 create policy "Managers can delete condominium_fiscal_years" on public.condominium_fiscal_years for delete to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can insert condominium_fiscal_years" on public.condominium_fiscal_years for insert to authenticated with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can read condominium_fiscal_years" on public.condominium_fiscal_years for select to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can update condominium_fiscal_years" on public.condominium_fiscal_years for update to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita')) with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

-- Installments
 drop policy if exists "Managers can delete condominium_installments" on public.condominium_installments;
 drop policy if exists "Managers can insert condominium_installments" on public.condominium_installments;
 drop policy if exists "Managers can read condominium_installments" on public.condominium_installments;
 drop policy if exists "Managers can update condominium_installments" on public.condominium_installments;
 create policy "Managers can delete condominium_installments" on public.condominium_installments for delete to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can insert condominium_installments" on public.condominium_installments for insert to authenticated with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can read condominium_installments" on public.condominium_installments for select to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can update condominium_installments" on public.condominium_installments for update to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita')) with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

-- Ledger entries
 drop policy if exists "Managers can delete condominium_ledger_entries" on public.condominium_ledger_entries;
 drop policy if exists "Managers can insert condominium_ledger_entries" on public.condominium_ledger_entries;
 drop policy if exists "Managers can read condominium_ledger_entries" on public.condominium_ledger_entries;
 drop policy if exists "Managers can update condominium_ledger_entries" on public.condominium_ledger_entries;
 create policy "Managers can delete condominium_ledger_entries" on public.condominium_ledger_entries for delete to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can insert condominium_ledger_entries" on public.condominium_ledger_entries for insert to authenticated with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can read condominium_ledger_entries" on public.condominium_ledger_entries for select to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can update condominium_ledger_entries" on public.condominium_ledger_entries for update to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita')) with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

-- Payment movements
 drop policy if exists "Managers can delete condominium_payment_movements" on public.condominium_payment_movements;
 drop policy if exists "Managers can insert condominium_payment_movements" on public.condominium_payment_movements;
 drop policy if exists "Managers can read condominium_payment_movements" on public.condominium_payment_movements;
 drop policy if exists "Managers can update condominium_payment_movements" on public.condominium_payment_movements;
 create policy "Managers can delete condominium_payment_movements" on public.condominium_payment_movements for delete to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can insert condominium_payment_movements" on public.condominium_payment_movements for insert to authenticated with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can read condominium_payment_movements" on public.condominium_payment_movements for select to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita'));
 create policy "Managers can update condominium_payment_movements" on public.condominium_payment_movements for update to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita')) with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

-- Carryover management policy must use module authorization, not the broader manager predicate.
drop policy if exists "managers manage fiscal carryovers" on public.condominium_fiscal_carryovers;
create policy "managers manage fiscal carryovers" on public.condominium_fiscal_carryovers for all to authenticated using (private.can_manage_workspace_module(workspace_id,'contabilita')) with check (private.can_manage_workspace_module(workspace_id,'contabilita'));

-- Match production: carryover compensations are manager-readable/inserted by privileged RPCs, not directly insertable through RLS.
drop policy if exists "carryover compensations managers insert" on public.condominium_fiscal_carryover_compensations;
