# Production migration ledger-to-source inventory — 2026-11-03

**Production project:** `tctcgptrsmvgajqjgnev`  
**Read-only inventory:** no migration was applied, renamed, deleted, or edited during this extraction.

## Summary

- Production ledger entries: **247**
- SQL files in `supabase/migrations`: **206**
- Duplicate timestamp prefixes in repository: **9**
- Ledger entries with an exact unique filename/version match: **21**
- Ledger entries with same-name source but different timestamp: **89**
- Ledger entries without a direct filename/name match: **137**

## Duplicate timestamp prefixes

- `20260930110000`: `20260930110000_accounting_consumption_and_installment_percentages.sql`, `20260930110000_allocation_criteria_scope.sql`
- `20260930200000`: `20260930200000_clean_deleted_member_owner_references.sql`, `20260930200000_harden_payment_movements_access.sql`
- `20260930210000`: `20260930210000_complete_condominium_hard_delete.sql`, `20260930210000_validate_allocation_rule_scope.sql`
- `20261001110000`: `20261001110000_add_member_transfer_accounting_snapshot.sql`, `20261001110000_harden_current_owner_installment_generation.sql`
- `20261005170000`: `20261005170000_reconcile_operational_table_grants.sql`, `20261005170000_reconcile_operational_trigger_chain.sql`
- `20261005190000`: `20261005190000_reconcile_public_function_acl.sql`, `20261005190000_remove_obsolete_function_overload.sql`
- `20261005191000`: `20261005191000_reconcile_fund_availability_view.sql`, `20261005191000_reconcile_public_function_security_parity.sql`
- `20261005192000`: `20261005192000_reconcile_public_relation_acl.sql`, `20261005192000_remove_obsolete_schedule_overload_final.sql`
- `20261005193000`: `20261005193000_harden_guard_installment_parent_delete_grant.sql`, `20261005193000_reconcile_public_indexes.sql`

These collisions must be reconciled before running the normal Supabase migration CLI against this directory.

## Production ledger mapping

