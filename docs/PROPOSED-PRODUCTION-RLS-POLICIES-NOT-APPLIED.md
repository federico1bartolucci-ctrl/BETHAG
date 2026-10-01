# Proposta policy RLS — non applicata

**Origine:** vista `pg_policies` di Supabase Production, lettura del 1 ottobre 2026. Sono state estratte **62 policy** sulle 27 tabelle mancanti in sviluppo. Il contenuto riproduce ruoli, comando, predicati `USING` e `WITH CHECK` così come esposti dai cataloghi.

Questa proposta deve essere confrontata con le funzioni helper e i grants effettivi. Non applicare prima di verificare che le tabelle, i ruoli e tutte le funzioni citate esistano e siano sicure; le policy permissive si combinano tra loro e un loro duplicato o una policy mancante può modificare l'accesso ai dati.

## SQL estratto

```sql
-- PROPOSTA NON APPLICATA: policy RLS estratte dai cataloghi Production
-- Rivedere in relazione a helper function, grants e permessi applicativi.
alter table public.condominium_fiscal_years enable row level security;
alter table public.condominium_ledger_entries enable row level security;
alter table public.condominium_funds enable row level security;
alter table public.condominium_expense_allocations enable row level security;
alter table public.condominium_tax_obligations enable row level security;
alter table public.condominium_legal_cases enable row level security;
alter table public.condominium_millesimal_tables enable row level security;
alter table public.condominium_millesimal_values enable row level security;
alter table public.condominium_installments enable row level security;
alter table public.condominium_payment_movements enable row level security;
alter table public.condominium_budgets enable row level security;
alter table public.condominium_register_items enable row level security;
alter table public.condominium_suppliers enable row level security;
alter table public.condominium_works enable row level security;
alter table public.condominium_work_documents enable row level security;
alter table public.condominium_work_progress enable row level security;
alter table public.condominium_work_events enable row level security;
alter table public.condominium_audit_log enable row level security;
alter table public.condominium_fiscal_carryovers enable row level security;
alter table public.condominium_accounting_settings enable row level security;
alter table public.condominium_allocation_rules enable row level security;
alter table public.condominium_consumption_readings enable row level security;
alter table public.condominium_allocation_intakes enable row level security;
alter table public.condominium_fiscal_carryover_compensations enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.condominium_payment_reversal_audit enable row level security;
alter table public.condominium_member_transfers enable row level security;

create policy "authorized managers manage communication recipients" on public.communication_recipients
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text));

create policy "recipients read own communication delivery" on public.communication_recipients
  as permissive for select to "authenticated"
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "authorized users read accounting settings" on public.condominium_accounting_settings
  as permissive for select to "authenticated"
  using (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

create policy "managers manage accounting settings" on public.condominium_accounting_settings
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "authorized users read allocation intakes" on public.condominium_allocation_intakes
  as permissive for select to "authenticated"
  using (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

create policy "managers manage allocation intakes" on public.condominium_allocation_intakes
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "authorized users read allocation rules" on public.condominium_allocation_rules
  as permissive for select to "authenticated"
  using (( SELECT private.can_access_workspace_module(condominium_allocation_rules.workspace_id, 'contabilita'::text) AS can_access_workspace_module));

create policy "managers manage allocation rules" on public.condominium_allocation_rules
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "condominium_audit_log_read_manager" on public.condominium_audit_log
  as permissive for select to public
  using (private.is_workspace_manager(workspace_id));

create policy "condominium_budgets_manager_all" on public.condominium_budgets
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "authorized users read consumption readings" on public.condominium_consumption_readings
  as permissive for select to "authenticated"
  using (( SELECT private.can_access_workspace_module(condominium_consumption_readings.workspace_id, 'contabilita'::text) AS can_access_workspace_module));

create policy "managers manage consumption readings" on public.condominium_consumption_readings
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_expense_allocations" on public.condominium_expense_allocations
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_expense_allocations" on public.condominium_expense_allocations
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_expense_allocations" on public.condominium_expense_allocations
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_expense_allocations" on public.condominium_expense_allocations
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "carryover compensations managers select" on public.condominium_fiscal_carryover_compensations
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "authorized users read fiscal carryovers" on public.condominium_fiscal_carryovers
  as permissive for select to "authenticated"
  using (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_fiscal_years" on public.condominium_fiscal_years
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_fiscal_years" on public.condominium_fiscal_years
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_fiscal_years" on public.condominium_fiscal_years
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_fiscal_years" on public.condominium_fiscal_years
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_funds" on public.condominium_funds
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_funds" on public.condominium_funds
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_funds" on public.condominium_funds
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_funds" on public.condominium_funds
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_installments" on public.condominium_installments
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_installments" on public.condominium_installments
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_installments" on public.condominium_installments
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_installments" on public.condominium_installments
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_ledger_entries" on public.condominium_ledger_entries
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_ledger_entries" on public.condominium_ledger_entries
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_ledger_entries" on public.condominium_ledger_entries
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_ledger_entries" on public.condominium_ledger_entries
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_legal_cases" on public.condominium_legal_cases
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_legal_cases" on public.condominium_legal_cases
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_legal_cases" on public.condominium_legal_cases
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_legal_cases" on public.condominium_legal_cases
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "condominium_member_transfers_manager_all" on public.condominium_member_transfers
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'condomini'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

create policy "Managers can delete condominium_millesimal_tables" on public.condominium_millesimal_tables
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_millesimal_tables" on public.condominium_millesimal_tables
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_millesimal_tables" on public.condominium_millesimal_tables
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_millesimal_tables" on public.condominium_millesimal_tables
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_millesimal_values" on public.condominium_millesimal_values
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_millesimal_values" on public.condominium_millesimal_values
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_millesimal_values" on public.condominium_millesimal_values
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_millesimal_values" on public.condominium_millesimal_values
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can delete condominium_payment_movements" on public.condominium_payment_movements
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_payment_movements" on public.condominium_payment_movements
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_payment_movements" on public.condominium_payment_movements
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_payment_movements" on public.condominium_payment_movements
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read payment reversal audit" on public.condominium_payment_reversal_audit
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "condominium_register_items_manager_all" on public.condominium_register_items
  as permissive for all to "authenticated"
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

create policy "condominium_suppliers_manager_all" on public.condominium_suppliers
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'fornitori'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'fornitori'::text));

create policy "Managers can delete condominium_tax_obligations" on public.condominium_tax_obligations
  as permissive for delete to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can insert condominium_tax_obligations" on public.condominium_tax_obligations
  as permissive for insert to "authenticated"
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can read condominium_tax_obligations" on public.condominium_tax_obligations
  as permissive for select to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "Managers can update condominium_tax_obligations" on public.condominium_tax_obligations
  as permissive for update to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

create policy "condominium_work_documents_manager_all" on public.condominium_work_documents
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'attivita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

create policy "condominium_work_events_manager_all" on public.condominium_work_events
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'attivita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

create policy "condominium_work_progress_manager_all" on public.condominium_work_progress
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'attivita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

create policy "condominium_works_manager_all" on public.condominium_works
  as permissive for all to "authenticated"
  using (private.can_manage_workspace_module(workspace_id, 'attivita'::text))
  with check (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

```
