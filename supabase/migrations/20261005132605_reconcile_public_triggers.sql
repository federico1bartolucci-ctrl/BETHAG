-- Reconcile public trigger definitions with production.

drop trigger if exists trg_prevent_archived_condominium_mutation on public.activities;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_scope_activities on public.activities;
CREATE TRIGGER trg_validate_scope_activities BEFORE INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.assemblies;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON assemblies FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_scope_assemblies on public.assemblies;
CREATE TRIGGER trg_validate_scope_assemblies BEFORE INSERT OR UPDATE ON assemblies FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.communication_recipients;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON communication_recipients FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_communication_recipient_scope on public.communication_recipients;
CREATE TRIGGER trg_validate_communication_recipient_scope BEFORE INSERT OR UPDATE ON communication_recipients FOR EACH ROW EXECUTE FUNCTION validate_communication_recipient_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.communications;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON communications FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_communication_scope on public.communications;
CREATE TRIGGER trg_validate_communication_scope BEFORE INSERT OR UPDATE ON communications FOR EACH ROW EXECUTE FUNCTION validate_communication_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_accounting_settings;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_accounting_settings FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_guard_confirmed_allocation_intake on public.condominium_allocation_intakes;
CREATE TRIGGER trg_guard_confirmed_allocation_intake BEFORE DELETE OR UPDATE ON condominium_allocation_intakes FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_allocation_intakes;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_allocation_intakes FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_allocation_intake_scope on public.condominium_allocation_intakes;
CREATE TRIGGER trg_validate_allocation_intake_scope BEFORE INSERT OR UPDATE ON condominium_allocation_intakes FOR EACH ROW EXECUTE FUNCTION validate_condominium_allocation_intake_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_allocation_rules;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_allocation_rules FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_audit_scope on public.condominium_audit_log;
CREATE TRIGGER trg_validate_audit_scope BEFORE INSERT OR UPDATE ON condominium_audit_log FOR EACH ROW EXECUTE FUNCTION validate_audit_scope();

drop trigger if exists trg_block_closed_budgets on public.condominium_budgets;
CREATE TRIGGER trg_block_closed_budgets BEFORE INSERT OR DELETE OR UPDATE ON condominium_budgets FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_budgets;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_budgets FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_budget_scope on public.condominium_budgets;
CREATE TRIGGER trg_validate_budget_scope BEFORE INSERT OR UPDATE ON condominium_budgets FOR EACH ROW EXECUTE FUNCTION validate_condominium_budget_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_consumption_readings;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_consumption_readings FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_consumption_reading_scope on public.condominium_consumption_readings;
CREATE TRIGGER trg_validate_consumption_reading_scope BEFORE INSERT OR UPDATE ON condominium_consumption_readings FOR EACH ROW EXECUTE FUNCTION validate_condominium_consumption_reading_scope();

drop trigger if exists trg_guard_confirmed_creation_intake on public.condominium_creation_intakes;
CREATE TRIGGER trg_guard_confirmed_creation_intake BEFORE DELETE OR UPDATE ON condominium_creation_intakes FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability();

drop trigger if exists trg_validate_creation_intake_scope on public.condominium_creation_intakes;
CREATE TRIGGER trg_validate_creation_intake_scope BEFORE INSERT OR UPDATE ON condominium_creation_intakes FOR EACH ROW EXECUTE FUNCTION validate_condominium_creation_intake_scope();

drop trigger if exists trg_block_closed_allocations on public.condominium_expense_allocations;
CREATE TRIGGER trg_block_closed_allocations BEFORE INSERT OR DELETE OR UPDATE ON condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

drop trigger if exists trg_guard_condominium_expense_allocation_total on public.condominium_expense_allocations;
CREATE TRIGGER trg_guard_condominium_expense_allocation_total BEFORE INSERT OR UPDATE ON condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION guard_condominium_expense_allocation_total();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_expense_allocations;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_expense_allocation_scope on public.condominium_expense_allocations;
CREATE TRIGGER trg_validate_expense_allocation_scope BEFORE INSERT OR UPDATE ON condominium_expense_allocations FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_allocation_scope();

drop trigger if exists trg_guard_fiscal_carryover_compensation_total on public.condominium_fiscal_carryover_compensations;
CREATE TRIGGER trg_guard_fiscal_carryover_compensation_total BEFORE INSERT OR UPDATE ON condominium_fiscal_carryover_compensations FOR EACH ROW EXECUTE FUNCTION guard_fiscal_carryover_compensation_total();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_fiscal_carryover_compensations;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_fiscal_carryover_compensations FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_fiscal_carryover_compensation_scope on public.condominium_fiscal_carryover_compensations;
CREATE TRIGGER trg_validate_fiscal_carryover_compensation_scope BEFORE INSERT OR UPDATE ON condominium_fiscal_carryover_compensations FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_compensation_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_fiscal_carryovers;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_fiscal_carryovers FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_fiscal_carryover_scope on public.condominium_fiscal_carryovers;
CREATE TRIGGER trg_validate_fiscal_carryover_scope BEFORE INSERT OR UPDATE ON condominium_fiscal_carryovers FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_fiscal_years;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_prevent_closed_fiscal_year_delete on public.condominium_fiscal_years;
CREATE TRIGGER trg_prevent_closed_fiscal_year_delete BEFORE DELETE ON condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_delete();

