-- BETHAG baseline: grants and default privileges.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO service_role;













GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.activities TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.activities TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.assemblies TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.assemblies TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communication_recipients TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communication_recipients TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communications TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communications TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_accounting_settings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_accounting_settings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_intakes TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_rules TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_rules TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_audit_log TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_audit_log TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_budgets TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_budgets TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_consumption_readings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_consumption_readings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_creation_intakes TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_creation_intakes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_expense_allocations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_expense_allocations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryover_compensations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryovers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_years TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_years TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_funds TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_funds TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_installments TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_installments TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_insurance_policies TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_insurance_policies TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_ledger_entries TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_ledger_entries TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_legal_cases TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_legal_cases TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_member_transfers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_member_transfers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_members TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_members TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_tables TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_values TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_values TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_movements TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_movements TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_reversal_audit TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_register_items TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_register_items TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_requests TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_requests TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_suppliers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_suppliers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_tax_obligations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_tax_obligations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformation_items TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_units TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_units TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_documents TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_documents TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_events TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_events TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_progress TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_progress TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_works TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_works TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominiums TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominiums TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.deadlines TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.deadlines TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_access TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_access TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_registration_requests TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_registration_requests TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suppliers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suppliers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_security_settings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_security_settings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspace_members TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspace_members TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.activities TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.assemblies TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.communication_recipients TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.communications TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_accounting_settings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_allocation_intakes TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_allocation_rules TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_budgets TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_consumption_readings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_creation_intakes TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_expense_allocations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_fiscal_years TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_funds TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_installments TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_insurance_policies TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_ledger_entries TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_legal_cases TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_member_transfers TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_millesimal_tables TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_millesimal_values TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_register_items TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_requests TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_suppliers TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_tax_obligations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_unit_transformation_items TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_unit_transformations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_units TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_work_documents TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_work_events TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_work_progress TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_works TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominiums TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.deadlines TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.documents TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.portal_access TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.portal_registration_requests TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.suppliers TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.user_security_settings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.workspace_members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.workspaces TO authenticated;

GRANT DELETE, SELECT ON TABLE public.profiles TO authenticated;

GRANT EXECUTE ON FUNCTION private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION private.can_access_condominium(target_condominium uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_access_condominium(target_condominium uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.can_access_resident_condominium(target_condominium uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_access_resident_condominium_module(target_condominium uuid, required_permission text) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_access_workspace_module(target_workspace uuid, required_permission text) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_manage_workspace_module(target_workspace uuid, required_permission text) TO authenticated;



GRANT EXECUTE ON FUNCTION private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION private.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) TO service_role;

GRANT EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) TO service_role;

GRANT EXECUTE ON FUNCTION private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) TO service_role;

GRANT EXECUTE ON FUNCTION private.get_my_workspace_access() TO authenticated;

GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role;