| Applied version | Ledger name | Match status | Candidate source file |
|---|---|---|---|
| 20260928021707 | initial_bethag_backend | no-direct-source | — |
| 20260928021808 | tighten_portal_rls | no-direct-source | — |
| 20260928021935 | sync_auth_profiles | no-direct-source | — |
| 20260928021944 | privatize_rls_functions | no-direct-source | — |
| 20260928022046 | add_legacy_ids_for_migration | no-direct-source | — |
| 20260928022126 | tighten_condominium_member_visibility | no-direct-source | — |
| 20260928022526 | add_condominium_member_legacy_unique_key | no-direct-source | — |
| 20260928022821 | add_workspace_legacy_unique_constraints | no-direct-source | — |
| 20260928024823 | bootstrap_first_workspace_admin | no-direct-source | — |
| 20260928024931 | harden_first_admin_rpc | no-direct-source | — |
| 20260928040840 | allow_portal_residents_read_condominiums | no-direct-source | — |
| 20260928041428 | persist_collaborator_legacy_ids | no-direct-source | — |
| 20260928042328 | enforce_collaborator_module_permissions | no-direct-source | — |
| 20260928042333 | refine_collaborator_permission_scope | no-direct-source | — |
| 20260928043406 | harden_authenticated_request_policies | no-direct-source | — |
| 20260928043415 | finish_authenticated_rls_hardening | no-direct-source | — |
| 20260928043547 | restrict_data_api_table_grants | no-direct-source | — |
| 20260928043604 | optimize_rls_auth_checks | no-direct-source | — |
| 20260928043608 | add_foreign_key_indexes | no-direct-source | — |
| 20260928043618 | optimize_portal_access_auth_check | no-direct-source | — |
| 20260928043823 | restrict_private_security_definer_functions | no-direct-source | — |
| 20260928043835 | remove_anon_private_function_execute | no-direct-source | — |
| 20260928045050 | enforce_portal_content_permissions | no-direct-source | — |
| 20260928045907 | expose_first_admin_bootstrap | same-name-different-version | 20260928060000_expose_first_admin_bootstrap.sql |
| 20260928072127 | add_save_condominium_rpc | no-direct-source | — |
| 20260928072401 | lock_down_save_condominium_rpc | no-direct-source | — |
| 20260928152153 | tighten_public_bootstrap_rpc_execute | no-direct-source | — |
| 20260928153242 | add_condomino_registration_workflow | exact-version | 20260928153242_add_condomino_registration_workflow.sql |
| 20260928153246 | add_portal_access_unique_identity | exact-version | 20260928153246_add_portal_access_unique_identity.sql |
| 20260928153301 | fix_portal_registration_upsert | exact-version | 20260928153301_fix_portal_registration_upsert.sql |
| 20260928153422 | normalize_portal_access_upsert_key | exact-version | 20260928153422_normalize_portal_access_upsert_key.sql |
| 20260928153526 | route_unmatched_registration_single_workspace | exact-version | 20260928153526_route_unmatched_registration_single_workspace.sql |
| 20260928154019 | handle_registration_email_mismatch | same-name-different-version | 20260928154000_handle_registration_email_mismatch.sql |
| 20260928154553 | add_condominium_units_and_member_unit_link_v2 | no-direct-source | — |
| 20260928154629 | enforce_owner_tenant_portal_permissions | no-direct-source | — |
| 20260928154639 | privatize_portal_member_permissions_trigger | no-direct-source | — |
| 20260928164443 | security_hardening_and_fk_indexes | no-direct-source | — |
| 20260928164852 | complete_condominium_delete_rpc_and_rls_optimization | no-direct-source | — |
| 20260928164904 | restrict_delete_condominium_rpc_execute | no-direct-source | — |
| 20260928164912 | optimize_portal_access_email_rls | no-direct-source | — |
| 20260928222840 | grant_is_workspace_manager_execute_to_authenticated | no-direct-source | — |
| 20260929065325 | add_allocation_table_reference | no-direct-source | — |
| 20260929065406 | add_expense_allocation_rpc | no-direct-source | — |
| 20260929065622 | add_installments_from_allocations_rpc | no-direct-source | — |
| 20260929070002 | add_condominium_budget | no-direct-source | — |
| 20260929070815 | protect_closed_accounting_periods | no-direct-source | — |
| 20260929070857 | fix_closed_accounting_trigger_return | no-direct-source | — |
| 20260929071057 | add_condominium_register_and_suppliers | no-direct-source | — |
| 20260929071403 | link_register_items_to_suppliers | no-direct-source | — |
| 20260929071513 | add_condominium_works | no-direct-source | — |
| 20260929071728 | add_work_documents_link | no-direct-source | — |
| 20260929072149 | fix_work_document_legacy_id | no-direct-source | — |
| 20260929072255 | link_works_special_funds | no-direct-source | — |
| 20260929072411 | add_work_progress_sal | no-direct-source | — |
| 20260929072831 | link_work_progress_accounting | no-direct-source | — |
| 20260929073258 | add_work_event_history | no-direct-source | — |
| 20260929074236 | link_work_progress_accounting | no-direct-source | — |
| 20260929075201 | add_condominium_audit_log | no-direct-source | — |
| 20260929075312 | protect_work_economic_values | no-direct-source | — |
| 20260929080009 | lock_trigger_function_execution | no-direct-source | — |
| 20260929080144 | index_condominium_module_foreign_keys | no-direct-source | — |
| 20260929081735 | add_condominium_insurance_policies | same-name-different-version | 20260929110000_add_condominium_insurance_policies.sql |
| 20260929093700 | align_condominium_manager_authorization | no-direct-source | — |
| 20260929093800 | optimize_insurance_fk_and_portal_rls | no-direct-source | — |
| 20260929093830 | optimize_portal_access_jwt_rls_initplan | no-direct-source | — |
| 20260929094656 | align_condominium_insurance_schema_20260929 | no-direct-source | — |
| 20260929144737 | complete_condominium_units | same-name-different-version | 20260929165000_complete_condominium_units.sql |
| 20260929150453 | remove_member_millesimi | same-name-different-version | 20260929170500_remove_member_millesimi.sql |
| 20260929171530 | optimize_insurance_rls_auth_calls | same-name-different-version | 20260930194500_optimize_insurance_rls_auth_calls.sql |
| 20260929205021 | add_expense_allocation_engine | no-direct-source | — |
| 20260929205053 | harden_expense_allocation_rpc | no-direct-source | — |
| 20260929205121 | fix_expense_allocation_rpc_unit_alias | no-direct-source | — |
| 20260929205155 | harden_installment_generation | no-direct-source | — |
| 20260929225302 | tighten_unit_permissions_and_workspace_condo_read | no-direct-source | — |
| 20260929225423 | align_insurance_permissions_with_condomini_module | no-direct-source | — |
| 20260929230350 | harden_millesimal_allocation_integrity | exact-version | 20260929230350_harden_millesimal_allocation_integrity.sql |
| 20260929230443 | sync_allocation_payment_status | exact-version | 20260929230443_sync_allocation_payment_status.sql |
| 20260929230529 | harden_accounting_delete_and_allocation_scope | exact-version | 20260929230529_harden_accounting_delete_and_allocation_scope.sql |
| 20260929232302 | harden_millesimal_trigger_function_execute | same-name-different-version | 20260930183000_harden_millesimal_trigger_function_execute.sql |
| 20260929232531 | validate_unit_pertinence_relationship | same-name-different-version | 20260930184500_validate_unit_pertinence_relationship.sql |
| 20260929233045 | remove_duplicate_unit_relationship_trigger | same-name-different-version | 20260930190000_remove_duplicate_unit_relationship_trigger.sql |
| 20260929233222 | harden_unit_delete_integrity | same-name-different-version | 20260930191500_harden_unit_delete_integrity.sql |
| 20260930080253 | optional_account_security | same-name-different-version | 20260930090000_optional_account_security.sql |
| 20260930080309 | ensure_millesimal_rows_for_units | same-name-different-version | 20260930180000_ensure_millesimal_rows_for_units.sql |
| 20260930080312 | harden_millesimal_trigger_function_execute | same-name-different-version | 20260930183000_harden_millesimal_trigger_function_execute.sql |
| 20260930080317 | validate_unit_pertinence_relationship | same-name-different-version | 20260930184500_validate_unit_pertinence_relationship.sql |
| 20260930080320 | remove_duplicate_unit_relationship_trigger | same-name-different-version | 20260930190000_remove_duplicate_unit_relationship_trigger.sql |
| 20260930080323 | harden_unit_delete_integrity | same-name-different-version | 20260930191500_harden_unit_delete_integrity.sql |
| 20260930080325 | allow_authorized_unit_delete | same-name-different-version | 20260930193000_allow_authorized_unit_delete.sql |
| 20260930080328 | optimize_insurance_rls_auth_calls | same-name-different-version | 20260930194500_optimize_insurance_rls_auth_calls.sql |
| 20260930080331 | clean_deleted_member_owner_references | same-name-different-version | 20260930200000_clean_deleted_member_owner_references.sql |
| 20260930080838 | complete_condominium_hard_delete | same-name-different-version | 20260930210000_complete_condominium_hard_delete.sql |
| 20260930081022 | allow_authorized_collaborator_save_condominium | no-direct-source | — |
| 20260930100924 | installment_percentages | same-name-different-version | 20260930240000_installment_percentages.sql |
| 20260930100945 | allocation_rules_and_consumption | same-name-different-version | 20260930241000_allocation_rules_and_consumption.sql |
| 20260930103120 | 20260930250000_manual_ai_allocation_intake | no-direct-source | — |
| 20260930103124 | 20260930260000_harden_allocation_intake_validation | no-direct-source | — |
| 20260930103128 | 20260930270000_validate_allocation_table_scope | no-direct-source | — |
| 20260930103254 | 20260930240000_installment_percentages | no-direct-source | — |
| 20260930103432 | 20260930120000_fix_building_scope_allocation_rpc | no-direct-source | — |
| 20260930103819 | 20260930130000_harden_installment_payment | no-direct-source | — |
| 20260930104150 | 20260930150000_harden_fiscal_carryover_member_scope | no-direct-source | — |
| 20260930104416 | 20260930160000_fiscal_carryover_compensation | no-direct-source | — |
| 20260930104518 | 20260930161000_harden_carryover_compensation_semantics | no-direct-source | — |
| 20260930114719 | guard_unit_scope_changes | same-name-different-version | 20260930211000_guard_unit_scope_changes.sql |
| 20260930114808 | revoke_trigger_security_definer_execute | same-name-different-version | 20260930212000_revoke_trigger_security_definer_execute.sql |
| 20260930114835 | revoke_trigger_security_definer_execute_explicit_roles | same-name-different-version | 20260930213000_revoke_trigger_security_definer_execute_explicit_roles.sql |
| 20260930115502 | repair_unit_owner_references | same-name-different-version | 20260930214000_repair_unit_owner_references.sql |
| 20260930115644 | validate_unit_owner_member_refs | same-name-different-version | 20260930215000_validate_unit_owner_member_refs.sql |
| 20260930125903 | condominium_creation_intakes | exact-version | 20260930125903_condominium_creation_intakes.sql |
| 20260930142230 | add_bethag_document_storage | no-direct-source | — |
| 20260930162854 | work_accounting_integrity_indexes | same-name-different-version | 20260930280000_work_accounting_integrity_indexes.sql |
| 20260930174121 | 20260930460000_harden_condominium_member_visibility | no-direct-source | — |
| 20260930175443 | 20260930470000_harden_portal_approval_workspace_scope | no-direct-source | — |
| 20260930175759 | 20260930480000_scope_condominium_delete_portal_requests | no-direct-source | — |
| 20260930180022 | 20260930490000_harden_profile_column_permissions | no-direct-source | — |
| 20260930180302 | 20260930500000_harden_condominium_visibility | no-direct-source | — |
| 20260930181023 | harden_unit_workspace_scope | same-name-different-version | 20260930510000_harden_unit_workspace_scope.sql |
| 20260930181813 | harden_portal_email_uniqueness_case_insensitive | no-direct-source | — |
| 20260930183113 | fix_portal_registration_case_insensitive_upsert | same-name-different-version | 20260930530000_fix_portal_registration_case_insensitive_upsert.sql |
| 20260930183408 | harden_condominium_delete_carryover_compensations | same-name-different-version | 20260930540000_harden_condominium_delete_carryover_compensations.sql |
| 20260930185301 | optimize_workspace_manager_rls_auth_check | no-direct-source | — |
| 20260930185307 | restore_workspace_manager_rls_execute | no-direct-source | — |
| 20260930185324 | optimize_private_auth_rls_helpers | no-direct-source | — |
| 20260930190330 | fix_installment_schedule_unified_branch_record_reference | no-direct-source | — |
| 20260930190401 | fix_installment_schedule_fiscal_year_alias_collision | no-direct-source | — |
| 20260930190434 | allow_payment_rpc_installment_sync_guard_v2 | no-direct-source | — |
| 20260930190448 | honor_payment_rpc_installment_guard_flag | no-direct-source | — |
| 20260930235538 | harden_public_rpc_security_definer_boundaries | no-direct-source | — |
| 20260930235554 | restore_private_claim_admin_execute | no-direct-source | — |
| 20260930235652 | remove_client_schema_privileges | no-direct-source | — |
| 20261001063435 | final_performance_indexes_communication_recipients | exact-version | 20261001063435_final_performance_indexes_communication_recipients.sql |
| 20261001063530 | lock_down_financial_rpc_anon_execute | same-name-different-version | 20261001063800_lock_down_financial_rpc_anon_execute.sql |
| 20261001063537 | remove_public_financial_rpc_execute | no-direct-source | — |
| 20261001063734 | lock_down_condominium_creation_rpc_anon_execute | no-direct-source | — |
| 20261001063901 | lock_down_portal_registration_rpc_anon_execute | no-direct-source | — |
| 20261001063908 | remove_public_portal_registration_rpc_execute | no-direct-source | — |
| 20261001081847 | 20261001093000_transfer_current_owner_and_portal_lifecycle | no-direct-source | — |
| 20261001081917 | 20261001094000_index_transfer_closed_by | no-direct-source | — |
| 20261001082509 | 20261001095000_add_unit_cadastral_transformations | no-direct-source | — |
| 20261001082537 | 20261001095700_index_unit_transformation_audit_fks | no-direct-source | — |
| 20261001082636 | 20261001100500_unit_lifecycle_current_owner_guard | no-direct-source | — |
| 20261001082731 | 20261001102100_unit_transformation_snapshots | no-direct-source | — |
| 20261001082758 | 20261001102500_unit_transformation_preview | no-direct-source | — |
| 20261001083704 | harden_current_owner_installment_generation | same-name-different-version | 20261001110000_harden_current_owner_installment_generation.sql |
| 20261001090203 | validate_unit_transformation_preview_inputs | no-direct-source | — |
| 20261001090447 | guard_confirmed_unit_transformation_integrity | no-direct-source | — |
| 20261001090613 | lock_confirmed_unit_transformation_audit | no-direct-source | — |
| 20261001090904 | require_trusted_unit_transformation_confirmation | no-direct-source | — |
| 20261001091036 | require_confirmed_genealogy_for_unit_lifecycle | no-direct-source | — |
| 20261001091151 | validate_confirmed_unit_transformation_genealogy | no-direct-source | — |
| 20261001091322 | require_active_units_for_transformation_confirmation | no-direct-source | — |
| 20261001091431 | require_resolved_reviews_for_confirmed_unit_transformations | no-direct-source | — |
| 20261002045022 | fix_member_portal_workspace_transfer | same-name-different-version | 20261001101500_fix_member_portal_workspace_transfer.sql |
| 20261002045106 | prevent_portal_reactivation_for_transferred_members | exact-version | 20261002045106_prevent_portal_reactivation_for_transferred_members.sql |
| 20261002045430 | fix_member_transfer_workspace_members_lookup | same-name-different-version | 20261002060000_fix_member_transfer_workspace_members_lookup.sql |
| 20261002050057 | secure_member_transfer_public_wrappers | no-direct-source | — |
| 20261002050232 | assign_missing_condominium_member_legacy_id | no-direct-source | — |
| 20261002050900 | fix_member_transfer_archived_column_check | no-direct-source | — |
| 20261002073557 | tighten_resident_portal_identity_binding | no-direct-source | — |
| 20261002074251 | fix_member_transfer_status_constraint | no-direct-source | — |
| 20261002074541 | prevent_duplicate_confirmed_member_transfers | no-direct-source | — |
| 20261002110808 | validate_transfer_outgoing_owner | exact-version | 20261002110808_validate_transfer_outgoing_owner.sql |
| 20261002113421 | revoke_excess_public_table_privileges | exact-version | 20261002113421_revoke_excess_public_table_privileges.sql |
| 20261002113618 | secure_default_function_and_sequence_privileges | exact-version | 20261002113618_secure_default_function_and_sequence_privileges.sql |
| 20261002113631 | revoke_default_sequence_update_privilege | exact-version | 20261002113631_revoke_default_sequence_update_privilege.sql |
| 20261003021711 | fix_deleted_member_owner_references_workspace_scope | no-direct-source | — |
| 20261003022110 | block_unverified_transfer_identity | no-direct-source | — |
| 20261003022133 | gate_portal_registration_verified_identity | no-direct-source | — |
| 20261003030800 | 20261003040000_restrict_audit_log_to_workspace_admins | no-direct-source | — |
| 20261003043520 | preserve_transfer_extraordinary_allocations | same-name-different-version | 20261003050000_preserve_transfer_extraordinary_allocations.sql |
| 20261003043706 | expose_captured_transfer_snapshot | same-name-different-version | 20261003052000_expose_captured_transfer_snapshot.sql |
| 20261003045727 | expand_member_transfer_preview_installments | same-name-different-version | 20261003060000_expand_member_transfer_preview_installments.sql |
| 20261003045905 | preserve_future_installments_transfer_snapshot | same-name-different-version | 20261003061000_preserve_future_installments_transfer_snapshot.sql |
| 20261003050209 | include_unit_unassigned_installments_in_transfer | same-name-different-version | 20261003062000_include_unit_unassigned_installments_in_transfer.sql |
| 20261003050443 | include_unit_unassigned_carryovers_in_transfer | same-name-different-version | 20261003063000_include_unit_unassigned_carryovers_in_transfer.sql |
| 20261003050722 | block_transfer_close_with_unresolved_unit_carryovers | same-name-different-version | 20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql |
| 20261005131809 | harden_portal_approval_workspace_scope_reconciled | same-name-different-version | 20261005080000_harden_portal_approval_workspace_scope_reconciled.sql |
| 20261005131827 | reconcile_portal_member_link_and_transfer_archive_state | same-name-different-version | 20261005090000_reconcile_portal_member_link_and_transfer_archive_state.sql |
| 20261005131836 | reconcile_complete_member_transfer_chain | same-name-different-version | 20261005100000_reconcile_complete_member_transfer_chain.sql |
| 20261005131842 | reconcile_member_transfer_preview_chain | same-name-different-version | 20261005103000_reconcile_member_transfer_preview_chain.sql |
| 20261005131847 | reconcile_portal_rpc_grants | same-name-different-version | 20261005110000_reconcile_portal_rpc_grants.sql |
| 20261005131856 | reconcile_member_transfer_rpc_grants | same-name-different-version | 20261005111000_reconcile_member_transfer_rpc_grants.sql |
| 20261005131902 | reconcile_portal_approval_rpc_security | same-name-different-version | 20261005112000_reconcile_portal_approval_rpc_security.sql |
| 20261005131907 | finalize_public_transfer_and_approval_invoker_wrappers | same-name-different-version | 20261005124000_finalize_public_transfer_and_approval_invoker_wrappers.sql |
| 20261005131913 | harden_private_portal_registration_execute | same-name-different-version | 20261005125000_harden_private_portal_registration_execute.sql |
| 20261005131922 | reconcile_private_portal_rpc_implementations | same-name-different-version | 20261005130000_reconcile_private_portal_rpc_implementations.sql |
| 20261005131932 | revoke_direct_private_portal_rpc_execute | same-name-different-version | 20261005131000_revoke_direct_private_portal_rpc_execute.sql |
| 20261005131938 | reconcile_resident_archive_visibility | same-name-different-version | 20261005132000_reconcile_resident_archive_visibility.sql |
| 20261005131943 | harden_resident_condominium_archive_access | same-name-different-version | 20261005133000_harden_resident_condominium_archive_access.sql |
| 20261005131948 | revoke_direct_portal_trigger_execute | same-name-different-version | 20261005140000_revoke_direct_portal_trigger_execute.sql |
| 20261005131958 | reconcile_member_portal_sync_trigger | same-name-different-version | 20261005141000_reconcile_member_portal_sync_trigger.sql |
| 20261005132005 | reconcile_member_portal_integrity_triggers | same-name-different-version | 20261005142000_reconcile_member_portal_integrity_triggers.sql |
| 20261005132012 | reconcile_member_transfer_constraints | same-name-different-version | 20261005143000_reconcile_member_transfer_constraints.sql |
| 20261005132016 | reconcile_member_transfer_portal_indexes | same-name-different-version | 20261005144000_reconcile_member_transfer_portal_indexes.sql |
| 20261005132021 | reconcile_member_indexes | same-name-different-version | 20261005145000_reconcile_member_indexes.sql |
| 20261005132026 | reconcile_core_lookup_indexes | same-name-different-version | 20261005150000_reconcile_core_lookup_indexes.sql |
| 20261005132053 | finalize_public_portal_transfer_wrappers | same-name-different-version | 20261005152000_finalize_public_portal_transfer_wrappers.sql |
| 20261005132058 | reconcile_core_rls_policies | same-name-different-version | 20261005153000_reconcile_core_rls_policies.sql |
| 20261005132103 | reconcile_member_transfer_rls | same-name-different-version | 20261005154000_reconcile_member_transfer_rls.sql |
| 20261005132108 | reconcile_accounting_rls_policies | same-name-different-version | 20261005155000_reconcile_accounting_rls_policies.sql |
| 20261005132116 | reconcile_accounting_table_grants | same-name-different-version | 20261005160000_reconcile_accounting_table_grants.sql |
| 20261005132158 | harden_accounting_rpc_grants_v2 | no-direct-source | — |
| 20261005132208 | harden_core_public_rpc_grants | same-name-different-version | 20261005162000_harden_core_public_rpc_grants.sql |
| 20261005132213 | reconcile_budget_funds_millesimal_rls | same-name-different-version | 20261005163000_reconcile_budget_funds_millesimal_rls.sql |
| 20261005132235 | restore_operational_work_register_and_transform_tables | same-name-different-version | 20261005165000_restore_operational_work_register_and_transform_tables.sql |
| 20261005132241 | reconcile_operational_table_grants | same-name-different-version | 20261005170000_reconcile_operational_table_grants.sql |
| 20261005132246 | reconcile_operational_trigger_chain | same-name-different-version | 20261005170000_reconcile_operational_trigger_chain.sql |
| 20261005132314 | finalize_operational_constraint_parity_v2 | no-direct-source | — |
| 20261005132321 | reconcile_private_registration_grant | same-name-different-version | 20261005173000_reconcile_private_registration_grant.sql |
| 20261005132340 | reconcile_remaining_core_columns_v2 | no-direct-source | — |
| 20261005132407 | reconcile_public_table_privileges | same-name-different-version | 20261005183000_reconcile_public_table_privileges.sql |
| 20261005132415 | restore_missing_private_function_parity | same-name-different-version | 20261005184000_restore_missing_private_function_parity.sql |
| 20261005132420 | restore_missing_public_function_parity | same-name-different-version | 20261005185000_restore_missing_public_function_parity.sql |
| 20261005132430 | reconcile_public_function_acl | same-name-different-version | 20261005190000_reconcile_public_function_acl.sql |
| 20261005132441 | remove_obsolete_function_overload | same-name-different-version | 20261005190000_remove_obsolete_function_overload.sql |
| 20261005132458 | reconcile_fund_availability_view_v2 | no-direct-source | — |
| 20261005132509 | reconcile_public_function_security_parity | same-name-different-version | 20261005191000_reconcile_public_function_security_parity.sql |
| 20261005132514 | reconcile_public_relation_acl | same-name-different-version | 20261005192000_reconcile_public_relation_acl.sql |
| 20261005132518 | remove_obsolete_schedule_overload_final | same-name-different-version | 20261005192000_remove_obsolete_schedule_overload_final.sql |
| 20261005132524 | harden_guard_installment_parent_delete_grant | same-name-different-version | 20261005193000_harden_guard_installment_parent_delete_grant.sql |
| 20261005132529 | reconcile_public_indexes | same-name-different-version | 20261005193000_reconcile_public_indexes.sql |
| 20261005132555 | normalize_remaining_rls_policy_definitions | same-name-different-version | 20261005195000_normalize_remaining_rls_policy_definitions.sql |
| 20261005132605 | reconcile_public_triggers | same-name-different-version | 20261005200000_reconcile_public_triggers.sql |
| 20261005134740 | reconcile_login_workspace_access_rpc | same-name-different-version | 20261005201000_reconcile_login_workspace_access_rpc.sql |
| 20261005135425 | expose_login_workspace_access_rpc | same-name-different-version | 20261005203000_expose_login_workspace_access_rpc.sql |
| 20261005164605 | harden_login_workspace_access_invoker | exact-version | 20261005164605_harden_login_workspace_access_invoker.sql |
| 20261005165522 | harden_trigger_function_execute_grants | no-direct-source | — |
| 20261005165658 | revoke_direct_trigger_function_execute | exact-version | 20261005165658_revoke_direct_trigger_function_execute.sql |
| 20261005171105 | restore_private_rls_helper_execute_grants | exact-version | 20261005171105_restore_private_rls_helper_execute_grants.sql |
| 20261005185327 | 20261005205500_restore_save_condominium_rpc_execute | no-direct-source | — |
| 20261005190825 | 20261005191000_restore_member_transfer_private_execute_grant | no-direct-source | — |
| 20261005190940 | 20261005192000_fix_member_transfer_workspace_members_update | no-direct-source | — |
| 20261006011620 | restore_closing_member_history | same-name-different-version | 20261006032000_restore_closing_member_history.sql |
| 20261006011629 | restore_member_transfer_outgoing_history_state | no-direct-source | — |
| 20261006011953 | preserve_closing_member_history_trigger | no-direct-source | — |
| 20261006020802 | 20261006040000_repair_deleted_member_owner_references | no-direct-source | — |
| 20261006143811 | add_transfer_closure_preflight | no-direct-source | — |
| 20261006144220 | fix_transfer_closure_rpc_permissions | no-direct-source | — |
| 20261006181654 | support_multiple_incoming_coowners_subentro | no-direct-source | — |
| 20261006181713 | preserve_legacy_single_incoming_subentro_payload | no-direct-source | — |
| 20261007062039 | fix_zero_ownership_transfer_owner_state | no-direct-source | — |
| 20261007072310 | harden_trigger_function_security_for_launch | exact-version | 20261007072310_harden_trigger_function_security_for_launch.sql |
| 20261022202747 | harden_close_member_transfer_search_path | no-direct-source | — |
| 20261102151610 | harden_live_production_acl_and_transfer_invoker | exact-version | 20261102151610_harden_live_production_acl_and_transfer_invoker.sql |
| 20261102200855 | restore_secure_communication_recipient_rpc_execute | same-name-different-version | 20261102210000_restore_secure_communication_recipient_rpc_execute.sql |
| 20261103070901 | grant_service_role_private_resend_event_rpc | exact-version | 20261103070901_grant_service_role_private_resend_event_rpc.sql |

## Interpretation

- `exact-version` is the only status that can be treated as an unambiguous filename-to-ledger match from this inventory alone.
- `same-name-different-version` requires verification that the source SQL is byte-for-byte or semantically the SQL already applied under the recorded Production version. Do not run it as a new migration.
- `no-direct-source` and `ambiguous-name` require recovery from the frozen baseline/rebuild artifacts, historical commits, or the original applied SQL evidence.
- Do not rewrite historical migration rows or blindly rename files to make counts match.
- This inventory is a forensic map, not approval to deploy. The release remains NO-GO until each Production ledger entry is mapped to authoritative source and the migration directory has unique ordered versions.
