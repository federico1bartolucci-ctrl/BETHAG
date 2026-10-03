# Supabase migration reconciliation — BETHAG

Branch: `fix/owner-reference-migration-20261003`

## Purpose and safety

This is a working reconciliation ledger, not a deployment plan. A filename/name match is only a candidate association; it does **not** prove that the SQL contents are identical or that a migration is safe to replay. No production migration should be run from this ledger alone. Verify SQL content, dependencies, and actual schema state before proposing any history repair or deployment.

Snapshot: 177 remote migration-history records and 136 SQL files in the branch.

## Candidate associations by migration name

| Supabase version | Supabase name | Repository file |
|---|---|---|
| `20260928045907` | `expose_first_admin_bootstrap` | `20260928060000_expose_first_admin_bootstrap.sql` |
| `20260928153242` | `add_condomino_registration_workflow` | `20260928153242_add_condomino_registration_workflow.sql` |
| `20260928153246` | `add_portal_access_unique_identity` | `20260928153246_add_portal_access_unique_identity.sql` |
| `20260928153301` | `fix_portal_registration_upsert` | `20260928153301_fix_portal_registration_upsert.sql` |
| `20260928153422` | `normalize_portal_access_upsert_key` | `20260928153422_normalize_portal_access_upsert_key.sql` |
| `20260928153526` | `route_unmatched_registration_single_workspace` | `20260928153526_route_unmatched_registration_single_workspace.sql` |
| `20260928154019` | `handle_registration_email_mismatch` | `20260928154000_handle_registration_email_mismatch.sql` |
| `20260929081735` | `add_condominium_insurance_policies` | `20260929110000_add_condominium_insurance_policies.sql` |
| `20260929144737` | `complete_condominium_units` | `20260929165000_complete_condominium_units.sql` |
| `20260929150453` | `remove_member_millesimi` | `20260929170500_remove_member_millesimi.sql` |
| `20260929171530` | `optimize_insurance_rls_auth_calls` | `20260930194500_optimize_insurance_rls_auth_calls.sql` |
| `20260929230350` | `harden_millesimal_allocation_integrity` | `20260929230350_harden_millesimal_allocation_integrity.sql` |
| `20260929230443` | `sync_allocation_payment_status` | `20260929230443_sync_allocation_payment_status.sql` |
| `20260929230529` | `harden_accounting_delete_and_allocation_scope` | `20260929230529_harden_accounting_delete_and_allocation_scope.sql` |
| `20260929232302` | `harden_millesimal_trigger_function_execute` | `20260930183000_harden_millesimal_trigger_function_execute.sql` |
| `20260929232531` | `validate_unit_pertinence_relationship` | `20260930184500_validate_unit_pertinence_relationship.sql` |
| `20260929233045` | `remove_duplicate_unit_relationship_trigger` | `20260930190000_remove_duplicate_unit_relationship_trigger.sql` |
| `20260929233222` | `harden_unit_delete_integrity` | `20260930191500_harden_unit_delete_integrity.sql` |
| `20260930080253` | `optional_account_security` | `20260930090000_optional_account_security.sql` |
| `20260930080309` | `ensure_millesimal_rows_for_units` | `20260930180000_ensure_millesimal_rows_for_units.sql` |
| `20260930080312` | `harden_millesimal_trigger_function_execute` | `20260930183000_harden_millesimal_trigger_function_execute.sql` |
| `20260930080317` | `validate_unit_pertinence_relationship` | `20260930184500_validate_unit_pertinence_relationship.sql` |
| `20260930080320` | `remove_duplicate_unit_relationship_trigger` | `20260930190000_remove_duplicate_unit_relationship_trigger.sql` |
| `20260930080323` | `harden_unit_delete_integrity` | `20260930191500_harden_unit_delete_integrity.sql` |
| `20260930080325` | `allow_authorized_unit_delete` | `20260930193000_allow_authorized_unit_delete.sql` |
| `20260930080328` | `optimize_insurance_rls_auth_calls` | `20260930194500_optimize_insurance_rls_auth_calls.sql` |
| `20260930080838` | `complete_condominium_hard_delete` | `20260930210000_complete_condominium_hard_delete.sql` |
| `20260930100924` | `installment_percentages` | `20260930240000_installment_percentages.sql` |
| `20260930100945` | `allocation_rules_and_consumption` | `20260930241000_allocation_rules_and_consumption.sql` |
| `20260930103120` | `20260930250000_manual_ai_allocation_intake` | `20260930250000_manual_ai_allocation_intake.sql` |
| `20260930103124` | `20260930260000_harden_allocation_intake_validation` | `20260930260000_harden_allocation_intake_validation.sql` |
| `20260930103128` | `20260930270000_validate_allocation_table_scope` | `20260930270000_validate_allocation_table_scope.sql` |
| `20260930103254` | `20260930240000_installment_percentages` | `20260930240000_installment_percentages.sql` |
| `20260930103432` | `20260930120000_fix_building_scope_allocation_rpc` | `20260930120000_fix_building_scope_allocation_rpc.sql` |
| `20260930103819` | `20260930130000_harden_installment_payment` | `20260930130000_harden_installment_payment.sql` |
| `20260930104150` | `20260930150000_harden_fiscal_carryover_member_scope` | `20260930150000_harden_fiscal_carryover_member_scope.sql` |
| `20260930104416` | `20260930160000_fiscal_carryover_compensation` | `20260930160000_fiscal_carryover_compensation.sql` |
| `20260930104518` | `20260930161000_harden_carryover_compensation_semantics` | `20260930161000_harden_carryover_compensation_semantics.sql` |
| `20260930114719` | `guard_unit_scope_changes` | `20260930211000_guard_unit_scope_changes.sql` |
| `20260930114808` | `revoke_trigger_security_definer_execute` | `20260930212000_revoke_trigger_security_definer_execute.sql` |
| `20260930114835` | `revoke_trigger_security_definer_execute_explicit_roles` | `20260930213000_revoke_trigger_security_definer_execute_explicit_roles.sql` |
| `20260930115502` | `repair_unit_owner_references` | `20260930214000_repair_unit_owner_references.sql` |
| `20260930115644` | `validate_unit_owner_member_refs` | `20260930215000_validate_unit_owner_member_refs.sql` |
| `20260930125903` | `condominium_creation_intakes` | `20260930125903_condominium_creation_intakes.sql` |
| `20260930162854` | `work_accounting_integrity_indexes` | `20260930280000_work_accounting_integrity_indexes.sql` |
| `20260930174121` | `20260930460000_harden_condominium_member_visibility` | `20260930460000_harden_condominium_member_visibility.sql` |
| `20260930175443` | `20260930470000_harden_portal_approval_workspace_scope` | `20260930470000_harden_portal_approval_workspace_scope.sql` |
| `20260930175759` | `20260930480000_scope_condominium_delete_portal_requests` | `20260930480000_scope_condominium_delete_portal_requests.sql` |
| `20260930180022` | `20260930490000_harden_profile_column_permissions` | `20260930490000_harden_profile_column_permissions.sql` |
| `20260930180302` | `20260930500000_harden_condominium_visibility` | `20260930500000_harden_condominium_visibility.sql` |
| `20260930181023` | `harden_unit_workspace_scope` | `20260930510000_harden_unit_workspace_scope.sql` |
| `20260930183113` | `fix_portal_registration_case_insensitive_upsert` | `20260930530000_fix_portal_registration_case_insensitive_upsert.sql` |
| `20260930183408` | `harden_condominium_delete_carryover_compensations` | `20260930540000_harden_condominium_delete_carryover_compensations.sql` |
| `20261001063435` | `final_performance_indexes_communication_recipients` | `20261001063435_final_performance_indexes_communication_recipients.sql` |
| `20261001063530` | `lock_down_financial_rpc_anon_execute` | `20261001063800_lock_down_financial_rpc_anon_execute.sql` |
| `20261001081847` | `20261001093000_transfer_current_owner_and_portal_lifecycle` | `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` |
| `20261001081917` | `20261001094000_index_transfer_closed_by` | `20261001094000_index_transfer_closed_by.sql` |
| `20261001082509` | `20261001095000_add_unit_cadastral_transformations` | `20261001095000_add_unit_cadastral_transformations.sql` |
| `20261001082537` | `20261001095700_index_unit_transformation_audit_fks` | `20261001095700_index_unit_transformation_audit_fks.sql` |
| `20261001082731` | `20261001102100_unit_transformation_snapshots` | `20261001102100_unit_transformation_snapshots.sql` |
| `20261001083704` | `harden_current_owner_installment_generation` | `20261001110001_harden_current_owner_installment_generation.sql` |
| `20261002045022` | `fix_member_portal_workspace_transfer` | `20261001101500_fix_member_portal_workspace_transfer.sql` |
| `20261002045106` | `prevent_portal_reactivation_for_transferred_members` | `20261002045106_prevent_portal_reactivation_for_transferred_members.sql` |
| `20261002045430` | `fix_member_transfer_workspace_members_lookup` | `20261002060000_fix_member_transfer_workspace_members_lookup.sql` |
| `20261002110808` | `validate_transfer_outgoing_owner` | `20261002110808_validate_transfer_outgoing_owner.sql` |
| `20261002113421` | `revoke_excess_public_table_privileges` | `20261002113421_revoke_excess_public_table_privileges.sql` |
| `20261002113618` | `secure_default_function_and_sequence_privileges` | `20261002113618_secure_default_function_and_sequence_privileges.sql` |
| `20261002113631` | `revoke_default_sequence_update_privilege` | `20261002113631_revoke_default_sequence_update_privilege.sql` |
| `20261003043520` | `preserve_transfer_extraordinary_allocations` | `20261003050000_preserve_transfer_extraordinary_allocations.sql` |
| `20261003043706` | `expose_captured_transfer_snapshot` | `20261003052000_expose_captured_transfer_snapshot.sql` |
| `20261003045727` | `expand_member_transfer_preview_installments` | `20261003060000_expand_member_transfer_preview_installments.sql` |
| `20261003045905` | `preserve_future_installments_transfer_snapshot` | `20261003061000_preserve_future_installments_transfer_snapshot.sql` |
| `20261003050209` | `include_unit_unassigned_installments_in_transfer` | `20261003062000_include_unit_unassigned_installments_in_transfer.sql` |
| `20261003050443` | `include_unit_unassigned_carryovers_in_transfer` | `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql` |
| `20261003050722` | `block_transfer_close_with_unresolved_unit_carryovers` | `20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql` |

