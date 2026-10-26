-- BETHAG baseline: indexes and views.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

CREATE INDEX activities_condominium_id_idx ON public.activities USING btree (condominium_id);

CREATE INDEX idx_activities_workspace ON public.activities USING btree (workspace_id);

CREATE UNIQUE INDEX uq_activities_workspace_legacy ON public.activities USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX assemblies_condominium_id_idx ON public.assemblies USING btree (condominium_id);

CREATE INDEX idx_assemblies_workspace ON public.assemblies USING btree (workspace_id);

CREATE UNIQUE INDEX uq_assemblies_workspace_legacy ON public.assemblies USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE UNIQUE INDEX communication_recipients_communication_email_uq ON public.communication_recipients USING btree (communication_id, lower(btrim(email)));

CREATE INDEX communication_recipients_condominium_id_idx ON public.communication_recipients USING btree (condominium_id);

CREATE INDEX communication_recipients_member_idx ON public.communication_recipients USING btree (member_id);

CREATE UNIQUE INDEX communication_recipients_provider_event_uq ON public.communication_recipients USING btree (provider_event_id) WHERE (provider_event_id IS NOT NULL);

CREATE INDEX communication_recipients_provider_message_idx ON public.communication_recipients USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);

CREATE INDEX communication_recipients_stale_queued_idx ON public.communication_recipients USING btree (status, queued_at) WHERE (status = 'queued'::text);

CREATE INDEX communication_recipients_status_idx ON public.communication_recipients USING btree (communication_id, status);

CREATE INDEX communication_recipients_user_id_idx ON public.communication_recipients USING btree (user_id);

CREATE INDEX communication_recipients_workspace_idx ON public.communication_recipients USING btree (workspace_id);

CREATE INDEX communications_condominium_id_idx ON public.communications USING btree (condominium_id);

CREATE INDEX idx_communications_workspace ON public.communications USING btree (workspace_id);

CREATE UNIQUE INDEX uq_communications_workspace_legacy ON public.communications USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX condominium_accounting_settings_condo_idx ON public.condominium_accounting_settings USING btree (condominium_id);

CREATE INDEX condominium_allocation_intakes_allocation_table_id_idx ON public.condominium_allocation_intakes USING btree (allocation_table_id);

CREATE INDEX condominium_allocation_intakes_condominium_id_idx ON public.condominium_allocation_intakes USING btree (condominium_id);

CREATE INDEX condominium_allocation_intakes_confirmed_by_idx ON public.condominium_allocation_intakes USING btree (confirmed_by);

CREATE INDEX condominium_allocation_intakes_created_by_idx ON public.condominium_allocation_intakes USING btree (created_by);

CREATE INDEX condominium_allocation_intakes_document_id_idx ON public.condominium_allocation_intakes USING btree (document_id);

CREATE INDEX condominium_allocation_intakes_ledger_entry_id_idx ON public.condominium_allocation_intakes USING btree (ledger_entry_id);

CREATE INDEX condominium_allocation_intakes_lookup_idx ON public.condominium_allocation_intakes USING btree (workspace_id, condominium_id, status, created_at DESC);

CREATE INDEX condominium_allocation_rules_condominium_fk_idx ON public.condominium_allocation_rules USING btree (condominium_id);

CREATE INDEX condominium_allocation_rules_lookup_idx ON public.condominium_allocation_rules USING btree (workspace_id, condominium_id, active, priority, category, expense_type);

CREATE INDEX condominium_allocation_rules_table_fk_idx ON public.condominium_allocation_rules USING btree (allocation_table_id);

CREATE INDEX condominium_audit_log_condominium_fk_idx ON public.condominium_audit_log USING btree (condominium_id);

CREATE INDEX condominium_audit_log_scope_idx ON public.condominium_audit_log USING btree (workspace_id, condominium_id, created_at DESC);

CREATE INDEX condominium_budgets_condominium_fk_idx ON public.condominium_budgets USING btree (condominium_id);

CREATE INDEX condominium_budgets_fiscal_year_fk_idx ON public.condominium_budgets USING btree (fiscal_year_id);

CREATE INDEX condominium_budgets_workspace_year_idx ON public.condominium_budgets USING btree (workspace_id, condominium_id, fiscal_year_id);

