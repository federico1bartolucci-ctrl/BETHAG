-- BETHAG baseline: grants and default privileges.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.activities TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.activities TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.assemblies TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.assemblies TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communication_recipients TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communication_recipients TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communications TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communications TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_accounting_settings TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_accounting_settings TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_intakes TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_rules TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_rules TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_audit_log TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_audit_log TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_budgets TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_budgets TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_consumption_readings TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_consumption_readings TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_creation_intakes TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_creation_intakes TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_expense_allocations TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_expense_allocations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryover_compensations TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryovers TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_years TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_years TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_funds TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_funds TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_installments TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_installments TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_insurance_policies TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_insurance_policies TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_ledger_entries TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_ledger_entries TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_legal_cases TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_legal_cases TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_member_transfers TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_member_transfers TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_members TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_members TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_tables TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_values TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_values TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_movements TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_movements TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_reversal_audit TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_register_items TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_register_items TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_requests TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_requests TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_suppliers TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_suppliers TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_tax_obligations TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_tax_obligations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformation_items TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformations TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_units TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_units TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_documents TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_documents TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_events TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_events TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_progress TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_progress TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_works TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_works TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominiums TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominiums TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.deadlines TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.deadlines TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_access TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_access TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_registration_requests TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_registration_requests TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suppliers TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suppliers TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_security_settings TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_security_settings TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspace_members TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspace_members TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO postgres WITH GRANT OPTION;

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

GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;

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

GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;

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

GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO service_role;

GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(p_communication_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(p_communication_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO PUBLIC;

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

GRANT INSERT (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO authenticated;

GRANT INSERT (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO postgres WITH GRANT OPTION;

GRANT INSERT (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO service_role;

GRANT INSERT (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO authenticated;

GRANT INSERT (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO postgres WITH GRANT OPTION;

GRANT INSERT (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO service_role;

GRANT INSERT (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO postgres WITH GRANT OPTION;

GRANT INSERT (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO service_role;

GRANT INSERT (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO authenticated;

GRANT INSERT (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO postgres WITH GRANT OPTION;

GRANT INSERT (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO service_role;

GRANT INSERT (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO authenticated;

GRANT INSERT (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO postgres WITH GRANT OPTION;

GRANT INSERT (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO service_role;

GRANT INSERT (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO authenticated;

GRANT INSERT (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO postgres WITH GRANT OPTION;

GRANT INSERT (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO service_role;

GRANT INSERT (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO authenticated;

GRANT INSERT (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO postgres WITH GRANT OPTION;

GRANT INSERT (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO service_role;

GRANT INSERT (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO authenticated;

GRANT INSERT (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO postgres WITH GRANT OPTION;

GRANT INSERT (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT INSERT (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO authenticated;

GRANT INSERT (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO postgres WITH GRANT OPTION;

GRANT INSERT (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO service_role;

GRANT INSERT (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO authenticated;

GRANT INSERT (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO postgres WITH GRANT OPTION;

GRANT INSERT (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO service_role;

GRANT INSERT (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO authenticated;

GRANT INSERT (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO postgres WITH GRANT OPTION;

GRANT INSERT (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO service_role;

GRANT INSERT (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO postgres WITH GRANT OPTION;

GRANT INSERT (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO service_role;

GRANT INSERT (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO authenticated;

GRANT INSERT (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO postgres WITH GRANT OPTION;

GRANT INSERT (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO service_role;

GRANT INSERT (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO authenticated;

GRANT INSERT (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO postgres WITH GRANT OPTION;

GRANT INSERT (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO service_role;

GRANT INSERT (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO authenticated;

GRANT INSERT (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO postgres WITH GRANT OPTION;

GRANT INSERT (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO service_role;

GRANT INSERT (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO authenticated;

GRANT INSERT (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO postgres WITH GRANT OPTION;

GRANT INSERT (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO service_role;

GRANT INSERT (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO authenticated;

GRANT INSERT (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO postgres WITH GRANT OPTION;

GRANT INSERT (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT INSERT (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO authenticated;

GRANT INSERT (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO postgres WITH GRANT OPTION;

GRANT INSERT (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO service_role;

GRANT INSERT (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO authenticated;

GRANT INSERT (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO service_role;

GRANT INSERT (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT INSERT (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO authenticated;

GRANT INSERT (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO service_role;

GRANT INSERT (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO authenticated;

GRANT INSERT (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO service_role;

GRANT INSERT (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO authenticated;

GRANT INSERT (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO service_role;

GRANT INSERT (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO authenticated;

GRANT INSERT (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO service_role;

GRANT INSERT (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO service_role;

GRANT INSERT (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO authenticated;

GRANT INSERT (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO service_role;

GRANT INSERT (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO postgres WITH GRANT OPTION;

GRANT INSERT (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT INSERT (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO authenticated;

GRANT INSERT (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO postgres WITH GRANT OPTION;

GRANT INSERT (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO service_role;

GRANT INSERT (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO postgres WITH GRANT OPTION;

GRANT INSERT (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT INSERT (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO authenticated;

GRANT INSERT (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO postgres WITH GRANT OPTION;

GRANT INSERT (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO service_role;

GRANT INSERT (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO authenticated;

GRANT INSERT (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO postgres WITH GRANT OPTION;

GRANT INSERT (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO service_role;

GRANT INSERT (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO authenticated;

GRANT INSERT (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO postgres WITH GRANT OPTION;

GRANT INSERT (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO service_role;

GRANT INSERT (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO authenticated;

GRANT INSERT (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO postgres WITH GRANT OPTION;

GRANT INSERT (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO service_role;

GRANT INSERT (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO authenticated;

GRANT INSERT (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO postgres WITH GRANT OPTION;

GRANT INSERT (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO service_role;

GRANT INSERT (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO authenticated;

GRANT INSERT (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO postgres WITH GRANT OPTION;

GRANT INSERT (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO service_role;

GRANT INSERT (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO authenticated;

GRANT INSERT (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO postgres WITH GRANT OPTION;

GRANT INSERT (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO service_role;

GRANT INSERT (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO authenticated;

GRANT INSERT (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO postgres WITH GRANT OPTION;

GRANT INSERT (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO service_role;

GRANT INSERT (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO authenticated;

GRANT INSERT (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO postgres WITH GRANT OPTION;

GRANT INSERT (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO service_role;

GRANT INSERT (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO authenticated;

GRANT INSERT (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO postgres WITH GRANT OPTION;

GRANT INSERT (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO service_role;

GRANT INSERT (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO authenticated;

GRANT INSERT (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO postgres WITH GRANT OPTION;

GRANT INSERT (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO service_role;

GRANT INSERT (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO authenticated;

GRANT INSERT (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO postgres WITH GRANT OPTION;

GRANT INSERT (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO service_role;

GRANT INSERT (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO authenticated;

GRANT INSERT (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO postgres WITH GRANT OPTION;

GRANT INSERT (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO service_role;

GRANT INSERT (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO authenticated;

GRANT INSERT (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO postgres WITH GRANT OPTION;

GRANT INSERT (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO service_role;

GRANT INSERT (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO authenticated;

GRANT INSERT (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO postgres WITH GRANT OPTION;

GRANT INSERT (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO service_role;

GRANT INSERT (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO authenticated;

GRANT INSERT (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO postgres WITH GRANT OPTION;

GRANT INSERT (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO service_role;

GRANT INSERT (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO authenticated;

GRANT INSERT (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO postgres WITH GRANT OPTION;

GRANT INSERT (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT INSERT (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO authenticated;

GRANT INSERT (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO postgres WITH GRANT OPTION;

GRANT INSERT (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO service_role;

GRANT INSERT (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO authenticated;

GRANT INSERT (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO postgres WITH GRANT OPTION;

GRANT INSERT (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO service_role;

GRANT REFERENCES (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO postgres WITH GRANT OPTION;

GRANT REFERENCES (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO service_role;

GRANT REFERENCES (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO postgres WITH GRANT OPTION;

GRANT REFERENCES (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO service_role;

GRANT REFERENCES (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO postgres WITH GRANT OPTION;

GRANT REFERENCES (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO service_role;

GRANT REFERENCES (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO authenticated;

GRANT REFERENCES (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO service_role;

GRANT REFERENCES (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO service_role;

GRANT REFERENCES (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO service_role;

GRANT REFERENCES (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO service_role;

GRANT REFERENCES (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT REFERENCES (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO service_role;

GRANT REFERENCES (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO service_role;

GRANT REFERENCES (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO service_role;

GRANT REFERENCES (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO postgres WITH GRANT OPTION;

GRANT REFERENCES (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO service_role;

GRANT REFERENCES (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO postgres WITH GRANT OPTION;

GRANT REFERENCES (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO service_role;

GRANT REFERENCES (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO postgres WITH GRANT OPTION;

GRANT REFERENCES (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO service_role;

GRANT REFERENCES (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO postgres WITH GRANT OPTION;

GRANT REFERENCES (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO service_role;

GRANT REFERENCES (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO postgres WITH GRANT OPTION;

GRANT REFERENCES (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO service_role;

GRANT REFERENCES (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO postgres WITH GRANT OPTION;

GRANT REFERENCES (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT REFERENCES (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO postgres WITH GRANT OPTION;

GRANT REFERENCES (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO service_role;

GRANT REFERENCES (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO service_role;

GRANT REFERENCES (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT REFERENCES (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO service_role;

GRANT REFERENCES (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO service_role;

GRANT REFERENCES (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO service_role;

GRANT REFERENCES (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO service_role;

GRANT REFERENCES (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO service_role;

GRANT REFERENCES (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO service_role;

GRANT REFERENCES (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO postgres WITH GRANT OPTION;

GRANT REFERENCES (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT REFERENCES (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO postgres WITH GRANT OPTION;

GRANT REFERENCES (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO service_role;

GRANT REFERENCES (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO postgres WITH GRANT OPTION;

GRANT REFERENCES (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT REFERENCES (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO postgres WITH GRANT OPTION;

GRANT REFERENCES (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO service_role;

GRANT REFERENCES (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO postgres WITH GRANT OPTION;

GRANT REFERENCES (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO service_role;

GRANT REFERENCES (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO postgres WITH GRANT OPTION;

GRANT REFERENCES (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO service_role;

GRANT REFERENCES (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO postgres WITH GRANT OPTION;

GRANT REFERENCES (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO service_role;

GRANT REFERENCES (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO postgres WITH GRANT OPTION;

GRANT REFERENCES (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO service_role;

GRANT REFERENCES (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO postgres WITH GRANT OPTION;

GRANT REFERENCES (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO service_role;

GRANT REFERENCES (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO postgres WITH GRANT OPTION;

GRANT REFERENCES (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO service_role;

GRANT REFERENCES (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO postgres WITH GRANT OPTION;

GRANT REFERENCES (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO service_role;

GRANT REFERENCES (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO postgres WITH GRANT OPTION;

GRANT REFERENCES (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO service_role;

GRANT REFERENCES (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO postgres WITH GRANT OPTION;

GRANT REFERENCES (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO service_role;

GRANT REFERENCES (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO postgres WITH GRANT OPTION;

GRANT REFERENCES (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO service_role;

GRANT REFERENCES (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO postgres WITH GRANT OPTION;

GRANT REFERENCES (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO service_role;

GRANT REFERENCES (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO postgres WITH GRANT OPTION;

GRANT REFERENCES (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO service_role;

GRANT REFERENCES (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO postgres WITH GRANT OPTION;

GRANT REFERENCES (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO service_role;

GRANT REFERENCES (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO postgres WITH GRANT OPTION;

GRANT REFERENCES (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO service_role;

GRANT REFERENCES (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO postgres WITH GRANT OPTION;

GRANT REFERENCES (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO service_role;

GRANT REFERENCES (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO postgres WITH GRANT OPTION;

GRANT REFERENCES (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT REFERENCES (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO postgres WITH GRANT OPTION;

GRANT REFERENCES (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO service_role;

GRANT REFERENCES (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO postgres WITH GRANT OPTION;

GRANT REFERENCES (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO service_role;

GRANT SELECT (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO authenticated;

GRANT SELECT (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO postgres WITH GRANT OPTION;

GRANT SELECT (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO service_role;

GRANT SELECT (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO authenticated;

GRANT SELECT (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO postgres WITH GRANT OPTION;

GRANT SELECT (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO service_role;

GRANT SELECT (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO authenticated;

GRANT SELECT (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO postgres WITH GRANT OPTION;

GRANT SELECT (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO service_role;

GRANT SELECT (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO authenticated;

GRANT SELECT (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO postgres WITH GRANT OPTION;

GRANT SELECT (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO service_role;

GRANT SELECT (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO authenticated;

GRANT SELECT (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO postgres WITH GRANT OPTION;

GRANT SELECT (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO service_role;

GRANT SELECT (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO authenticated;

GRANT SELECT (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO postgres WITH GRANT OPTION;

GRANT SELECT (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO service_role;

GRANT SELECT (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO authenticated;

GRANT SELECT (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO postgres WITH GRANT OPTION;

GRANT SELECT (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO service_role;

GRANT SELECT (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO authenticated;

GRANT SELECT (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO postgres WITH GRANT OPTION;

GRANT SELECT (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT SELECT (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO authenticated;

GRANT SELECT (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO postgres WITH GRANT OPTION;

GRANT SELECT (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO service_role;

GRANT SELECT (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO authenticated;

GRANT SELECT (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO postgres WITH GRANT OPTION;

GRANT SELECT (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO service_role;

GRANT SELECT (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO authenticated;

GRANT SELECT (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO postgres WITH GRANT OPTION;

GRANT SELECT (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO service_role;

GRANT SELECT (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO authenticated;

GRANT SELECT (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO postgres WITH GRANT OPTION;

GRANT SELECT (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO service_role;

GRANT SELECT (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO authenticated;

GRANT SELECT (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO postgres WITH GRANT OPTION;

GRANT SELECT (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO service_role;

GRANT SELECT (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO authenticated;

GRANT SELECT (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO postgres WITH GRANT OPTION;

GRANT SELECT (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO service_role;

GRANT SELECT (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO authenticated;

GRANT SELECT (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO postgres WITH GRANT OPTION;

GRANT SELECT (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO service_role;

GRANT SELECT (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO authenticated;

GRANT SELECT (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO postgres WITH GRANT OPTION;

GRANT SELECT (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO service_role;

GRANT SELECT (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO authenticated;

GRANT SELECT (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO postgres WITH GRANT OPTION;

GRANT SELECT (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT SELECT (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO authenticated;

GRANT SELECT (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO postgres WITH GRANT OPTION;

GRANT SELECT (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO service_role;

GRANT SELECT (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO authenticated;

GRANT SELECT (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO service_role;

GRANT SELECT (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO authenticated;

GRANT SELECT (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT SELECT (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO authenticated;

GRANT SELECT (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO service_role;

GRANT SELECT (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO authenticated;

GRANT SELECT (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO service_role;

GRANT SELECT (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO authenticated;

GRANT SELECT (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO service_role;

GRANT SELECT (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO authenticated;

GRANT SELECT (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO service_role;

GRANT SELECT (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO authenticated;

GRANT SELECT (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO service_role;

GRANT SELECT (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO authenticated;

GRANT SELECT (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO service_role;

GRANT SELECT (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO authenticated;

GRANT SELECT (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO postgres WITH GRANT OPTION;

GRANT SELECT (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT SELECT (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO authenticated;

GRANT SELECT (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO postgres WITH GRANT OPTION;

GRANT SELECT (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO service_role;

GRANT SELECT (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO authenticated;

GRANT SELECT (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO postgres WITH GRANT OPTION;

GRANT SELECT (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT SELECT (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO authenticated;

GRANT SELECT (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO postgres WITH GRANT OPTION;

GRANT SELECT (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO service_role;

GRANT SELECT (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO authenticated;

GRANT SELECT (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO postgres WITH GRANT OPTION;

GRANT SELECT (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO service_role;

GRANT SELECT (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO authenticated;

GRANT SELECT (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO postgres WITH GRANT OPTION;

GRANT SELECT (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO service_role;

GRANT SELECT (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO authenticated;

GRANT SELECT (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO postgres WITH GRANT OPTION;

GRANT SELECT (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO service_role;

GRANT SELECT (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO authenticated;

GRANT SELECT (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO postgres WITH GRANT OPTION;

GRANT SELECT (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO service_role;

GRANT SELECT (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO authenticated;

GRANT SELECT (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO postgres WITH GRANT OPTION;

GRANT SELECT (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO service_role;

GRANT SELECT (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO authenticated;

GRANT SELECT (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO postgres WITH GRANT OPTION;

GRANT SELECT (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO service_role;

GRANT SELECT (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO authenticated;

GRANT SELECT (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO postgres WITH GRANT OPTION;

GRANT SELECT (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO service_role;

GRANT SELECT (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO authenticated;

GRANT SELECT (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO postgres WITH GRANT OPTION;

GRANT SELECT (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO service_role;

GRANT SELECT (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO authenticated;

GRANT SELECT (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO postgres WITH GRANT OPTION;

GRANT SELECT (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO service_role;

GRANT SELECT (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO authenticated;

GRANT SELECT (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO postgres WITH GRANT OPTION;

GRANT SELECT (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO service_role;

GRANT SELECT (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO authenticated;

GRANT SELECT (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO postgres WITH GRANT OPTION;

GRANT SELECT (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO service_role;

GRANT SELECT (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO authenticated;

GRANT SELECT (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO postgres WITH GRANT OPTION;

GRANT SELECT (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO service_role;

GRANT SELECT (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO authenticated;

GRANT SELECT (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO postgres WITH GRANT OPTION;

GRANT SELECT (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO service_role;

GRANT SELECT (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO authenticated;

GRANT SELECT (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO postgres WITH GRANT OPTION;

GRANT SELECT (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO service_role;

GRANT SELECT (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO authenticated;

GRANT SELECT (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO postgres WITH GRANT OPTION;

GRANT SELECT (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO service_role;

GRANT SELECT (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO authenticated;

GRANT SELECT (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO postgres WITH GRANT OPTION;

GRANT SELECT (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT SELECT (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO authenticated;

GRANT SELECT (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO postgres WITH GRANT OPTION;

GRANT SELECT (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO service_role;

GRANT SELECT (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO authenticated;

GRANT SELECT (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO postgres WITH GRANT OPTION;

GRANT SELECT (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO service_role;

GRANT SELECT ON TABLE public.condominium_audit_log TO authenticated;

GRANT SELECT ON TABLE public.condominium_fiscal_carryover_compensations TO authenticated;

GRANT SELECT ON TABLE public.condominium_fiscal_carryovers TO authenticated;

GRANT SELECT ON TABLE public.condominium_payment_movements TO authenticated;

GRANT SELECT ON TABLE public.condominium_payment_reversal_audit TO authenticated;

GRANT UPDATE (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO authenticated;

GRANT UPDATE (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO postgres WITH GRANT OPTION;

GRANT UPDATE (accounting_end_date, accounting_start_date, condominium_id, created_at, extraordinary_allow_multi_year, extraordinary_mode, id, ordinary_due_dates, ordinary_installment_count, updated_at, workspace_id) ON TABLE public.condominium_accounting_settings TO service_role;

GRANT UPDATE (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO authenticated;

GRANT UPDATE (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO postgres WITH GRANT OPTION;

GRANT UPDATE (accounting_resolution_status, accounting_snapshot, cadastral_protocol, cadastral_protocol_date, condominium_id, confirmed_at, confirmed_by, created_at, created_by, data, destination_unit_count, effective_date, id, millesimal_review_status, millesimal_snapshot, notes, source_unit_count, status, transformation_type, updated_at, workspace_id) ON TABLE public.condominium_unit_transformations TO service_role;

GRANT UPDATE (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO postgres WITH GRANT OPTION;

GRANT UPDATE (action, condominium_id, created_at, data, description, entity_id, entity_type, id, workspace_id) ON TABLE public.condominium_audit_log TO service_role;

GRANT UPDATE (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO authenticated;

GRANT UPDATE (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, allocated_amount, available_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, target_remaining_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_fund_availability TO service_role;

GRANT UPDATE (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO authenticated;

GRANT UPDATE (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, allocated_amount, condominium_id, created_at, id, name, notes, purpose, target_amount, updated_at, used_amount, workspace_id) ON TABLE public.condominium_funds TO service_role;

GRANT UPDATE (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO authenticated;

GRANT UPDATE (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, allocation_table_id, category, condominium_id, created_at, expense_type, id, name, notes, priority, updated_at, workspace_id) ON TABLE public.condominium_allocation_rules TO service_role;

GRANT UPDATE (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO authenticated;

GRANT UPDATE (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, apartment, condominium_id, created_at, data, email, id, legacy_id, member_id, name, permissions, role, updated_at, user_id, workspace_id) ON TABLE public.portal_access TO service_role;

GRANT UPDATE (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO authenticated;

GRANT UPDATE (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, basis_type, condominium_id, created_at, description, id, name, notes, scope_building_codes, scope_mode, scope_unit_ids, total_millesimi, updated_at, workspace_id) ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT UPDATE (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO authenticated;

GRANT UPDATE (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, company_name, condominium_id, contact_email, contact_name, contact_phone, coverage, created_at, deductible, document_id, end_date, id, notes, policy_number, policy_type, premium, start_date, updated_at, workspace_id) ON TABLE public.condominium_insurance_policies TO service_role;

GRANT UPDATE (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO authenticated;

GRANT UPDATE (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, condominium_id, created_at, data, email, id, legacy_id, name, permissions, role, unit_id, updated_at, user_id) ON TABLE public.condominium_members TO service_role;

GRANT UPDATE (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO authenticated;

GRANT UPDATE (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, condominium_id, created_at, legacy_id, permissions, role, user_id, workspace_id) ON TABLE public.workspace_members TO service_role;

GRANT UPDATE (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO postgres WITH GRANT OPTION;

GRANT UPDATE (active, created_at, email, full_name, id, role, updated_at) ON TABLE public.profiles TO service_role;

GRANT UPDATE (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO authenticated;

GRANT UPDATE (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO postgres WITH GRANT OPTION;

GRANT UPDATE (activity_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.activities TO service_role;

GRANT UPDATE (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO authenticated;

GRANT UPDATE (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO postgres WITH GRANT OPTION;

GRANT UPDATE (actual_amount, actual_end_date, approved_amount, category, condominium_id, created_at, data, description, estimated_amount, expected_end_date, fund_id, id, notes, paid_amount, payment_status, priority, progress_percent, register_item_id, remaining_amount, start_date, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_works TO service_role;

GRANT UPDATE (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO authenticated;

GRANT UPDATE (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO postgres WITH GRANT OPTION;

GRANT UPDATE (address, archive_reason, archived_at, archived_by, city, created_at, data, id, legacy_id, name, postal_code, province, updated_at, workspace_id) ON TABLE public.condominiums TO service_role;

GRANT UPDATE (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO authenticated;

GRANT UPDATE (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO postgres WITH GRANT OPTION;

GRANT UPDATE (allocation_basis, allocation_table_id, amount, condominium_id, created_at, due_date, id, ledger_entry_id, member_id, millesimi, notes, paid_amount, status, unit_id, updated_at, workspace_id) ON TABLE public.condominium_expense_allocations TO service_role;

GRANT UPDATE (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO authenticated;

GRANT UPDATE (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO postgres WITH GRANT OPTION;

GRANT UPDATE (allocation_table_id, condominium_id, confirmed_at, confirmed_by, created_at, created_by, description, document_id, expense_amount, extracted_data, id, ledger_entry_id, notes, rows, source, status, title, updated_at, validation_errors, workspace_id) ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT UPDATE (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO authenticated;

GRANT UPDATE (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO postgres WITH GRANT OPTION;

GRANT UPDATE (allocation_value, charge_amount, condominium_id, consumption, created_at, current_reading, data, fiscal_year_id, id, kwh, meter_code, notes, period_end, period_start, previous_reading, service_type, source, unit_id, updated_at, workspace_id) ON TABLE public.condominium_consumption_readings TO service_role;

GRANT UPDATE (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO authenticated;

GRANT UPDATE (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, assembly_id, category, condominium_id, created_at, data, deliberation_date, description, direction, document_id, due_date, entry_date, expense_type, fiscal_year_id, fund_id, id, member_id, notes, payment_status, supplier_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_ledger_entries TO service_role;

GRANT UPDATE (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, carryover_id, condominium_id, created_at, created_by, id, notes, target_installment_id, workspace_id) ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT UPDATE (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO authenticated;

GRANT UPDATE (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, category, condominium_id, created_at, description, fiscal_year_id, id, notes, updated_at, workspace_id) ON TABLE public.condominium_budgets TO service_role;

GRANT UPDATE (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO authenticated;

GRANT UPDATE (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, category, condominium_id, created_at, due_date, id, notes, status, title, updated_at, workspace_id) ON TABLE public.condominium_tax_obligations TO service_role;

GRANT UPDATE (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO authenticated;

GRANT UPDATE (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, condominium_id, created_at, data, description, event_date, event_type, id, title, work_id, workspace_id) ON TABLE public.condominium_work_events TO service_role;

GRANT UPDATE (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO authenticated;

GRANT UPDATE (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, condominium_id, created_at, due_date, fiscal_year_id, id, ledger_entry_id, member_id, notes, paid_amount, status, title, unit_id, updated_at, workspace_id) ON TABLE public.condominium_installments TO service_role;

GRANT UPDATE (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, condominium_id, created_at, id, installment_id, method, notes, payment_date, reference, workspace_id) ON TABLE public.condominium_payment_movements TO service_role;

GRANT UPDATE (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO authenticated;

GRANT UPDATE (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, condominium_id, created_at, id, ledger_entry_id, notes, paid_amount, payment_entry_id, percentage, progress_date, progress_no, status, title, updated_at, work_id, workspace_id) ON TABLE public.condominium_work_progress TO service_role;

GRANT UPDATE (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO postgres WITH GRANT OPTION;

GRANT UPDATE (amount, condominium_id, id, installment_id, method, notes, original_payment_id, payment_date, reference, reversal_reason, reversed_at, reversed_by, workspace_id) ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT UPDATE (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO authenticated;

GRANT UPDATE (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO postgres WITH GRANT OPTION;

GRANT UPDATE (assembly_date, condominium_id, created_at, data, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.assemblies TO service_role;

GRANT UPDATE (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO postgres WITH GRANT OPTION;

GRANT UPDATE (balance, condominium_id, created_at, id, kind, member_id, notes, source_fiscal_year_id, status, target_fiscal_year_id, unit_id, updated_at, workspace_id) ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT UPDATE (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO authenticated;

GRANT UPDATE (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO postgres WITH GRANT OPTION;

GRANT UPDATE (body, condominium_id, created_at, data, email_prepared_at, email_status, id, legacy_id, published, title, updated_at, workspace_id) ON TABLE public.communications TO service_role;

GRANT UPDATE (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO authenticated;

GRANT UPDATE (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO postgres WITH GRANT OPTION;

GRANT UPDATE (bounced_at, communication_id, complained_at, condominium_id, created_at, delivered_at, email, error_message, event_type, id, member_id, name, provider_event_id, provider_message_id, queued_at, recipient_role, sent_at, status, updated_at, user_id, workspace_id) ON TABLE public.communication_recipients TO service_role;

GRANT UPDATE (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO authenticated;

GRANT UPDATE (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO postgres WITH GRANT OPTION;

GRANT UPDATE (building_code, condominium_id, created_at, data, id, legacy_id, lifecycle_effective_date, lifecycle_status, superseded_at, unit_code, updated_at, workspace_id) ON TABLE public.condominium_units TO service_role;

GRANT UPDATE (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO authenticated;

GRANT UPDATE (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO postgres WITH GRANT OPTION;

GRANT UPDATE (business_name, category, condominium_id, contact_name, contract_end, contract_start, created_at, data, email, fiscal_code, id, notes, phone, updated_at, vat_number, workspace_id) ON TABLE public.condominium_suppliers TO service_role;

GRANT UPDATE (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO authenticated;

GRANT UPDATE (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO postgres WITH GRANT OPTION;

GRANT UPDATE (category, condominium_id, created_at, data, document_id, estimated_amount, expiry_date, id, item_type, location, notes, responsible, status, supplier_id, title, updated_at, workspace_id) ON TABLE public.condominium_register_items TO service_role;

GRANT UPDATE (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO authenticated;

GRANT UPDATE (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO postgres WITH GRANT OPTION;

GRANT UPDATE (category, condominium_id, created_at, data, file_path, file_size_bytes, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.documents TO service_role;

GRANT UPDATE (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO authenticated;

GRANT UPDATE (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO postgres WITH GRANT OPTION;

GRANT UPDATE (category, condominium_id, created_at, data, id, legacy_id, name, status, updated_at, workspace_id) ON TABLE public.suppliers TO service_role;

GRANT UPDATE (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO authenticated;

GRANT UPDATE (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO postgres WITH GRANT OPTION;

GRANT UPDATE (closed_at, closed_by, condominium_id, created_at, created_by, data, id, incoming_member_id, notes, outgoing_member_id, status, transfer_date, transfer_type, unit_id, updated_at, workspace_id) ON TABLE public.condominium_member_transfers TO service_role;

GRANT UPDATE (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO authenticated;

GRANT UPDATE (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO postgres WITH GRANT OPTION;

GRANT UPDATE (closed_date, condominium_id, counterpart, created_at, data, id, notes, opened_date, status, title, updated_at, workspace_id) ON TABLE public.condominium_legal_cases TO service_role;

GRANT UPDATE (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO authenticated;

GRANT UPDATE (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO postgres WITH GRANT OPTION;

GRANT UPDATE (condominium_id, created_at, data, description, id, legacy_id, member_id, requester_user_id, status, title, updated_at, workspace_id) ON TABLE public.condominium_requests TO service_role;

GRANT UPDATE (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO authenticated;

GRANT UPDATE (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO postgres WITH GRANT OPTION;

GRANT UPDATE (condominium_id, created_at, data, due_date, id, legacy_id, status, title, updated_at, workspace_id) ON TABLE public.deadlines TO service_role;

GRANT UPDATE (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO authenticated;

GRANT UPDATE (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO postgres WITH GRANT OPTION;

GRANT UPDATE (condominium_id, created_at, document_id, id, notes, title, work_id, workspace_id) ON TABLE public.condominium_work_documents TO service_role;

GRANT UPDATE (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO authenticated;

GRANT UPDATE (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO postgres WITH GRANT OPTION;

GRANT UPDATE (condominium_id, created_at, end_date, id, name, notes, opening_balance, start_date, status, updated_at, workspace_id) ON TABLE public.condominium_fiscal_years TO service_role;

GRANT UPDATE (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO authenticated;

GRANT UPDATE (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO postgres WITH GRANT OPTION;

GRANT UPDATE (condominium_id, created_at, excluded, id, notes, table_id, unit_id, updated_at, value, workspace_id) ON TABLE public.condominium_millesimal_values TO service_role;

GRANT UPDATE (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO authenticated;

GRANT UPDATE (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO postgres WITH GRANT OPTION;

GRANT UPDATE (condominium_name, created_at, email, fiscal_code, full_name, id, matched_member_id, note, requested_user_id, reviewed_at, reviewed_by, status, updated_at, workspace_id) ON TABLE public.portal_registration_requests TO service_role;

GRANT UPDATE (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO authenticated;

GRANT UPDATE (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO postgres WITH GRANT OPTION;

GRANT UPDATE (confirmed_at, confirmed_by, created_at, created_by, created_condominium_id, extracted_data, id, notes, source, source_documents, status, structure, updated_at, validation_errors, warnings, workspace_id) ON TABLE public.condominium_creation_intakes TO service_role;

GRANT UPDATE (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO authenticated;

GRANT UPDATE (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO postgres WITH GRANT OPTION;

GRANT UPDATE (created_at, direction, id, sequence_no, transformation_id, unit_id, unit_snapshot) ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT UPDATE (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO authenticated;

GRANT UPDATE (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO postgres WITH GRANT OPTION;

GRANT UPDATE (created_at, id, name, plan, updated_at) ON TABLE public.workspaces TO service_role;

GRANT UPDATE (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO authenticated;

GRANT UPDATE (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO postgres WITH GRANT OPTION;

GRANT UPDATE (personal_code_enabled, personal_code_hash, updated_at, user_id) ON TABLE public.user_security_settings TO service_role;

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT USAGE ON SCHEMA public TO PUBLIC;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO service_role;