GRANT EXECUTE ON FUNCTION private.is_workspace_admin(target_workspace uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_workspace_admin(target_workspace uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.is_workspace_member(target_workspace uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_workspace_member(target_workspace uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.is_workspace_staff(target_workspace uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.list_archived_condominiums(p_workspace_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION private.set_personal_security_code(p_code text, p_enabled boolean) TO service_role;

GRANT EXECUTE ON FUNCTION private.verify_personal_security_code(p_code text) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone) TO service_role;

GRANT EXECUTE ON FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_condominium_work_change() TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_condominium_work_progress_change() TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_document_ai_change() TO service_role;



GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.clear_condominium_member_unit_legacy_fields() TO service_role;

GRANT EXECUTE ON FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION public.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) TO service_role;

GRANT EXECUTE ON FUNCTION public.ensure_table_millesimal_values() TO service_role;

GRANT EXECUTE ON FUNCTION public.ensure_unit_millesimal_values() TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_member_transfer_accounting_snapshot(p_transfer_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_member_transfer_accounting_snapshot(p_transfer_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_workspace_access() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_workspace_access() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_condominium_expense_allocation_total() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_confirmed_unit_transformation_immutable() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_confirmed_unit_transformation_items_immutable() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_consumption_reading_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_expense_allocation_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_fiscal_carryover_compensation_total() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_fiscal_year_opening_balance() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_fund_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_installment_paid_amount_update() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_installment_paid_amount_update() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_installment_parent_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_ledger_entry_integrity() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_ledger_entry_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_ledger_parent_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_ledger_parent_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_integrity() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_parent_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_parent_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_value_integrity() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_value_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_unit_scope_changes() TO service_role;

GRANT EXECUTE ON FUNCTION public.list_archived_condominiums(p_workspace_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.list_archived_condominiums(p_workspace_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.normalize_condominium_member_contact() TO service_role;

GRANT EXECUTE ON FUNCTION public.normalize_condominium_member_names() TO service_role;



GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO service_role;

GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(p_communication_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(p_communication_id uuid) TO service_role;



GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_archived_condominium_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_condominium_accounting() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_payment_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_payment_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_record_mutation() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_record_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_reopen() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_update() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_update() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_financial_data() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_financial_data() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_members() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_members() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_financial_unit_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_financial_unit_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_fiscal_year_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_member_delete_with_financial_history() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_member_delete_with_financial_history() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_member_unit_reassignment_with_financial_history() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_member_unit_reassignment_with_financial_history() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_paid_allocation_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_paid_allocation_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_paid_installment_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_paid_installment_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_payment_core_mutation() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_payment_core_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_self_change() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_self_change() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_unsafe_condominium_unit_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.preview_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.preview_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date) TO service_role;

GRANT EXECUTE ON FUNCTION public.preview_condominium_unit_transformation(p_condominium_id uuid, p_transformation_type text, p_source_unit_ids uuid[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.preview_condominium_unit_transformation(p_condominium_id uuid, p_transformation_type text, p_source_unit_ids uuid[]) TO service_role;

GRANT EXECUTE ON FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION public.reset_stale_communication_recipients(p_communication_id uuid, p_age interval) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reset_stale_communication_recipients(p_communication_id uuid, p_age interval) TO service_role;

GRANT EXECUTE ON FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION public.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.set_personal_security_code(p_code text, p_enabled boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_personal_security_code(p_code text, p_enabled boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_expense_payment_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_fund_usage() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_installment_from_payments() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_member_unit_legacy_fields() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_work_financial_summary(p_work_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_work_financial_summary_trigger() TO service_role;

GRANT EXECUTE ON FUNCTION public.touch_documents_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_allocation_rule_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_audit_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_communication_recipient_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_communication_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_allocation_intake_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_budget_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_consumption_reading_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_creation_intake_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_expense_allocation_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_expense_payment_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_fiscal_year_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_fund_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_installment_paid_amount() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_installment_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_installment_total() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_ledger_fund_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_ledger_fund_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_ledger_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_legal_case_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_member_unit_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_table_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_table_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_value_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_value_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_payment_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_request_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_request_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_tax_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_unit_relationship() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_unit_workspace_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_unit_workspace_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_child_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_financial_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_financial_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_progress_accounting_links() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_reference_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_reference_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_document_ai_transition() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_document_metadata() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_document_upload_size(p_size_bytes bigint, p_warning_bytes bigint, p_max_bytes bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_document_upload_size(p_size_bytes bigint, p_warning_bytes bigint, p_max_bytes bigint) TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_fiscal_carryover_compensation_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_fiscal_carryover_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_ledger_entry_deliberation_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_ledger_entry_deliberation_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_portal_access_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_portal_registration_request_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_unit_owner_member_refs() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_workspace_condominium_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.verify_personal_security_code(p_code text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.verify_personal_security_code(p_code text) TO service_role;




























































































































































































































































































































































































GRANT SELECT ON TABLE public.condominium_audit_log TO authenticated;

GRANT SELECT ON TABLE public.condominium_fiscal_carryover_compensations TO authenticated;

GRANT SELECT ON TABLE public.condominium_fiscal_carryovers TO authenticated;

GRANT SELECT ON TABLE public.condominium_payment_movements TO authenticated;

GRANT SELECT ON TABLE public.condominium_payment_reversal_audit TO authenticated;











































































































































GRANT USAGE ON SCHEMA private TO authenticated;

GRANT USAGE ON SCHEMA public TO PUBLIC;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO service_role;

-- Reconcile PostgreSQL's implicit PUBLIC EXECUTE grants with Production ACLs.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO PUBLIC;
