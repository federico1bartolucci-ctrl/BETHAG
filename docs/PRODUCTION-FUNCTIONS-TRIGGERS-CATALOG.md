# BETHAG — Catalogo funzioni e trigger contabili Production

Fotografia read-only del database Production, rilevata il 1 ottobre 2026. L'elenco è ricavato dai cataloghi PostgreSQL; non include il corpo delle funzioni e non è una migrazione.

- Trigger non interni sulle 27 tabelle interessate: 88.
- Funzioni pertinenti individuate per nome in schema `public` e `private`: 85.

## Trigger e funzioni collegate

- `communication_recipients`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.communication_recipients FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `communication_recipients`: `trg_validate_communication_recipient_scope` → `validate_communication_recipient_scope` — `CREATE TRIGGER trg_validate_communication_recipient_scope BEFORE INSERT OR UPDATE ON public.communication_recipients FOR EACH ROW EXECUTE FUNCTION validate_communication_recipient_scope()`
- `condominium_accounting_settings`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_accounting_settings FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_allocation_intakes`: `trg_guard_confirmed_allocation_intake` → `guard_confirmed_intake_immutability` — `CREATE TRIGGER trg_guard_confirmed_allocation_intake BEFORE DELETE OR UPDATE ON public.condominium_allocation_intakes FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability()`
- `condominium_allocation_intakes`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_allocation_intakes FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_allocation_intakes`: `trg_validate_allocation_intake_scope` → `validate_condominium_allocation_intake_scope` — `CREATE TRIGGER trg_validate_allocation_intake_scope BEFORE INSERT OR UPDATE ON public.condominium_allocation_intakes FOR EACH ROW EXECUTE FUNCTION validate_condominium_allocation_intake_scope()`
- `condominium_allocation_rules`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_allocation_rules FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_allocation_rules`: `trg_validate_allocation_rule_scope` → `validate_allocation_rule_scope` — `CREATE TRIGGER trg_validate_allocation_rule_scope BEFORE INSERT OR UPDATE ON public.condominium_allocation_rules FOR EACH ROW EXECUTE FUNCTION validate_allocation_rule_scope()`
- `condominium_audit_log`: `trg_validate_audit_scope` → `validate_audit_scope` — `CREATE TRIGGER trg_validate_audit_scope BEFORE INSERT OR UPDATE ON public.condominium_audit_log FOR EACH ROW EXECUTE FUNCTION validate_audit_scope()`
- `condominium_budgets`: `trg_block_closed_budgets` → `prevent_closed_condominium_accounting` — `CREATE TRIGGER trg_block_closed_budgets BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_budgets FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting()`
- `condominium_budgets`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_budgets FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_budgets`: `trg_validate_budget_scope` → `validate_condominium_budget_scope` — `CREATE TRIGGER trg_validate_budget_scope BEFORE INSERT OR UPDATE ON public.condominium_budgets FOR EACH ROW EXECUTE FUNCTION validate_condominium_budget_scope()`
- `condominium_consumption_readings`: `trg_guard_consumption_reading_integrity` → `guard_consumption_reading_integrity` — `CREATE TRIGGER trg_guard_consumption_reading_integrity BEFORE DELETE OR UPDATE ON public.condominium_consumption_readings FOR EACH ROW EXECUTE FUNCTION guard_consumption_reading_integrity()`
- `condominium_consumption_readings`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_consumption_readings FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_consumption_readings`: `trg_validate_consumption_reading_scope` → `validate_condominium_consumption_reading_scope` — `CREATE TRIGGER trg_validate_consumption_reading_scope BEFORE INSERT OR UPDATE ON public.condominium_consumption_readings FOR EACH ROW EXECUTE FUNCTION validate_condominium_consumption_reading_scope()`
- `condominium_expense_allocations`: `trg_block_closed_allocations` → `prevent_closed_condominium_accounting` — `CREATE TRIGGER trg_block_closed_allocations BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting()`
- `condominium_expense_allocations`: `trg_guard_condominium_expense_allocation_total` → `guard_condominium_expense_allocation_total` — `CREATE TRIGGER trg_guard_condominium_expense_allocation_total BEFORE INSERT OR UPDATE ON public.condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION guard_condominium_expense_allocation_total()`
- `condominium_expense_allocations`: `trg_guard_expense_allocation_integrity` → `guard_expense_allocation_integrity` — `CREATE TRIGGER trg_guard_expense_allocation_integrity BEFORE DELETE OR UPDATE ON public.condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION guard_expense_allocation_integrity()`
- `condominium_expense_allocations`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_expense_allocations`: `trg_prevent_paid_allocation_delete` → `prevent_paid_allocation_delete` — `CREATE TRIGGER trg_prevent_paid_allocation_delete BEFORE DELETE ON public.condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION prevent_paid_allocation_delete()`
- `condominium_expense_allocations`: `trg_validate_expense_allocation_scope` → `validate_condominium_expense_allocation_scope` — `CREATE TRIGGER trg_validate_expense_allocation_scope BEFORE INSERT OR UPDATE ON public.condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_allocation_scope()`
- `condominium_fiscal_carryover_compensations`: `trg_guard_fiscal_carryover_compensation_total` → `guard_fiscal_carryover_compensation_total` — `CREATE TRIGGER trg_guard_fiscal_carryover_compensation_total BEFORE INSERT OR UPDATE ON public.condominium_fiscal_carryover_compensations FOR EACH ROW EXECUTE FUNCTION guard_fiscal_carryover_compensation_total()`
- `condominium_fiscal_carryover_compensations`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_fiscal_carryover_compensations FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_fiscal_carryover_compensations`: `trg_validate_fiscal_carryover_compensation_scope` → `validate_fiscal_carryover_compensation_scope` — `CREATE TRIGGER trg_validate_fiscal_carryover_compensation_scope BEFORE INSERT OR UPDATE ON public.condominium_fiscal_carryover_compensations FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_compensation_scope()`
- `condominium_fiscal_carryovers`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_fiscal_carryovers FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_fiscal_carryovers`: `trg_validate_fiscal_carryover_scope` → `validate_fiscal_carryover_scope` — `CREATE TRIGGER trg_validate_fiscal_carryover_scope BEFORE INSERT OR UPDATE ON public.condominium_fiscal_carryovers FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_scope()`
- `condominium_fiscal_years`: `trg_guard_fiscal_year_opening_balance` → `guard_fiscal_year_opening_balance` — `CREATE TRIGGER trg_guard_fiscal_year_opening_balance BEFORE UPDATE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION guard_fiscal_year_opening_balance()`
- `condominium_fiscal_years`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_fiscal_years`: `trg_prevent_closed_fiscal_year_delete` → `prevent_closed_fiscal_year_delete` — `CREATE TRIGGER trg_prevent_closed_fiscal_year_delete BEFORE DELETE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_delete()`
- `condominium_fiscal_years`: `trg_prevent_closed_fiscal_year_record_mutation` → `prevent_closed_fiscal_year_record_mutation` — `CREATE TRIGGER trg_prevent_closed_fiscal_year_record_mutation BEFORE DELETE OR UPDATE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_record_mutation()`
- `condominium_fiscal_years`: `trg_prevent_closed_fiscal_year_reopen` → `prevent_closed_fiscal_year_reopen` — `CREATE TRIGGER trg_prevent_closed_fiscal_year_reopen BEFORE INSERT OR UPDATE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_reopen()`
- `condominium_fiscal_years`: `trg_prevent_fiscal_year_delete` → `prevent_fiscal_year_delete` — `CREATE TRIGGER trg_prevent_fiscal_year_delete BEFORE DELETE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_fiscal_year_delete()`
- `condominium_fiscal_years`: `trg_validate_fiscal_year_scope` → `validate_condominium_fiscal_year_scope` — `CREATE TRIGGER trg_validate_fiscal_year_scope BEFORE INSERT OR UPDATE ON public.condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION validate_condominium_fiscal_year_scope()`
- `condominium_funds`: `trg_guard_fund_integrity` → `guard_fund_integrity` — `CREATE TRIGGER trg_guard_fund_integrity BEFORE INSERT OR UPDATE ON public.condominium_funds FOR EACH ROW EXECUTE FUNCTION guard_fund_integrity()`
- `condominium_funds`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_funds FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_funds`: `trg_validate_fund_scope` → `validate_condominium_fund_scope` — `CREATE TRIGGER trg_validate_fund_scope BEFORE INSERT OR UPDATE ON public.condominium_funds FOR EACH ROW EXECUTE FUNCTION validate_condominium_fund_scope()`
- `condominium_installments`: `trg_block_closed_installments` → `prevent_closed_condominium_accounting` — `CREATE TRIGGER trg_block_closed_installments BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting()`
- `condominium_installments`: `trg_guard_installment_paid_amount` → `guard_installment_paid_amount_update` — `CREATE TRIGGER trg_guard_installment_paid_amount BEFORE UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION guard_installment_paid_amount_update()`
- `condominium_installments`: `trg_guard_installment_parent_delete` → `guard_installment_parent_delete` — `CREATE TRIGGER trg_guard_installment_parent_delete BEFORE DELETE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION guard_installment_parent_delete()`
- `condominium_installments`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_installments`: `trg_prevent_new_installment_for_closing_member` → `prevent_new_installment_for_closing_member` — `CREATE TRIGGER trg_prevent_new_installment_for_closing_member BEFORE INSERT ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION private.prevent_new_installment_for_closing_member()`
- `condominium_installments`: `trg_prevent_paid_installment_delete` → `prevent_paid_installment_delete` — `CREATE TRIGGER trg_prevent_paid_installment_delete BEFORE DELETE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION prevent_paid_installment_delete()`
- `condominium_installments`: `trg_sync_expense_payment_status` → `sync_condominium_expense_payment_status` — `CREATE TRIGGER trg_sync_expense_payment_status AFTER INSERT OR DELETE OR UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION sync_condominium_expense_payment_status()`
- `condominium_installments`: `trg_validate_installment_paid_amount` → `validate_condominium_installment_paid_amount` — `CREATE TRIGGER trg_validate_installment_paid_amount BEFORE INSERT OR UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_paid_amount()`
- `condominium_installments`: `trg_validate_installment_scope` → `validate_condominium_installment_scope` — `CREATE TRIGGER trg_validate_installment_scope BEFORE INSERT OR UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_scope()`
- `condominium_installments`: `trg_validate_installment_total` → `validate_condominium_installment_total` — `CREATE TRIGGER trg_validate_installment_total BEFORE INSERT OR UPDATE ON public.condominium_installments FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_total()`
- `condominium_ledger_entries`: `trg_block_closed_ledger` → `prevent_closed_condominium_accounting` — `CREATE TRIGGER trg_block_closed_ledger BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting()`
- `condominium_ledger_entries`: `trg_guard_ledger_entry_integrity` → `guard_ledger_entry_integrity` — `CREATE TRIGGER trg_guard_ledger_entry_integrity BEFORE DELETE OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION guard_ledger_entry_integrity()`
- `condominium_ledger_entries`: `trg_guard_ledger_parent_delete` → `guard_ledger_parent_delete` — `CREATE TRIGGER trg_guard_ledger_parent_delete BEFORE DELETE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION guard_ledger_parent_delete()`
- `condominium_ledger_entries`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_ledger_entries`: `trg_sync_condominium_fund_usage` → `sync_condominium_fund_usage` — `CREATE TRIGGER trg_sync_condominium_fund_usage AFTER INSERT OR DELETE OR UPDATE OF fund_id, amount, direction ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION sync_condominium_fund_usage()`
- `condominium_ledger_entries`: `trg_validate_expense_payment_status` → `validate_condominium_expense_payment_status` — `CREATE TRIGGER trg_validate_expense_payment_status BEFORE INSERT OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_payment_status()`
- `condominium_ledger_entries`: `trg_validate_ledger_entry_deliberation_scope` → `validate_ledger_entry_deliberation_scope` — `CREATE TRIGGER trg_validate_ledger_entry_deliberation_scope BEFORE INSERT OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_deliberation_scope()`
- `condominium_ledger_entries`: `trg_validate_ledger_fund_scope` → `validate_condominium_ledger_fund_scope` — `CREATE TRIGGER trg_validate_ledger_fund_scope BEFORE INSERT OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_fund_scope()`
- `condominium_ledger_entries`: `trg_validate_ledger_scope` → `validate_condominium_ledger_scope` — `CREATE TRIGGER trg_validate_ledger_scope BEFORE INSERT OR UPDATE ON public.condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_scope()`
- `condominium_legal_cases`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_legal_cases FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_legal_cases`: `trg_validate_legal_case_scope` → `validate_condominium_legal_case_scope` — `CREATE TRIGGER trg_validate_legal_case_scope BEFORE INSERT OR UPDATE ON public.condominium_legal_cases FOR EACH ROW EXECUTE FUNCTION validate_condominium_legal_case_scope()`
- `condominium_millesimal_tables`: `trg_ensure_table_millesimal_values` → `ensure_table_millesimal_values` — `CREATE TRIGGER trg_ensure_table_millesimal_values AFTER INSERT ON public.condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION ensure_table_millesimal_values()`
- `condominium_millesimal_tables`: `trg_guard_millesimal_table_integrity` → `guard_millesimal_table_integrity` — `CREATE TRIGGER trg_guard_millesimal_table_integrity BEFORE DELETE OR UPDATE ON public.condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION guard_millesimal_table_integrity()`
- `condominium_millesimal_tables`: `trg_guard_millesimal_table_parent_delete` → `guard_millesimal_table_parent_delete` — `CREATE TRIGGER trg_guard_millesimal_table_parent_delete BEFORE DELETE ON public.condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION guard_millesimal_table_parent_delete()`
- `condominium_millesimal_tables`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_millesimal_tables`: `trg_validate_millesimal_table_scope` → `validate_condominium_millesimal_table_scope` — `CREATE TRIGGER trg_validate_millesimal_table_scope BEFORE INSERT OR UPDATE ON public.condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_table_scope()`
- `condominium_millesimal_values`: `trg_guard_millesimal_value_integrity` → `guard_millesimal_value_integrity` — `CREATE TRIGGER trg_guard_millesimal_value_integrity BEFORE DELETE OR UPDATE ON public.condominium_millesimal_values FOR EACH ROW EXECUTE FUNCTION guard_millesimal_value_integrity()`
- `condominium_millesimal_values`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_millesimal_values FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_millesimal_values`: `trg_validate_millesimal_value_scope` → `validate_condominium_millesimal_value_scope` — `CREATE TRIGGER trg_validate_millesimal_value_scope BEFORE INSERT OR UPDATE ON public.condominium_millesimal_values FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_value_scope()`
- `condominium_payment_movements`: `trg_block_closed_payments` → `prevent_closed_condominium_accounting` — `CREATE TRIGGER trg_block_closed_payments BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting()`
- `condominium_payment_movements`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_payment_movements`: `trg_prevent_payment_core_mutation` → `prevent_payment_core_mutation` — `CREATE TRIGGER trg_prevent_payment_core_mutation BEFORE UPDATE ON public.condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION prevent_payment_core_mutation()`
- `condominium_payment_movements`: `trg_sync_installment_from_payments` → `sync_condominium_installment_from_payments` — `CREATE TRIGGER trg_sync_installment_from_payments AFTER INSERT OR DELETE OR UPDATE ON public.condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION sync_condominium_installment_from_payments()`
- `condominium_payment_movements`: `trg_validate_payment_scope` → `validate_condominium_payment_scope` — `CREATE TRIGGER trg_validate_payment_scope BEFORE INSERT OR UPDATE ON public.condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION validate_condominium_payment_scope()`
- `condominium_register_items`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_register_items FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_suppliers`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_suppliers FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_tax_obligations`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_tax_obligations FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_tax_obligations`: `trg_validate_tax_scope` → `validate_condominium_tax_scope` — `CREATE TRIGGER trg_validate_tax_scope BEFORE INSERT OR UPDATE ON public.condominium_tax_obligations FOR EACH ROW EXECUTE FUNCTION validate_condominium_tax_scope()`
- `condominium_work_documents`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_work_documents FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_work_documents`: `validate_condominium_work_documents_scope` → `validate_condominium_work_child_scope` — `CREATE TRIGGER validate_condominium_work_documents_scope BEFORE INSERT OR UPDATE ON public.condominium_work_documents FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope()`
- `condominium_work_events`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_work_events FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_work_events`: `validate_condominium_work_events_scope` → `validate_condominium_work_child_scope` — `CREATE TRIGGER validate_condominium_work_events_scope BEFORE INSERT OR UPDATE ON public.condominium_work_events FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope()`
- `condominium_work_progress`: `audit_condominium_work_progress_change` → `audit_condominium_work_progress_change` — `CREATE TRIGGER audit_condominium_work_progress_change AFTER INSERT OR DELETE OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION audit_condominium_work_progress_change()`
- `condominium_work_progress`: `sync_condominium_work_financial_summary` → `sync_condominium_work_financial_summary_trigger` — `CREATE TRIGGER sync_condominium_work_financial_summary AFTER INSERT OR DELETE OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION sync_condominium_work_financial_summary_trigger()`
- `condominium_work_progress`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_work_progress`: `validate_condominium_work_financial_scope` → `validate_condominium_work_financial_scope` — `CREATE TRIGGER validate_condominium_work_financial_scope BEFORE INSERT OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_financial_scope()`
- `condominium_work_progress`: `validate_condominium_work_progress_accounting_links` → `validate_condominium_work_progress_accounting_links` — `CREATE TRIGGER validate_condominium_work_progress_accounting_links BEFORE INSERT OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_progress_accounting_links()`
- `condominium_work_progress`: `validate_condominium_work_progress_scope` → `validate_condominium_work_child_scope` — `CREATE TRIGGER validate_condominium_work_progress_scope BEFORE INSERT OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope()`
- `condominium_works`: `audit_condominium_work_change` → `audit_condominium_work_change` — `CREATE TRIGGER audit_condominium_work_change AFTER INSERT OR DELETE OR UPDATE ON public.condominium_works FOR EACH ROW EXECUTE FUNCTION audit_condominium_work_change()`
- `condominium_works`: `trg_prevent_archived_condominium_mutation` → `prevent_archived_condominium_mutation` — `CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON public.condominium_works FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation()`
- `condominium_works`: `validate_condominium_work_reference_scope` → `validate_condominium_work_reference_scope` — `CREATE TRIGGER validate_condominium_work_reference_scope BEFORE INSERT OR UPDATE ON public.condominium_works FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_reference_scope()`
- `condominium_works`: `validate_condominium_work_scope` → `validate_condominium_work_scope` — `CREATE TRIGGER validate_condominium_work_scope BEFORE INSERT OR UPDATE ON public.condominium_works FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_scope()`