drop trigger if exists trg_prevent_closed_fiscal_year_record_mutation on public.condominium_fiscal_years;
CREATE TRIGGER trg_prevent_closed_fiscal_year_record_mutation BEFORE DELETE OR UPDATE ON condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_record_mutation();

drop trigger if exists trg_prevent_closed_fiscal_year_reopen on public.condominium_fiscal_years;
CREATE TRIGGER trg_prevent_closed_fiscal_year_reopen BEFORE INSERT OR UPDATE ON condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_reopen();

drop trigger if exists trg_validate_fiscal_year_scope on public.condominium_fiscal_years;
CREATE TRIGGER trg_validate_fiscal_year_scope BEFORE INSERT OR UPDATE ON condominium_fiscal_years FOR EACH ROW EXECUTE FUNCTION validate_condominium_fiscal_year_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_funds;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_funds FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_fund_scope on public.condominium_funds;
CREATE TRIGGER trg_validate_fund_scope BEFORE INSERT OR UPDATE ON condominium_funds FOR EACH ROW EXECUTE FUNCTION validate_condominium_fund_scope();

drop trigger if exists trg_block_closed_installments on public.condominium_installments;
CREATE TRIGGER trg_block_closed_installments BEFORE INSERT OR DELETE OR UPDATE ON condominium_installments FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_installments;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_installments FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_prevent_new_installment_for_closing_member on public.condominium_installments;
CREATE TRIGGER trg_prevent_new_installment_for_closing_member BEFORE INSERT ON condominium_installments FOR EACH ROW EXECUTE FUNCTION private.prevent_new_installment_for_closing_member();

drop trigger if exists trg_sync_expense_payment_status on public.condominium_installments;
CREATE TRIGGER trg_sync_expense_payment_status AFTER INSERT OR DELETE OR UPDATE ON condominium_installments FOR EACH ROW EXECUTE FUNCTION sync_condominium_expense_payment_status();

drop trigger if exists trg_validate_installment_paid_amount on public.condominium_installments;
CREATE TRIGGER trg_validate_installment_paid_amount BEFORE INSERT OR UPDATE ON condominium_installments FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_paid_amount();

drop trigger if exists trg_validate_installment_scope on public.condominium_installments;
CREATE TRIGGER trg_validate_installment_scope BEFORE INSERT OR UPDATE ON condominium_installments FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_scope();

drop trigger if exists trg_validate_installment_total on public.condominium_installments;
CREATE TRIGGER trg_validate_installment_total BEFORE INSERT OR UPDATE ON condominium_installments FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_total();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_insurance_policies;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_insurance_policies FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_scope_insurance_policies on public.condominium_insurance_policies;
CREATE TRIGGER trg_validate_scope_insurance_policies BEFORE INSERT OR UPDATE ON condominium_insurance_policies FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

drop trigger if exists trg_block_closed_ledger on public.condominium_ledger_entries;
CREATE TRIGGER trg_block_closed_ledger BEFORE INSERT OR DELETE OR UPDATE ON condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_ledger_entries;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_expense_payment_status on public.condominium_ledger_entries;
CREATE TRIGGER trg_validate_expense_payment_status BEFORE INSERT OR UPDATE ON condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_payment_status();

drop trigger if exists trg_validate_ledger_entry_deliberation_scope on public.condominium_ledger_entries;
CREATE TRIGGER trg_validate_ledger_entry_deliberation_scope BEFORE INSERT OR UPDATE ON condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_deliberation_scope();

drop trigger if exists trg_validate_ledger_scope on public.condominium_ledger_entries;
CREATE TRIGGER trg_validate_ledger_scope BEFORE INSERT OR UPDATE ON condominium_ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_millesimal_tables;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_millesimal_table_scope on public.condominium_millesimal_tables;
CREATE TRIGGER trg_validate_millesimal_table_scope BEFORE INSERT OR UPDATE ON condominium_millesimal_tables FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_table_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_millesimal_values;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_millesimal_values FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_millesimal_value_scope on public.condominium_millesimal_values;
CREATE TRIGGER trg_validate_millesimal_value_scope BEFORE INSERT OR UPDATE ON condominium_millesimal_values FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_value_scope();

drop trigger if exists trg_block_closed_payments on public.condominium_payment_movements;
CREATE TRIGGER trg_block_closed_payments BEFORE INSERT OR DELETE OR UPDATE ON condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_payment_movements;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_prevent_payment_core_mutation on public.condominium_payment_movements;
CREATE TRIGGER trg_prevent_payment_core_mutation BEFORE UPDATE ON condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION prevent_payment_core_mutation();