## Remote records without a filename-name match

| Supabase version | Supabase name |
|---|---|
| `20260928021707` | `initial_bethag_backend` |
| `20260928021808` | `tighten_portal_rls` |
| `20260928021935` | `sync_auth_profiles` |
| `20260928021944` | `privatize_rls_functions` |
| `20260928022046` | `add_legacy_ids_for_migration` |
| `20260928022126` | `tighten_condominium_member_visibility` |
| `20260928022526` | `add_condominium_member_legacy_unique_key` |
| `20260928022821` | `add_workspace_legacy_unique_constraints` |
| `20260928024823` | `bootstrap_first_workspace_admin` |
| `20260928024931` | `harden_first_admin_rpc` |
| `20260928040840` | `allow_portal_residents_read_condominiums` |
| `20260928041428` | `persist_collaborator_legacy_ids` |
| `20260928042328` | `enforce_collaborator_module_permissions` |
| `20260928042333` | `refine_collaborator_permission_scope` |
| `20260928043406` | `harden_authenticated_request_policies` |
| `20260928043415` | `finish_authenticated_rls_hardening` |
| `20260928043547` | `restrict_data_api_table_grants` |
| `20260928043604` | `optimize_rls_auth_checks` |
| `20260928043608` | `add_foreign_key_indexes` |
| `20260928043618` | `optimize_portal_access_auth_check` |
| `20260928043823` | `restrict_private_security_definer_functions` |
| `20260928043835` | `remove_anon_private_function_execute` |
| `20260928045050` | `enforce_portal_content_permissions` |
| `20260928072127` | `add_save_condominium_rpc` |
| `20260928072401` | `lock_down_save_condominium_rpc` |
| `20260928152153` | `tighten_public_bootstrap_rpc_execute` |
| `20260928154553` | `add_condominium_units_and_member_unit_link_v2` |
| `20260928154629` | `enforce_owner_tenant_portal_permissions` |
| `20260928154639` | `privatize_portal_member_permissions_trigger` |
| `20260928164443` | `security_hardening_and_fk_indexes` |
| `20260928164852` | `complete_condominium_delete_rpc_and_rls_optimization` |
| `20260928164904` | `restrict_delete_condominium_rpc_execute` |
| `20260928164912` | `optimize_portal_access_email_rls` |
| `20260928222840` | `grant_is_workspace_manager_execute_to_authenticated` |
| `20260929065325` | `add_allocation_table_reference` |
| `20260929065406` | `add_expense_allocation_rpc` |
| `20260929065622` | `add_installments_from_allocations_rpc` |
| `20260929070002` | `add_condominium_budget` |
| `20260929070815` | `protect_closed_accounting_periods` |
| `20260929070857` | `fix_closed_accounting_trigger_return` |
| `20260929071057` | `add_condominium_register_and_suppliers` |
| `20260929071403` | `link_register_items_to_suppliers` |
| `20260929071513` | `add_condominium_works` |
| `20260929071728` | `add_work_documents_link` |
| `20260929072149` | `fix_work_document_legacy_id` |
| `20260929072255` | `link_works_special_funds` |
| `20260929072411` | `add_work_progress_sal` |
| `20260929072831` | `link_work_progress_accounting` |
| `20260929073258` | `add_work_event_history` |
| `20260929074236` | `link_work_progress_accounting` |
| `20260929075201` | `add_condominium_audit_log` |
| `20260929075312` | `protect_work_economic_values` |
| `20260929080009` | `lock_trigger_function_execution` |
| `20260929080144` | `index_condominium_module_foreign_keys` |
| `20260929093700` | `align_condominium_manager_authorization` |
| `20260929093800` | `optimize_insurance_fk_and_portal_rls` |
| `20260929093830` | `optimize_portal_access_jwt_rls_initplan` |
| `20260929094656` | `align_condominium_insurance_schema_20260929` |
| `20260929205021` | `add_expense_allocation_engine` |
| `20260929205053` | `harden_expense_allocation_rpc` |
| `20260929205121` | `fix_expense_allocation_rpc_unit_alias` |
| `20260929205155` | `harden_installment_generation` |
| `20260929225302` | `tighten_unit_permissions_and_workspace_condo_read` |
| `20260929225423` | `align_insurance_permissions_with_condomini_module` |
| `20260930080331` | `clean_deleted_member_owner_references` |
| `20260930081022` | `allow_authorized_collaborator_save_condominium` |
| `20260930142230` | `add_bethag_document_storage` |
| `20260930181813` | `harden_portal_email_uniqueness_case_insensitive` |
| `20260930185301` | `optimize_workspace_manager_rls_auth_check` |
| `20260930185307` | `restore_workspace_manager_rls_execute` |
| `20260930185324` | `optimize_private_auth_rls_helpers` |
| `20260930190330` | `fix_installment_schedule_unified_branch_record_reference` |
| `20260930190401` | `fix_installment_schedule_fiscal_year_alias_collision` |
| `20260930190434` | `allow_payment_rpc_installment_sync_guard_v2` |
| `20260930190448` | `honor_payment_rpc_installment_guard_flag` |
| `20260930235538` | `harden_public_rpc_security_definer_boundaries` |
| `20260930235554` | `restore_private_claim_admin_execute` |
| `20260930235652` | `remove_client_schema_privileges` |
| `20261001063537` | `remove_public_financial_rpc_execute` |
| `20261001063734` | `lock_down_condominium_creation_rpc_anon_execute` |
| `20261001063901` | `lock_down_portal_registration_rpc_anon_execute` |
| `20261001063908` | `remove_public_portal_registration_rpc_execute` |
| `20261001082636` | `20261001100500_unit_lifecycle_current_owner_guard` |
| `20261001082758` | `20261001102500_unit_transformation_preview` |
| `20261001090203` | `validate_unit_transformation_preview_inputs` |
| `20261001090447` | `guard_confirmed_unit_transformation_integrity` |
| `20261001090613` | `lock_confirmed_unit_transformation_audit` |
| `20261001090904` | `require_trusted_unit_transformation_confirmation` |
| `20261001091036` | `require_confirmed_genealogy_for_unit_lifecycle` |
| `20261001091151` | `validate_confirmed_unit_transformation_genealogy` |
| `20261001091322` | `require_active_units_for_transformation_confirmation` |
| `20261001091431` | `require_resolved_reviews_for_confirmed_unit_transformations` |
| `20261002050057` | `secure_member_transfer_public_wrappers` |
| `20261002050232` | `assign_missing_condominium_member_legacy_id` |
| `20261002050900` | `fix_member_transfer_archived_column_check` |
| `20261002073557` | `tighten_resident_portal_identity_binding` |
| `20261002074251` | `fix_member_transfer_status_constraint` |
| `20261002074541` | `prevent_duplicate_confirmed_member_transfers` |
| `20261003021711` | `fix_deleted_member_owner_references_workspace_scope` |
| `20261003022110` | `block_unverified_transfer_identity` |
| `20261003022133` | `gate_portal_registration_verified_identity` |
| `20261003030800` | `20261003040000_restrict_audit_log_to_workspace_admins` |