## Funzioni pertinenti

| Schema | Funzione | Argomenti | Ritorno | SECURITY DEFINER |
|---|---|---|---|---|
| `private` | `can_access_workspace_module` | `target_workspace uuid, required_permission text` | `boolean` | sì |
| `private` | `can_manage_workspace_module` | `target_workspace uuid, required_permission text` | `boolean` | sì |
| `private` | `claim_first_workspace_admin` | `p_workspace_id uuid` | `uuid` | sì |
| `private` | `close_condominium_fiscal_year` | `p_workspace_id uuid, p_fiscal_year_id uuid` | `uuid` | sì |
| `private` | `close_condominium_member_transfer` | `p_transfer_id uuid` | `boolean` | sì |
| `private` | `close_fiscal_year_and_generate_carryovers` | `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid` | `integer` | sì |
| `private` | `compensate_fiscal_carryover` | `p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text` | `numeric` | sì |
| `private` | `confirm_condominium_member_transfer` | `p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb` | `uuid` | sì |
| `private` | `generate_fiscal_year_carryovers` | `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid` | `integer` | sì |
| `private` | `generate_installments_from_allocations` | `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid` | `integer` | sì |
| `private` | `generate_installments_from_allocations_schedule` | `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean` | `integer` | sì |
| `private` | `is_workspace_admin` | `target_workspace uuid` | `boolean` | sì |
| `private` | `is_workspace_manager` | `target_workspace uuid` | `boolean` | sì |
| `private` | `is_workspace_member` | `target_workspace uuid` | `boolean` | sì |
| `private` | `is_workspace_staff` | `target_workspace uuid` | `boolean` | sì |
| `private` | `prevent_new_installment_for_closing_member` | `` | `trigger` | sì |
| `private` | `register_condominium_installment_payment` | `p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text` | `numeric` | sì |
| `private` | `reverse_condominium_installment_payment` | `p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text` | `boolean` | sì |
| `public` | `audit_condominium_work_change` | `` | `trigger` | sì |
| `public` | `audit_condominium_work_progress_change` | `` | `trigger` | sì |
| `public` | `claim_first_workspace_admin` | `p_workspace_id uuid` | `uuid` | no |
| `public` | `close_condominium_fiscal_year` | `p_workspace_id uuid, p_fiscal_year_id uuid` | `uuid` | no |
| `public` | `close_condominium_member_transfer` | `p_transfer_id uuid` | `boolean` | no |
| `public` | `close_fiscal_year_and_generate_carryovers` | `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid` | `integer` | no |
| `public` | `compensate_fiscal_carryover` | `p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text` | `numeric` | no |
| `public` | `confirm_allocation_intake` | `p_workspace_id uuid, p_intake_id uuid` | `integer` | no |
| `public` | `confirm_condominium_member_transfer` | `p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb` | `uuid` | no |
| `public` | `ensure_table_millesimal_values` | `` | `trigger` | sì |
| `public` | `ensure_unit_millesimal_values` | `` | `trigger` | sì |
| `public` | `generate_condominium_expense_allocations` | `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date` | `TABLE(unit_id uuid, millesimi numeric, amount numeric)` | no |
| `public` | `generate_consumption_allocations` | `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text` | `integer` | no |
| `public` | `generate_fiscal_year_carryovers` | `p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid` | `integer` | no |
| `public` | `generate_installments_from_allocations` | `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid` | `integer` | no |
| `public` | `generate_installments_from_allocations_schedule` | `p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean` | `integer` | no |
| `public` | `get_member_transfer_accounting_snapshot` | `p_transfer_id uuid` | `jsonb` | no |
| `public` | `guard_condominium_expense_allocation_total` | `` | `trigger` | sì |
| `public` | `guard_expense_allocation_integrity` | `` | `trigger` | sì |
| `public` | `guard_fiscal_carryover_compensation_total` | `` | `trigger` | sì |
| `public` | `guard_fiscal_year_opening_balance` | `` | `trigger` | sì |
| `public` | `guard_installment_paid_amount_update` | `` | `trigger` | no |
| `public` | `guard_installment_parent_delete` | `` | `trigger` | sì |
| `public` | `guard_ledger_entry_integrity` | `` | `trigger` | no |
| `public` | `guard_ledger_parent_delete` | `` | `trigger` | no |
| `public` | `guard_millesimal_table_integrity` | `` | `trigger` | no |
| `public` | `guard_millesimal_table_parent_delete` | `` | `trigger` | no |
| `public` | `guard_millesimal_value_integrity` | `` | `trigger` | no |
| `public` | `prevent_closed_fiscal_year_delete` | `` | `trigger` | no |
| `public` | `prevent_closed_fiscal_year_payment_delete` | `` | `trigger` | no |
| `public` | `prevent_closed_fiscal_year_record_mutation` | `` | `trigger` | no |
| `public` | `prevent_closed_fiscal_year_reopen` | `` | `trigger` | sì |
| `public` | `prevent_closed_fiscal_year_update` | `` | `trigger` | no |
| `public` | `prevent_fiscal_year_delete` | `` | `trigger` | sì |
| `public` | `prevent_paid_allocation_delete` | `` | `trigger` | no |
| `public` | `prevent_paid_installment_delete` | `` | `trigger` | no |
| `public` | `prevent_payment_core_mutation` | `` | `trigger` | no |
| `public` | `preview_condominium_member_transfer` | `p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date` | `jsonb` | no |
| `public` | `register_condominium_installment_payment` | `p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text` | `numeric` | no |
| `public` | `reverse_condominium_installment_payment` | `p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text` | `boolean` | no |
| `public` | `sync_condominium_expense_payment_status` | `` | `trigger` | no |
| `public` | `sync_condominium_installment_from_payments` | `` | `trigger` | no |
| `public` | `sync_condominium_work_financial_summary` | `p_work_id uuid` | `void` | sì |
| `public` | `sync_condominium_work_financial_summary_trigger` | `` | `trigger` | sì |
| `public` | `validate_allocation_rule_scope` | `` | `trigger` | sì |
| `public` | `validate_condominium_allocation_intake_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_expense_allocation_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_expense_payment_status` | `` | `trigger` | no |
| `public` | `validate_condominium_fiscal_year_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_installment_paid_amount` | `` | `trigger` | no |
| `public` | `validate_condominium_installment_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_installment_total` | `` | `trigger` | sì |
| `public` | `validate_condominium_ledger_fund_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_ledger_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_millesimal_table_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_millesimal_value_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_payment_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_unit_workspace_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_work_child_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_work_financial_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_work_progress_accounting_links` | `` | `trigger` | sì |
| `public` | `validate_condominium_work_reference_scope` | `` | `trigger` | no |
| `public` | `validate_condominium_work_scope` | `` | `trigger` | no |
| `public` | `validate_fiscal_carryover_compensation_scope` | `` | `trigger` | sì |
| `public` | `validate_fiscal_carryover_scope` | `` | `trigger` | sì |
| `public` | `validate_ledger_entry_deliberation_scope` | `` | `trigger` | no |
| `public` | `validate_workspace_condominium_scope` | `` | `trigger` | no |

## Implicazioni per la ricostruzione

Le migrazioni di base dovranno creare le tabelle prima dei trigger e delle funzioni dipendenti. Per le funzioni `SECURITY DEFINER` occorre verificare proprietario, `search_path`, controllo workspace/ruolo e privilegi `EXECUTE`; non è sufficiente replicare la firma. I trigger che impediscono modifiche a esercizi chiusi, allocazioni già pagate, saldi e trasformazioni confermate sono parte integrante dell'integrità dei dati.

**Passaggio non ancora eseguito:** estrazione e confronto dei corpi SQL delle funzioni, dei grants e delle dipendenze tra funzioni; successiva applicazione isolata in sviluppo e test.