drop trigger if exists trg_sync_installment_from_payments on public.condominium_payment_movements;
CREATE TRIGGER trg_sync_installment_from_payments AFTER INSERT OR DELETE OR UPDATE ON condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION sync_condominium_installment_from_payments();

drop trigger if exists trg_validate_payment_scope on public.condominium_payment_movements;
CREATE TRIGGER trg_validate_payment_scope BEFORE INSERT OR UPDATE ON condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION validate_condominium_payment_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_requests;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_requests FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_touch_condominium_request_updated_at on public.condominium_requests;
CREATE TRIGGER trg_touch_condominium_request_updated_at BEFORE UPDATE ON condominium_requests FOR EACH ROW EXECUTE FUNCTION private.touch_condominium_request_updated_at();

drop trigger if exists trg_validate_request_scope on public.condominium_requests;
CREATE TRIGGER trg_validate_request_scope BEFORE INSERT OR UPDATE ON condominium_requests FOR EACH ROW EXECUTE FUNCTION validate_condominium_request_scope();

drop trigger if exists trg_validate_request_status on public.condominium_requests;
CREATE TRIGGER trg_validate_request_status BEFORE UPDATE ON condominium_requests FOR EACH ROW EXECUTE FUNCTION validate_condominium_request_status();

drop trigger if exists require_trusted_unit_transformation_confirmation_trg on public.condominium_unit_transformations;
CREATE TRIGGER require_trusted_unit_transformation_confirmation_trg BEFORE INSERT OR UPDATE OF status ON condominium_unit_transformations FOR EACH ROW EXECUTE FUNCTION require_trusted_unit_transformation_confirmation();

drop trigger if exists validate_confirmed_unit_transformation_genealogy_trg on public.condominium_unit_transformations;
CREATE TRIGGER validate_confirmed_unit_transformation_genealogy_trg BEFORE INSERT OR UPDATE OF status, source_unit_count, destination_unit_count ON condominium_unit_transformations FOR EACH ROW EXECUTE FUNCTION validate_confirmed_unit_transformation_genealogy();

drop trigger if exists prevent_condominium_unit_delete_with_financial_data on public.condominium_units;
CREATE TRIGGER prevent_condominium_unit_delete_with_financial_data BEFORE DELETE ON condominium_units FOR EACH ROW EXECUTE FUNCTION prevent_condominium_unit_delete_with_financial_data();

drop trigger if exists prevent_condominium_unit_delete_with_members on public.condominium_units;
CREATE TRIGGER prevent_condominium_unit_delete_with_members BEFORE DELETE ON condominium_units FOR EACH ROW EXECUTE FUNCTION prevent_condominium_unit_delete_with_members();

drop trigger if exists require_confirmed_genealogy_for_unit_lifecycle_trg on public.condominium_units;
CREATE TRIGGER require_confirmed_genealogy_for_unit_lifecycle_trg BEFORE UPDATE OF lifecycle_status, lifecycle_effective_date ON condominium_units FOR EACH ROW EXECUTE FUNCTION require_confirmed_genealogy_for_unit_lifecycle();

drop trigger if exists trg_clear_member_unit_legacy_on_unit_delete on public.condominium_units;
CREATE TRIGGER trg_clear_member_unit_legacy_on_unit_delete AFTER DELETE ON condominium_units FOR EACH ROW EXECUTE FUNCTION clear_condominium_member_unit_legacy_fields();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_units;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON condominium_units FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_prevent_unsafe_condominium_unit_delete on public.condominium_units;
CREATE TRIGGER trg_prevent_unsafe_condominium_unit_delete BEFORE DELETE ON condominium_units FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_condominium_unit_delete();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.deadlines;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON deadlines FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_scope_deadlines on public.deadlines;
CREATE TRIGGER trg_validate_scope_deadlines BEFORE INSERT OR UPDATE ON deadlines FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

drop trigger if exists trg_audit_document_ai_change on public.documents;
CREATE TRIGGER trg_audit_document_ai_change AFTER UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION audit_document_ai_change();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.documents;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_touch_documents_updated_at on public.documents;
CREATE TRIGGER trg_touch_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION touch_documents_updated_at();

drop trigger if exists trg_validate_document_ai_transition on public.documents;
CREATE TRIGGER trg_validate_document_ai_transition BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION validate_document_ai_transition();

drop trigger if exists trg_validate_document_metadata on public.documents;
CREATE TRIGGER trg_validate_document_metadata BEFORE INSERT OR UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION validate_document_metadata();

drop trigger if exists trg_validate_scope_documents on public.documents;
CREATE TRIGGER trg_validate_scope_documents BEFORE INSERT OR UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

drop trigger if exists trg_prevent_profile_privilege_self_change on public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_self_change BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_self_change();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.suppliers;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_scope_suppliers on public.suppliers;
CREATE TRIGGER trg_validate_scope_suppliers BEFORE INSERT OR UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.workspace_members;
CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();