## Next reconciliation criteria

1. Compare each candidate file against the SQL captured in its introducing Git commit and subsequent amendments.
2. For unmatched remote records, inspect commit history and database definitions to identify missing, renamed, or dashboard-applied changes.
3. For unmatched repository files, establish whether they are pending, superseded, already represented by a differently named applied migration, or unsafe/incomplete.
4. Prepare a reviewed migration sequence and explicit history-repair plan only after these checks; preserve existing financial and ownership records.

## Status

Name-based candidates are inventoried. Content-level equivalence and deployment eligibility remain unverified.
## Live database inspection — transfer accounting (2026-10-03)

Read-only inspection of the connected Supabase project confirmed that the transfer workflow currently has:
- private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) and private.close_condominium_member_transfer(uuid) as SECURITY DEFINER functions with an empty search_path.
- Public SECURITY DEFINER wrappers for both operations, executable by authenticated and service_role; the confirmation wrapper rejects a supplied incoming user ID with INCOMING_IDENTITY_REQUIRES_VERIFICATION before calling the private implementation.
- public.preview_condominium_member_transfer(uuid,uuid,date) and public.get_member_transfer_accounting_snapshot(uuid) are present and executable by authenticated users; both apply a workspace-module access check.
- The live confirmation function contains the outgoing-owner/current-owner guard, locks the unit row, and persists an immutable accounting_snapshot. The snapshot currently includes future installments, marks unit-unassigned installments, records unit-unassigned carryovers, and preserves extraordinary allocations deliberated before the transfer date but due later.
- The live close function refuses closure while outgoing installments, allocations, member carryovers, or unit-unassigned carryovers remain unresolved.

This confirms that the corresponding transfer protections are present in the live schema. It does not establish byte-for-byte equivalence between each historical SQL file and the applied SQL, nor does it authorize replay. The frontend calls the public wrappers, not the private functions directly. These checks were read-only; no live data or migration history was changed.
## Additional transfer closure defect identified (2026-10-03)

Review of the live `private.close_condominium_member_transfer(uuid)` definition found that closure checked member-assigned installments, expense allocations, member carryovers, and unit-unassigned fiscal carryovers, but did not check unit-unassigned installments. The preview and confirmation-time snapshot include such installments, so an administrator could otherwise close/archive the outgoing member while an unresolved unit-level installment remained. The live `condominium_installments` schema includes `workspace_id`, `condominium_id`, `unit_id`, `member_id`, `amount`, and `paid_amount`, supporting a workspace- and condominium-scoped guard.

Added `20261003071000_block_transfer_close_with_unassigned_installments.sql` to the working branch. It updates the existing close function definition idempotently, adds the outstanding unit-level installment sum, and includes it in the closure-blocking condition. The migration has not been applied to Supabase; validate its function-definition anchor against the target migration sequence before deployment.