CREATE INDEX condominium_consumption_readings_condominium_fk_idx ON public.condominium_consumption_readings USING btree (condominium_id);

CREATE INDEX condominium_consumption_readings_fiscal_year_fk_idx ON public.condominium_consumption_readings USING btree (fiscal_year_id);

CREATE INDEX condominium_consumption_readings_lookup_idx ON public.condominium_consumption_readings USING btree (workspace_id, condominium_id, fiscal_year_id, service_type, unit_id);

CREATE UNIQUE INDEX condominium_consumption_readings_unique_idx ON public.condominium_consumption_readings USING btree (workspace_id, condominium_id, fiscal_year_id, unit_id, service_type, meter_code, period_start, period_end);

CREATE INDEX condominium_consumption_readings_unit_fk_idx ON public.condominium_consumption_readings USING btree (unit_id);

CREATE INDEX condominium_creation_intakes_confirmed_by_idx ON public.condominium_creation_intakes USING btree (confirmed_by);

CREATE INDEX condominium_creation_intakes_created_by_idx ON public.condominium_creation_intakes USING btree (created_by);

CREATE INDEX condominium_creation_intakes_created_condominium_idx ON public.condominium_creation_intakes USING btree (created_condominium_id) WHERE (created_condominium_id IS NOT NULL);

CREATE INDEX condominium_creation_intakes_workspace_status_idx ON public.condominium_creation_intakes USING btree (workspace_id, status, created_at DESC);

CREATE INDEX idx_condominium_creation_intakes_status ON public.condominium_creation_intakes USING btree (workspace_id, status);

CREATE INDEX idx_condominium_creation_intakes_workspace ON public.condominium_creation_intakes USING btree (workspace_id, created_at DESC);

CREATE INDEX condominium_expense_allocations_condominium_idx ON public.condominium_expense_allocations USING btree (condominium_id);

CREATE INDEX condominium_expense_allocations_ledger_idx ON public.condominium_expense_allocations USING btree (ledger_entry_id);

CREATE INDEX condominium_expense_allocations_member_idx ON public.condominium_expense_allocations USING btree (member_id);

CREATE INDEX condominium_expense_allocations_table_idx ON public.condominium_expense_allocations USING btree (allocation_table_id);

CREATE INDEX condominium_expense_allocations_unit_idx ON public.condominium_expense_allocations USING btree (unit_id);

CREATE INDEX condominium_expense_allocations_workspace_idx ON public.condominium_expense_allocations USING btree (workspace_id);

CREATE INDEX condominium_expense_allocations_workspace_ledger_idx ON public.condominium_expense_allocations USING btree (workspace_id, condominium_id, ledger_entry_id);

CREATE INDEX condominium_fiscal_carryover_compensations_carryover_id_idx ON public.condominium_fiscal_carryover_compensations USING btree (carryover_id);

CREATE INDEX condominium_fiscal_carryover_compensations_condominium_id_idx ON public.condominium_fiscal_carryover_compensations USING btree (condominium_id);

CREATE INDEX condominium_fiscal_carryover_compensations_created_by_idx ON public.condominium_fiscal_carryover_compensations USING btree (created_by);

CREATE INDEX condominium_fiscal_carryover_compensations_target_installment_i ON public.condominium_fiscal_carryover_compensations USING btree (target_installment_id);

CREATE INDEX condominium_fiscal_carryovers_condominium_id_idx ON public.condominium_fiscal_carryovers USING btree (condominium_id);

CREATE INDEX condominium_fiscal_carryovers_member_id_idx ON public.condominium_fiscal_carryovers USING btree (member_id);

CREATE INDEX condominium_fiscal_carryovers_source_fiscal_year_id_idx ON public.condominium_fiscal_carryovers USING btree (source_fiscal_year_id);

CREATE INDEX condominium_fiscal_carryovers_target_fiscal_year_id_idx ON public.condominium_fiscal_carryovers USING btree (target_fiscal_year_id);

CREATE INDEX condominium_fiscal_carryovers_target_idx ON public.condominium_fiscal_carryovers USING btree (workspace_id, condominium_id, target_fiscal_year_id);

