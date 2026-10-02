# Migration reconciliation candidate map

Generated from read-only production migration history and recovery-branch filenames, 2026-10-01.

This is a filename-level reconciliation aid only. A semantic filename match does not establish equivalent SQL, ordering safety, or replayability. Exact means the repository filename begins with the production version plus underscore. Candidate matches are lexical similarity only and require manual SQL comparison.

Production history entries: 153
Branch migration files: 132
Exact version-prefix matches: 10
Non-exact entries with lexical candidate score >= 0.50: 98

| Production version | Production migration name | Branch candidate (lexical only) | Similarity | Status |
|---|---|---|---:|---|
| 20260928021707 | initial_bethag_backend | 20260928050000_reconstruct_portal_access_registry.sql | 0.00 | Unresolved |
| 20260928021808 | tighten_portal_rls | 20260929201500_fix_resident_portal_rls.sql | 0.50 | Candidate — manual review |
| 20260928021935 | sync_auth_profiles | 20260929230443_sync_allocation_payment_status.sql | 0.25 | Unresolved |
| 20260928021944 | privatize_rls_functions | 20260929201500_fix_resident_portal_rls.sql | 0.25 | Unresolved |
| 20260928022046 | add_legacy_ids_for_migration | 20260928153242_add_condomino_registration_workflow.sql | 0.20 | Unresolved |
| 20260928022126 | tighten_condominium_member_visibility | 20260930460000_harden_condominium_member_visibility.sql | 0.75 | Candidate — manual review |
| 20260928022526 | add_condominium_member_legacy_unique_key | 20261001104500_add_condominium_member_transfer.sql | 0.50 | Candidate — manual review |
| 20260928022821 | add_workspace_legacy_unique_constraints | 20260928153246_add_portal_access_unique_identity.sql | 0.40 | Unresolved |
| 20260928024823 | bootstrap_first_workspace_admin | 20260928060000_expose_first_admin_bootstrap.sql | 0.75 | Candidate — manual review |
| 20260928024931 | harden_first_admin_rpc | 20260928060000_expose_first_admin_bootstrap.sql | 0.50 | Candidate — manual review |
| 20260928040840 | allow_portal_residents_read_condominiums | 20260928050000_reconstruct_portal_access_registry.sql | 0.20 | Unresolved |
| 20260928041428 | persist_collaborator_legacy_ids | 20260928090000_collaborator_module_write_permissions.sql | 0.25 | Unresolved |
| 20260928042328 | enforce_collaborator_module_permissions | 20260928090000_collaborator_module_write_permissions.sql | 0.75 | Candidate — manual review |
| 20260928042333 | refine_collaborator_permission_scope | 20260928090000_collaborator_module_write_permissions.sql | 0.25 | Unresolved |
| 20260928043406 | harden_authenticated_request_policies | 20260930450000_harden_resident_request_member_scope.sql | 0.40 | Unresolved |
| 20260928043415 | finish_authenticated_rls_hardening | 20260929201500_fix_resident_portal_rls.sql | 0.25 | Unresolved |
| 20260928043547 | restrict_data_api_table_grants | 20260930270000_validate_allocation_table_scope.sql | 0.20 | Unresolved |
| 20260928043604 | optimize_rls_auth_checks | 20260930194500_optimize_insurance_rls_auth_calls.sql | 0.60 | Candidate — manual review |
| 20260928043608 | add_foreign_key_indexes | 20260930340000_add_missing_fk_indexes.sql | 0.50 | Candidate — manual review |
| 20260928043618 | optimize_portal_access_auth_check | 20260930430000_optimize_portal_rls_auth_initplan.sql | 0.60 | Candidate — manual review |
| 20260928043823 | restrict_private_security_definer_functions | 20260930212000_revoke_trigger_security_definer_execute.sql | 0.40 | Unresolved |
| 20260928043835 | remove_anon_private_function_execute | 20260930183000_harden_millesimal_trigger_function_execute.sql | 0.40 | Unresolved |
| 20260928045050 | enforce_portal_content_permissions | 20260928050000_reconstruct_portal_access_registry.sql | 0.25 | Unresolved |
| 20260928045907 | expose_first_admin_bootstrap | 20260928060000_expose_first_admin_bootstrap.sql | 1.00 | Candidate — manual review |
| 20260928072127 | add_save_condominium_rpc | 20260928070000_save_condominium_rpc.sql | 0.75 | Candidate — manual review |
| 20260928072401 | lock_down_save_condominium_rpc | 20260928070000_save_condominium_rpc.sql | 0.60 | Candidate — manual review |
| 20260928152153 | tighten_public_bootstrap_rpc_execute | 20261001063800_lock_down_financial_rpc_anon_execute.sql | 0.33 | Unresolved |
| 20260928153242 | add_condomino_registration_workflow | 20260928153242_add_condomino_registration_workflow.sql | 1.00 | Exact version prefix |
| 20260928153246 | add_portal_access_unique_identity | 20260928153246_add_portal_access_unique_identity.sql | 1.00 | Exact version prefix |
| 20260928153301 | fix_portal_registration_upsert | 20260928153301_fix_portal_registration_upsert.sql | 1.00 | Exact version prefix |
| 20260928153422 | normalize_portal_access_upsert_key | 20260928153422_normalize_portal_access_upsert_key.sql | 1.00 | Exact version prefix |
| 20260928153526 | route_unmatched_registration_single_workspace | 20260928153526_route_unmatched_registration_single_workspace.sql | 1.00 | Exact version prefix |
| 20260928154019 | handle_registration_email_mismatch | 20260928154000_handle_registration_email_mismatch.sql | 1.00 | Candidate — manual review |
| 20260928154553 | add_condominium_units_and_member_unit_link_v2 | 20261001104500_add_condominium_member_transfer.sql | 0.43 | Unresolved |
| 20260928154629 | enforce_owner_tenant_portal_permissions | 20261001093000_transfer_current_owner_and_portal_lifecycle.sql | 0.33 | Unresolved |
| 20260928154639 | privatize_portal_member_permissions_trigger | 20261001101500_fix_member_portal_workspace_transfer.sql | 0.40 | Unresolved |
| 20260928164443 | security_hardening_and_fk_indexes | 20260930090000_optional_account_security.sql | 0.25 | Unresolved |
| 20260928164852 | complete_condominium_delete_rpc_and_rls_optimization | 20260928081000_delete_condominium_rpc.sql | 0.43 | Unresolved |
| 20260928164904 | restrict_delete_condominium_rpc_execute | 20260928081000_delete_condominium_rpc.sql | 0.60 | Candidate — manual review |
| 20260928164912 | optimize_portal_access_email_rls | 20260930430000_optimize_portal_rls_auth_initplan.sql | 0.60 | Candidate — manual review |
| 20260928222840 | grant_is_workspace_manager_execute_to_authenticated | 20260928153526_route_unmatched_registration_single_workspace.sql | 0.20 | Unresolved |
| 20260929065325 | add_allocation_table_reference | 20260930270000_validate_allocation_table_scope.sql | 0.50 | Candidate — manual review |
| 20260929065406 | add_expense_allocation_rpc | 20260930206000_guard_expense_allocation_integrity.sql | 0.50 | Candidate — manual review |
| 20260929065622 | add_installments_from_allocations_rpc | 20260928070000_save_condominium_rpc.sql | 0.20 | Unresolved |
| 20260929070002 | add_condominium_budget | 20260929110000_add_condominium_insurance_policies.sql | 0.50 | Candidate — manual review |
| 20260929070815 | protect_closed_accounting_periods | 20260930204000_protect_fiscal_year_deletion.sql | 0.25 | Unresolved |
| 20260929070857 | fix_closed_accounting_trigger_return | 20260928153301_fix_portal_registration_upsert.sql | 0.20 | Unresolved |
| 20260929071057 | add_condominium_register_and_suppliers | 20260929110000_add_condominium_insurance_policies.sql | 0.40 | Unresolved |
| 20260929071403 | link_register_items_to_suppliers | 20260930233000_link_funds_to_ledger.sql | 0.25 | Unresolved |
| 20260929071513 | add_condominium_works | 20260929110000_add_condominium_insurance_policies.sql | 0.50 | Candidate — manual review |
| 20260929071728 | add_work_documents_link | 20260928153242_add_condomino_registration_workflow.sql | 0.25 | Unresolved |
| 20260929072149 | fix_work_document_legacy_id | 20260928153301_fix_portal_registration_upsert.sql | 0.25 | Unresolved |
| 20260929072255 | link_works_special_funds | 20260930233000_link_funds_to_ledger.sql | 0.50 | Candidate — manual review |
| 20260929072411 | add_work_progress_sal | 20260928153242_add_condomino_registration_workflow.sql | 0.25 | Unresolved |
| 20260929072831 | link_work_progress_accounting | 20260930280000_work_accounting_integrity_indexes.sql | 0.50 | Candidate — manual review |
| 20260929073258 | add_work_event_history | 20260928153242_add_condomino_registration_workflow.sql | 0.25 | Unresolved |
| 20260929074236 | link_work_progress_accounting | 20260930280000_work_accounting_integrity_indexes.sql | 0.50 | Candidate — manual review |
| 20260929075201 | add_condominium_audit_log | 20260929110000_add_condominium_insurance_policies.sql | 0.50 | Candidate — manual review |
| 20260929075312 | protect_work_economic_values | 20260930204000_protect_fiscal_year_deletion.sql | 0.25 | Unresolved |
| 20260929080009 | lock_trigger_function_execution | 20260930183000_harden_millesimal_trigger_function_execute.sql | 0.40 | Unresolved |
| 20260929080144 | index_condominium_module_foreign_keys | 20261001114500_index_member_transfer_foreign_keys.sql | 0.60 | Candidate — manual review |
| 20260929081735 | add_condominium_insurance_policies | 20260929110000_add_condominium_insurance_policies.sql | 1.00 | Candidate — manual review |
| 20260929093700 | align_condominium_manager_authorization | 20260928070000_save_condominium_rpc.sql | 0.25 | Unresolved |
| 20260929093800 | optimize_insurance_fk_and_portal_rls | 20260930194500_optimize_insurance_rls_auth_calls.sql | 0.60 | Candidate — manual review |
| 20260929093830 | optimize_portal_access_jwt_rls_initplan | 20260930430000_optimize_portal_rls_auth_initplan.sql | 0.67 | Candidate — manual review |
| 20260929094656 | align_condominium_insurance_schema_20260929 | 20260929110000_add_condominium_insurance_policies.sql | 0.40 | Unresolved |
| 20260929144737 | complete_condominium_units | 20260929165000_complete_condominium_units.sql | 1.00 | Candidate — manual review |
| 20260929150453 | remove_member_millesimi | 20260929170500_remove_member_millesimi.sql | 1.00 | Candidate — manual review |
| 20260929171530 | optimize_insurance_rls_auth_calls | 20260930194500_optimize_insurance_rls_auth_calls.sql | 1.00 | Candidate — manual review |
| 20260929205021 | add_expense_allocation_engine | 20260930206000_guard_expense_allocation_integrity.sql | 0.50 | Candidate — manual review |
| 20260929205053 | harden_expense_allocation_rpc | 20260929230350_harden_millesimal_allocation_integrity.sql | 0.50 | Candidate — manual review |
| 20260929205121 | fix_expense_allocation_rpc_unit_alias | 20260930120000_fix_building_scope_allocation_rpc.sql | 0.50 | Candidate — manual review |
| 20260929205155 | harden_installment_generation | 20260930130000_harden_installment_payment.sql | 0.67 | Candidate — manual review |
| 20260929225302 | tighten_unit_permissions_and_workspace_condo_read | 20260930510000_harden_unit_workspace_scope.sql | 0.29 | Unresolved |
| 20260929225423 | align_insurance_permissions_with_condomini_module | 20260928090000_collaborator_module_write_permissions.sql | 0.33 | Unresolved |
| 20260929230350 | harden_millesimal_allocation_integrity | 20260929230350_harden_millesimal_allocation_integrity.sql | 1.00 | Exact version prefix |
| 20260929230443 | sync_allocation_payment_status | 20260929230443_sync_allocation_payment_status.sql | 1.00 | Exact version prefix |
| 20260929230529 | harden_accounting_delete_and_allocation_scope | 20260929230529_harden_accounting_delete_and_allocation_scope.sql | 1.00 | Exact version prefix |
| 20260929232302 | harden_millesimal_trigger_function_execute | 20260930183000_harden_millesimal_trigger_function_execute.sql | 1.00 | Candidate — manual review |
| 20260929232531 | validate_unit_pertinence_relationship | 20260930184500_validate_unit_pertinence_relationship.sql | 1.00 | Candidate — manual review |
| 20260929233045 | remove_duplicate_unit_relationship_trigger | 20260930190000_remove_duplicate_unit_relationship_trigger.sql | 1.00 | Candidate — manual review |
| 20260929233222 | harden_unit_delete_integrity | 20260930191500_harden_unit_delete_integrity.sql | 1.00 | Candidate — manual review |
| 20260930080253 | optional_account_security | 20260930090000_optional_account_security.sql | 1.00 | Candidate — manual review |
| 20260930080309 | ensure_millesimal_rows_for_units | 20260930180000_ensure_millesimal_rows_for_units.sql | 1.00 | Candidate — manual review |
| 20260930080312 | harden_millesimal_trigger_function_execute | 20260930183000_harden_millesimal_trigger_function_execute.sql | 1.00 | Candidate — manual review |
| 20260930080317 | validate_unit_pertinence_relationship | 20260930184500_validate_unit_pertinence_relationship.sql | 1.00 | Candidate — manual review |
| 20260930080320 | remove_duplicate_unit_relationship_trigger | 20260930190000_remove_duplicate_unit_relationship_trigger.sql | 1.00 | Candidate — manual review |
| 20260930080323 | harden_unit_delete_integrity | 20260930191500_harden_unit_delete_integrity.sql | 1.00 | Candidate — manual review |
| 20260930080325 | allow_authorized_unit_delete | 20260930193000_allow_authorized_unit_delete.sql | 1.00 | Candidate — manual review |
| 20260930080328 | optimize_insurance_rls_auth_calls | 20260930194500_optimize_insurance_rls_auth_calls.sql | 1.00 | Candidate — manual review |
| 20260930080331 | clean_deleted_member_owner_references | 20260930200000_clean_deleted_member_owner_references.sql | 1.00 | Candidate — manual review |
| 20260930080838 | complete_condominium_hard_delete | 20260930210000_complete_condominium_hard_delete.sql | 1.00 | Candidate — manual review |
| 20260930081022 | allow_authorized_collaborator_save_condominium | 20260928070000_save_condominium_rpc.sql | 0.40 | Unresolved |
| 20260930100924 | installment_percentages | 20260930240000_installment_percentages.sql | 1.00 | Candidate — manual review |
| 20260930100945 | allocation_rules_and_consumption | 20260930241000_allocation_rules_and_consumption.sql | 1.00 | Candidate — manual review |
| 20260930103120 | 20260930250000_manual_ai_allocation_intake | 20260930250000_manual_ai_allocation_intake.sql | 1.00 | Candidate — manual review |
| 20260930103124 | 20260930260000_harden_allocation_intake_validation | 20260930260000_harden_allocation_intake_validation.sql | 1.00 | Candidate — manual review |
| 20260930103128 | 20260930270000_validate_allocation_table_scope | 20260930270000_validate_allocation_table_scope.sql | 1.00 | Candidate — manual review |
| 20260930103254 | 20260930240000_installment_percentages | 20260930240000_installment_percentages.sql | 1.00 | Candidate — manual review |
| 20260930103432 | 20260930120000_fix_building_scope_allocation_rpc | 20260930120000_fix_building_scope_allocation_rpc.sql | 1.00 | Candidate — manual review |
| 20260930103819 | 20260930130000_harden_installment_payment | 20260930130000_harden_installment_payment.sql | 1.00 | Candidate — manual review |
| 20260930104150 | 20260930150000_harden_fiscal_carryover_member_scope | 20260930150000_harden_fiscal_carryover_member_scope.sql | 1.00 | Candidate — manual review |
| 20260930104416 | 20260930160000_fiscal_carryover_compensation | 20260930160000_fiscal_carryover_compensation.sql | 1.00 | Candidate — manual review |
| 20260930104518 | 20260930161000_harden_carryover_compensation_semantics | 20260930161000_harden_carryover_compensation_semantics.sql | 1.00 | Candidate — manual review |
| 20260930114719 | guard_unit_scope_changes | 20260930211000_guard_unit_scope_changes.sql | 1.00 | Candidate — manual review |
| 20260930114808 | revoke_trigger_security_definer_execute | 20260930212000_revoke_trigger_security_definer_execute.sql | 1.00 | Candidate — manual review |
| 20260930114835 | revoke_trigger_security_definer_execute_explicit_roles | 20260930213000_revoke_trigger_security_definer_execute_explicit_roles.sql | 1.00 | Candidate — manual review |
| 20260930115502 | repair_unit_owner_references | 20260930214000_repair_unit_owner_references.sql | 1.00 | Candidate — manual review |
| 20260930115644 | validate_unit_owner_member_refs | 20260930215000_validate_unit_owner_member_refs.sql | 1.00 | Candidate — manual review |
| 20260930125903 | condominium_creation_intakes | 20260930125903_condominium_creation_intakes.sql | 1.00 | Exact version prefix |
| 20260930142230 | add_bethag_document_storage | 20260930350000_harden_document_storage_rls.sql | 0.50 | Candidate — manual review |
| 20260930162854 | work_accounting_integrity_indexes | 20260930280000_work_accounting_integrity_indexes.sql | 1.00 | Candidate — manual review |
| 20260930174121 | 20260930460000_harden_condominium_member_visibility | 20260930460000_harden_condominium_member_visibility.sql | 1.00 | Candidate — manual review |
| 20260930175443 | 20260930470000_harden_portal_approval_workspace_scope | 20260930470000_harden_portal_approval_workspace_scope.sql | 1.00 | Candidate — manual review |
| 20260930175759 | 20260930480000_scope_condominium_delete_portal_requests | 20260930480000_scope_condominium_delete_portal_requests.sql | 1.00 | Candidate — manual review |
| 20260930180022 | 20260930490000_harden_profile_column_permissions | 20260930490000_harden_profile_column_permissions.sql | 1.00 | Candidate — manual review |
| 20260930180302 | 20260930500000_harden_condominium_visibility | 20260930500000_harden_condominium_visibility.sql | 1.00 | Candidate — manual review |
| 20260930181023 | harden_unit_workspace_scope | 20260930510000_harden_unit_workspace_scope.sql | 1.00 | Candidate — manual review |
| 20260930181813 | harden_portal_email_uniqueness_case_insensitive | 20260930520000_harden_portal_email_uniqueness.sql | 0.67 | Candidate — manual review |
| 20260930183113 | fix_portal_registration_case_insensitive_upsert | 20260930530000_fix_portal_registration_case_insensitive_upsert.sql | 1.00 | Candidate — manual review |
| 20260930183408 | harden_condominium_delete_carryover_compensations | 20260930540000_harden_condominium_delete_carryover_compensations.sql | 1.00 | Candidate — manual review |
| 20260930185301 | optimize_workspace_manager_rls_auth_check | 20260930194500_optimize_insurance_rls_auth_calls.sql | 0.50 | Candidate — manual review |
| 20260930185307 | restore_workspace_manager_rls_execute | 20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql | 0.29 | Unresolved |
| 20260930185324 | optimize_private_auth_rls_helpers | 20260930194500_optimize_insurance_rls_auth_calls.sql | 0.60 | Candidate — manual review |
| 20260930190330 | fix_installment_schedule_unified_branch_record_reference | 20260930290000_fix_installment_rounding_and_unification.sql | 0.29 | Unresolved |
| 20260930190401 | fix_installment_schedule_fiscal_year_alias_collision | 20260929232000_harden_fiscal_year_closure.sql | 0.29 | Unresolved |
| 20260930190434 | allow_payment_rpc_installment_sync_guard_v2 | 20260930207000_allow_payment_rpc_allocation_update.sql | 0.50 | Candidate — manual review |
| 20260930190448 | honor_payment_rpc_installment_guard_flag | 20260930130000_harden_installment_payment.sql | 0.33 | Unresolved |
| 20260930235538 | harden_public_rpc_security_definer_boundaries | 20260930212000_revoke_trigger_security_definer_execute.sql | 0.33 | Unresolved |
| 20260930235554 | restore_private_claim_admin_execute | 20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql | 0.29 | Unresolved |
| 20260930235652 | remove_client_schema_privileges | 20260929170500_remove_member_millesimi.sql | 0.25 | Unresolved |
| 20261001063435 | final_performance_indexes_communication_recipients | 20261001063435_final_performance_indexes_communication_recipients.sql | 1.00 | Exact version prefix |
| 20261001063530 | lock_down_financial_rpc_anon_execute | 20261001063800_lock_down_financial_rpc_anon_execute.sql | 1.00 | Candidate — manual review |
| 20261001063537 | remove_public_financial_rpc_execute | 20261001063800_lock_down_financial_rpc_anon_execute.sql | 0.50 | Candidate — manual review |
| 20261001063734 | lock_down_condominium_creation_rpc_anon_execute | 20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql | 0.86 | Candidate — manual review |
| 20261001063901 | lock_down_portal_registration_rpc_anon_execute | 20261001063800_lock_down_financial_rpc_anon_execute.sql | 0.71 | Candidate — manual review |
| 20261001063908 | remove_public_portal_registration_rpc_execute | 20260928153301_fix_portal_registration_upsert.sql | 0.33 | Unresolved |
| 20261001081847 | 20261001093000_transfer_current_owner_and_portal_lifecycle | 20261001093000_transfer_current_owner_and_portal_lifecycle.sql | 1.00 | Candidate — manual review |
| 20261001081917 | 20261001094000_index_transfer_closed_by | 20261001094000_index_transfer_closed_by.sql | 1.00 | Candidate — manual review |
| 20261001082509 | 20261001095000_add_unit_cadastral_transformations | 20261001095000_add_unit_cadastral_transformations.sql | 1.00 | Candidate — manual review |
| 20261001082537 | 20261001095700_index_unit_transformation_audit_fks | 20261001095700_index_unit_transformation_audit_fks.sql | 1.00 | Candidate — manual review |
| 20261001082636 | 20261001100500_unit_lifecycle_current_owner_guard | 20261001093000_transfer_current_owner_and_portal_lifecycle.sql | 0.50 | Candidate — manual review |
| 20261001082731 | 20261001102100_unit_transformation_snapshots | 20261001102100_unit_transformation_snapshots.sql | 1.00 | Candidate — manual review |
| 20261001082758 | 20261001102500_unit_transformation_preview | 20261001111000_enrich_unit_transformation_preview.sql | 0.75 | Candidate — manual review |
| 20261001083704 | harden_current_owner_installment_generation | 20261001110500_harden_current_owner_installment_generation.sql | 1.00 | Candidate — manual review |
| 20261001090203 | validate_unit_transformation_preview_inputs | 20261001130000_validate_unit_transformation_preview_inputs.sql | 1.00 | Candidate — manual review |
| 20261001090447 | guard_confirmed_unit_transformation_integrity | 20261001133000_guard_confirmed_unit_transformation_integrity.sql | 1.00 | Candidate — manual review |
| 20261001090613 | lock_confirmed_unit_transformation_audit | 20261001140000_lock_confirmed_unit_transformation_audit.sql | 1.00 | Candidate — manual review |
| 20261001090904 | require_trusted_unit_transformation_confirmation | 20261001150000_require_trusted_unit_transformation_confirmation.sql | 1.00 | Candidate — manual review |
| 20261001091036 | require_confirmed_genealogy_for_unit_lifecycle | 20261001153000_require_confirmed_genealogy_for_unit_lifecycle.sql | 1.00 | Candidate — manual review |
| 20261001091151 | validate_confirmed_unit_transformation_genealogy | 20261001160000_validate_confirmed_unit_transformation_genealogy.sql | 1.00 | Candidate — manual review |
| 20261001091322 | require_active_units_for_transformation_confirmation | 20261001170000_require_active_units_for_transformation_confirmation.sql | 1.00 | Candidate — manual review |
| 20261001091431 | require_resolved_reviews_for_confirmed_unit_transformations | 20261001173000_require_resolved_reviews_for_confirmed_unit_transformations.sql | 1.00 | Candidate — manual review |

## Safety boundary

No migration was executed, no production data/schema was changed, and no branch was reset. Do not treat this map as approval to replay migrations. Missing initial schema/grant migrations and differing names need original SQL recovery or a reviewed baseline reconstruction.