CREATE UNIQUE INDEX condominium_fiscal_carryovers_unique_period_position ON public.condominium_fiscal_carryovers USING btree (workspace_id, condominium_id, source_fiscal_year_id, target_fiscal_year_id, unit_id, COALESCE(member_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX condominium_fiscal_carryovers_unit_idx ON public.condominium_fiscal_carryovers USING btree (unit_id);

CREATE INDEX condominium_fiscal_years_condominium_idx ON public.condominium_fiscal_years USING btree (condominium_id);

CREATE UNIQUE INDEX condominium_fiscal_years_unique ON public.condominium_fiscal_years USING btree (condominium_id, start_date, end_date);

CREATE INDEX condominium_fiscal_years_workspace_idx ON public.condominium_fiscal_years USING btree (workspace_id);

CREATE INDEX condominium_funds_condominium_idx ON public.condominium_funds USING btree (condominium_id);

CREATE INDEX condominium_funds_workspace_idx ON public.condominium_funds USING btree (workspace_id);

CREATE INDEX condominium_installments_condominium_idx ON public.condominium_installments USING btree (condominium_id);

CREATE INDEX condominium_installments_due_date_idx ON public.condominium_installments USING btree (due_date);

CREATE INDEX condominium_installments_fiscal_year_fk_idx ON public.condominium_installments USING btree (fiscal_year_id);

CREATE INDEX condominium_installments_member_idx ON public.condominium_installments USING btree (member_id);

CREATE INDEX condominium_installments_unit_idx ON public.condominium_installments USING btree (unit_id);

CREATE INDEX condominium_installments_workspace_idx ON public.condominium_installments USING btree (workspace_id);

CREATE INDEX idx_condominium_installments_ledger_entry_id ON public.condominium_installments USING btree (ledger_entry_id);

CREATE INDEX condominium_insurance_policies_condominium_id_idx ON public.condominium_insurance_policies USING btree (condominium_id);

CREATE INDEX condominium_insurance_policies_condominium_idx ON public.condominium_insurance_policies USING btree (condominium_id, end_date);

CREATE INDEX idx_condominium_insurance_policies_condo ON public.condominium_insurance_policies USING btree (workspace_id, condominium_id, end_date);

CREATE INDEX condominium_ledger_entries_assembly_id_idx ON public.condominium_ledger_entries USING btree (assembly_id);

CREATE INDEX condominium_ledger_entries_condominium_idx ON public.condominium_ledger_entries USING btree (condominium_id);

CREATE INDEX condominium_ledger_entries_deliberation_date_idx ON public.condominium_ledger_entries USING btree (condominium_id, deliberation_date) WHERE (deliberation_date IS NOT NULL);

CREATE INDEX condominium_ledger_entries_document_idx ON public.condominium_ledger_entries USING btree (document_id);

CREATE INDEX condominium_ledger_entries_fiscal_year_idx ON public.condominium_ledger_entries USING btree (fiscal_year_id);

CREATE INDEX condominium_ledger_entries_fund_idx ON public.condominium_ledger_entries USING btree (fund_id);

CREATE INDEX condominium_ledger_entries_lookup ON public.condominium_ledger_entries USING btree (condominium_id, entry_date);

CREATE INDEX condominium_ledger_entries_member_idx ON public.condominium_ledger_entries USING btree (member_id);

CREATE UNIQUE INDEX condominium_ledger_entries_outgoing_document_key ON public.condominium_ledger_entries USING btree (document_id) WHERE ((direction = 'Uscita'::text) AND (document_id IS NOT NULL));

CREATE INDEX condominium_ledger_entries_supplier_idx ON public.condominium_ledger_entries USING btree (supplier_id);

CREATE INDEX condominium_ledger_entries_unit_idx ON public.condominium_ledger_entries USING btree (unit_id);

CREATE INDEX condominium_ledger_entries_workspace_idx ON public.condominium_ledger_entries USING btree (workspace_id);

CREATE INDEX condominium_legal_cases_condominium_idx ON public.condominium_legal_cases USING btree (condominium_id);

CREATE INDEX condominium_legal_cases_workspace_idx ON public.condominium_legal_cases USING btree (workspace_id);

CREATE INDEX condominium_member_transfers_closed_by_idx ON public.condominium_member_transfers USING btree (closed_by);

CREATE INDEX condominium_member_transfers_condo_date_idx ON public.condominium_member_transfers USING btree (condominium_id, transfer_date DESC);

CREATE INDEX condominium_member_transfers_created_by_idx ON public.condominium_member_transfers USING btree (created_by);

CREATE INDEX condominium_member_transfers_incoming_member_id_idx ON public.condominium_member_transfers USING btree (incoming_member_id);

CREATE INDEX condominium_member_transfers_outgoing_member_id_idx ON public.condominium_member_transfers USING btree (outgoing_member_id);

CREATE UNIQUE INDEX condominium_member_transfers_unit_date_confirmed_uidx ON public.condominium_member_transfers USING btree (unit_id, transfer_date) WHERE (status = ANY (ARRAY['Confermato'::text, 'Chiuso'::text]));

CREATE INDEX condominium_member_transfers_unit_date_idx ON public.condominium_member_transfers USING btree (unit_id, transfer_date DESC);

CREATE INDEX condominium_member_transfers_workspace_id_idx ON public.condominium_member_transfers USING btree (workspace_id);

CREATE INDEX condominium_members_unit_idx ON public.condominium_members USING btree (unit_id);

CREATE INDEX condominium_members_user_id_idx ON public.condominium_members USING btree (user_id);

CREATE UNIQUE INDEX uq_members_condominium_legacy ON public.condominium_members USING btree (condominium_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE UNIQUE INDEX condominium_millesimal_tables_active_one_uidx ON public.condominium_millesimal_tables USING btree (condominium_id) WHERE active;

CREATE INDEX condominium_millesimal_tables_condominium_idx ON public.condominium_millesimal_tables USING btree (condominium_id);

CREATE INDEX condominium_millesimal_tables_scope_mode_idx ON public.condominium_millesimal_tables USING btree (workspace_id, condominium_id, scope_mode);

CREATE UNIQUE INDEX condominium_millesimal_tables_workspace_condominium_name_uidx ON public.condominium_millesimal_tables USING btree (workspace_id, condominium_id, lower(btrim(name)));

CREATE INDEX condominium_millesimal_tables_workspace_idx ON public.condominium_millesimal_tables USING btree (workspace_id);

CREATE INDEX condominium_millesimal_values_condominium_fk_idx ON public.condominium_millesimal_values USING btree (condominium_id);

CREATE INDEX condominium_millesimal_values_table_idx ON public.condominium_millesimal_values USING btree (table_id);

CREATE INDEX condominium_millesimal_values_unit_idx ON public.condominium_millesimal_values USING btree (unit_id);

CREATE INDEX condominium_millesimal_values_workspace_idx ON public.condominium_millesimal_values USING btree (workspace_id);

CREATE UNIQUE INDEX condominium_millesimal_values_workspace_table_unit_uidx ON public.condominium_millesimal_values USING btree (workspace_id, table_id, unit_id);

CREATE INDEX condominium_payment_movements_condominium_fk_idx ON public.condominium_payment_movements USING btree (condominium_id);

CREATE INDEX condominium_payment_movements_installment_idx ON public.condominium_payment_movements USING btree (installment_id);

CREATE INDEX condominium_payment_movements_workspace_idx ON public.condominium_payment_movements USING btree (workspace_id);

CREATE INDEX condominium_register_items_condominium_fk_idx ON public.condominium_register_items USING btree (condominium_id);

CREATE INDEX condominium_register_items_supplier_idx ON public.condominium_register_items USING btree (supplier_id);

CREATE INDEX condominium_register_items_workspace_condo_idx ON public.condominium_register_items USING btree (workspace_id, condominium_id, item_type, expiry_date);

CREATE INDEX condominium_requests_condominium_id_idx ON public.condominium_requests USING btree (condominium_id);

CREATE INDEX condominium_requests_condominium_status_idx ON public.condominium_requests USING btree (condominium_id, status, created_at DESC);

CREATE INDEX condominium_requests_member_id_idx ON public.condominium_requests USING btree (member_id);

CREATE INDEX condominium_requests_requester_idx ON public.condominium_requests USING btree (requester_user_id, created_at DESC) WHERE (requester_user_id IS NOT NULL);

CREATE INDEX condominium_requests_requester_user_id_idx ON public.condominium_requests USING btree (requester_user_id);

CREATE INDEX idx_requests_workspace ON public.condominium_requests USING btree (workspace_id);

CREATE UNIQUE INDEX uq_requests_workspace_legacy ON public.condominium_requests USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX condominium_suppliers_condominium_fk_idx ON public.condominium_suppliers USING btree (condominium_id);

CREATE INDEX condominium_suppliers_workspace_condo_idx ON public.condominium_suppliers USING btree (workspace_id, condominium_id, category);

CREATE INDEX condominium_tax_obligations_condominium_idx ON public.condominium_tax_obligations USING btree (condominium_id);

CREATE INDEX condominium_tax_obligations_workspace_idx ON public.condominium_tax_obligations USING btree (workspace_id);

CREATE INDEX idx_unit_transform_items_transformation ON public.condominium_unit_transformation_items USING btree (transformation_id);

CREATE INDEX idx_unit_transform_items_unit ON public.condominium_unit_transformation_items USING btree (unit_id);

CREATE INDEX idx_unit_transformations_condo_date ON public.condominium_unit_transformations USING btree (condominium_id, effective_date DESC);

CREATE INDEX idx_unit_transformations_confirmed_by ON public.condominium_unit_transformations USING btree (confirmed_by);

CREATE INDEX idx_unit_transformations_created_by ON public.condominium_unit_transformations USING btree (created_by);

CREATE INDEX idx_unit_transformations_status ON public.condominium_unit_transformations USING btree (status);

CREATE INDEX idx_unit_transformations_workspace ON public.condominium_unit_transformations USING btree (workspace_id);

CREATE INDEX condominium_units_building_code_idx ON public.condominium_units USING btree (workspace_id, condominium_id, building_code);

CREATE UNIQUE INDEX condominium_units_code_building_uq ON public.condominium_units USING btree (condominium_id, lower(btrim(building_code)), lower(btrim(unit_code)));

CREATE INDEX condominium_units_code_lookup_idx ON public.condominium_units USING btree (condominium_id, unit_code);

CREATE INDEX condominium_units_condominium_idx ON public.condominium_units USING btree (condominium_id);

CREATE UNIQUE INDEX condominium_units_condominium_unit_code_normalized_uidx ON public.condominium_units USING btree (condominium_id, lower(TRIM(BOTH FROM unit_code)));

CREATE UNIQUE INDEX condominium_units_unique_unit ON public.condominium_units USING btree (condominium_id, lower(btrim(unit_code)));

CREATE INDEX condominium_units_workspace_idx ON public.condominium_units USING btree (workspace_id);

CREATE INDEX condominium_work_documents_condominium_fk_idx ON public.condominium_work_documents USING btree (condominium_id);

CREATE UNIQUE INDEX condominium_work_documents_work_document_key ON public.condominium_work_documents USING btree (work_id, document_id);

CREATE INDEX condominium_work_documents_work_idx ON public.condominium_work_documents USING btree (work_id);

CREATE INDEX condominium_work_documents_workspace_document_idx ON public.condominium_work_documents USING btree (workspace_id, document_id);

CREATE INDEX condominium_work_documents_workspace_fk_idx ON public.condominium_work_documents USING btree (workspace_id);

CREATE INDEX condominium_work_events_condominium_fk_idx ON public.condominium_work_events USING btree (condominium_id);

CREATE INDEX condominium_work_events_work_idx ON public.condominium_work_events USING btree (work_id, event_date);

CREATE INDEX condominium_work_events_workspace_fk_idx ON public.condominium_work_events USING btree (workspace_id);

CREATE INDEX condominium_work_progress_condominium_fk_idx ON public.condominium_work_progress USING btree (condominium_id);

CREATE INDEX condominium_work_progress_ledger_entry_idx ON public.condominium_work_progress USING btree (ledger_entry_id) WHERE (ledger_entry_id IS NOT NULL);

CREATE INDEX condominium_work_progress_ledger_idx ON public.condominium_work_progress USING btree (ledger_entry_id, payment_entry_id);

CREATE INDEX condominium_work_progress_payment_entry_fk_idx ON public.condominium_work_progress USING btree (payment_entry_id);

CREATE INDEX condominium_work_progress_payment_entry_idx ON public.condominium_work_progress USING btree (payment_entry_id) WHERE (payment_entry_id IS NOT NULL);

CREATE INDEX condominium_work_progress_work_idx ON public.condominium_work_progress USING btree (work_id, progress_date);

CREATE INDEX condominium_work_progress_workspace_fk_idx ON public.condominium_work_progress USING btree (workspace_id);

CREATE INDEX condominium_works_condominium_fk_idx ON public.condominium_works USING btree (condominium_id);

CREATE INDEX condominium_works_fund_idx ON public.condominium_works USING btree (fund_id);

CREATE INDEX condominium_works_register_item_fk_idx ON public.condominium_works USING btree (register_item_id);

CREATE INDEX condominium_works_supplier_fk_idx ON public.condominium_works USING btree (supplier_id);

CREATE INDEX condominium_works_workspace_condo_idx ON public.condominium_works USING btree (workspace_id, condominium_id, status);

CREATE INDEX condominiums_active_workspace_idx ON public.condominiums USING btree (workspace_id, archived_at, name);

CREATE INDEX condominiums_archived_by_idx ON public.condominiums USING btree (archived_by);

CREATE INDEX idx_condominiums_workspace ON public.condominiums USING btree (workspace_id);

CREATE UNIQUE INDEX uq_condominiums_workspace_legacy ON public.condominiums USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX deadlines_condominium_id_idx ON public.deadlines USING btree (condominium_id);

CREATE INDEX idx_deadlines_workspace ON public.deadlines USING btree (workspace_id);

CREATE UNIQUE INDEX uq_deadlines_workspace_legacy ON public.deadlines USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX documents_ai_status_idx ON public.documents USING btree (workspace_id, condominium_id, COALESCE((data ->> 'aiStatus'::text), 'Non elaborato'::text), updated_at DESC);

CREATE INDEX documents_condominium_id_idx ON public.documents USING btree (condominium_id);

CREATE INDEX documents_size_idx ON public.documents USING btree (file_size_bytes) WHERE (file_size_bytes IS NOT NULL);

CREATE INDEX idx_documents_workspace ON public.documents USING btree (workspace_id);

CREATE UNIQUE INDEX uq_documents_workspace_legacy ON public.documents USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX portal_access_condominium_idx ON public.portal_access USING btree (condominium_id);

CREATE INDEX portal_access_email_idx ON public.portal_access USING btree (lower(email));

CREATE INDEX portal_access_member_id_idx ON public.portal_access USING btree (member_id);

CREATE INDEX portal_access_user_id_idx ON public.portal_access USING btree (user_id);

CREATE INDEX portal_access_workspace_idx ON public.portal_access USING btree (workspace_id);

CREATE UNIQUE INDEX uq_portal_access_workspace_condominium_email_ci ON public.portal_access USING btree (workspace_id, condominium_id, lower(email)) WHERE (email IS NOT NULL);

CREATE INDEX idx_portal_registration_requests_email ON public.portal_registration_requests USING btree (lower(email));

CREATE INDEX idx_portal_registration_requests_workspace_status ON public.portal_registration_requests USING btree (workspace_id, status, created_at DESC);

CREATE INDEX portal_registration_requests_matched_member_id_idx ON public.portal_registration_requests USING btree (matched_member_id);

CREATE INDEX portal_registration_requests_requested_user_id_idx ON public.portal_registration_requests USING btree (requested_user_id);

CREATE INDEX portal_registration_requests_reviewed_by_idx ON public.portal_registration_requests USING btree (reviewed_by);

CREATE INDEX idx_suppliers_workspace ON public.suppliers USING btree (workspace_id);

CREATE INDEX suppliers_condominium_id_idx ON public.suppliers USING btree (condominium_id);

CREATE UNIQUE INDEX uq_suppliers_workspace_legacy ON public.suppliers USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE INDEX idx_workspace_members_user ON public.workspace_members USING btree (user_id);

CREATE INDEX workspace_members_condominium_id_idx ON public.workspace_members USING btree (condominium_id);

CREATE UNIQUE INDEX workspace_members_workspace_legacy_unique ON public.workspace_members USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);

CREATE OR REPLACE VIEW "public"."condominium_fund_availability" WITH (security_invoker=true) AS
 SELECT id,
    workspace_id,
    condominium_id,
    name,
    purpose,
    target_amount,
    allocated_amount,
    used_amount,
    GREATEST(round(allocated_amount - used_amount, 2), 0::numeric) AS available_amount,
    GREATEST(round(target_amount - allocated_amount, 2), 0::numeric) AS target_remaining_amount,
    active,
    notes,
    created_at,
    updated_at
   FROM condominium_funds f;;
