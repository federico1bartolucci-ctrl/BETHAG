# Supabase migration reconciliation — BETHAG

Branch: `fix/owner-reference-migration-20261003`

## Purpose and safety

This is a working reconciliation ledger, not a deployment plan. A filename/name match is only a candidate association; it does **not** prove that the SQL contents are identical or that a migration is safe to replay. No production migration should be run from this ledger alone. Verify SQL content, dependencies, and actual schema state before proposing any history repair or deployment.

Snapshot: 177 remote migration-history records and 152 SQL files in the branch (directory inventory refreshed 2026-10-04). The 14-digit filename version prefixes are unique (no duplicates detected in this snapshot).

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

## Branch migrations pending content-level reconciliation

| Branch version | Migration file | Status |
|---|---|---|
| `20261003072000` | `20261003072000_capture_transfer_unit_expenses.sql` | Branch-only change; not matched to remote version `20261003050722` and not applied to production |
| `20261003073000` | `20261003073000_scope_transfer_unit_expenses.sql` | Branch-only change; scopes preview and snapshot ledger expense readers; pending content-level reconciliation and not applied to production |

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

Added `20261003071000_block_transfer_close_with_unassigned_installments.sql` to the working branch. It updates the existing close function definition idempotently, adds the outstanding unit-level installment sum, and includes it in the closure-blocking condition. A subsequent read-only `pg_get_functiondef` inspection of the live `private.close_condominium_member_transfer(uuid)` confirmed that the declaration fragment, unit-carryover query anchor, and closure condition expected by the migration match the currently deployed function. The live migration history still ends at `20261003050722`, so this `20261003071000` change is not recorded as applied. This validates the anchor against the current live definition only; it does not prove the migration is safe against every possible intervening schema state. The migration has not been applied to Supabase.


## Read-only function reconciliation — 2026-10-03 (continued)

A subsequent read-only inspection of the live function definitions confirmed:
- `private.close_condominium_member_transfer(uuid)` includes the unit-unassigned fiscal carryover guard but does not yet include the unit-unassigned installment guard from branch migration `20261003071000`.
- `public.preview_condominium_member_transfer(uuid,uuid,date)` and `public.get_member_transfer_accounting_snapshot(uuid)` already expose unit ledger expenses, but their current live source queries do not yet apply the workspace and `direction='Uscita'` predicates proposed in `20261003073000`.
- `private.confirm_condominium_member_transfer(...)` does not yet include the `unit_expenses` snapshot key proposed in `20261003072000`.

These are observed differences between the live function definitions and the pending branch changes, not evidence that the pending migrations have executed successfully. Inspection was read-only; production schema and migration history were not changed. Content-level and dependency review remains pending before deployment eligibility can be determined.


## Transfer migration anchor and function metadata check — 2026-10-03

A read-only comparison against current production function definitions confirmed that the exact insertion anchors expected by the pending migrations are present: the accounting-snapshot insertion point in `private.confirm_condominium_member_transfer(...)`, the unit-ledger query in `public.preview_condominium_member_transfer(...)`, and the unit-ledger query in `public.get_member_transfer_accounting_snapshot(...)`. The confirmation function is currently `SECURITY DEFINER` with an empty search path; the two public readers are currently not `SECURITY DEFINER` and use a public search path. The proposed changes use `CREATE OR REPLACE` through `pg_get_functiondef`, so this metadata must be preserved and rechecked after migration in a controlled non-production environment.

The date and direction predicates in the unit-expense snapshot proposal are aligned conceptually across confirmation, preview, and snapshot reader: outgoing expenses are selected when the entry date or deliberation date is on/before the transfer date, and direction is restricted to `Uscita`. Exact anchor presence is verified; runtime behavior, row-level authorization behavior, and full migration execution are not yet tested. No production changes were made.


## Forward scope repair — 2026-10-03

The extraordinary-allocation snapshot query also needed explicit tenant and condominium predicates on both the allocation and ledger-entry rows. The branch's `20261003050000_preserve_transfer_extraordinary_allocations.sql` now includes those predicates for fresh installations. Because production migration history may already have recorded that earlier version, a separate forward migration `20261003074000_scope_extraordinary_transfer_allocations.sql` was added to repair the live function definition idempotently when the unscoped query is still present. It verifies the exact expected query anchor and aborts if the anchor is missing, duplicated, or inconsistently both scoped and unscoped. The new migration is branch-only and has not been applied to production; its runtime execution still requires controlled validation.


## Anchor precision correction — 2026-10-03

The first compact single-line anchor drafted for `20261003074000` did not match the canonical multiline formatting returned by production `pg_get_functiondef`. The branch migration has been corrected to use the observed multiline predicate sequence. A subsequent read-only exact-string check confirmed the unscoped multiline anchor is present in the live confirmation function and the scoped replacement is absent. This confirms the forward migration's textual target against the current live definition; it does not validate execution, privileges preservation, or end-to-end transfer behavior. Production remains unchanged.


## Transfer installment tenant scoping — 2026-10-03

Added forward migration `20261003075000_scope_transfer_installment_queries.sql`. Read-only inspection of production function definitions showed that installment reads in `preview_condominium_member_transfer` and `confirm_condominium_member_transfer` matched outgoing-member or unit-unassigned records without an explicit workspace/condominium predicate. The new migration scopes those matching installment predicates to `v_workspace` and `v_condominium`, with guards against mixed scoped/unscoped variants. It is branch-only and has not been executed on production; controlled database validation remains pending.


## Transfer allocation tenant scoping — 2026-10-03

Added forward migration `20261003076000_scope_transfer_allocation_totals.sql`. It scopes allocation reads in the transfer preview, confirmation snapshot, and accounting snapshot reader by workspace and condominium. The snapshot reader also scopes incoming-member allocation totals. The migration checks for missing anchors and mixed scoped/unscoped variants before replacing function definitions. Branch-only; not executed against production. A controlled database run is still required to validate exact function formatting, behavior, and preservation of function metadata.


## Transfer preview extraordinary allocation scope — 2026-10-03

Added `20261003077000_scope_preview_extraordinary_allocations.sql` to apply workspace/condominium predicates to extraordinary allocation rows and their linked ledger entries in the preview function. A read-only exact-anchor check against the current production function definition confirmed the migration's unscoped predicate is present. This verifies target text only; migration execution and behavior remain untested, and production was not modified.


## Transfer snapshot installment scoping and anchor hardening — 2026-10-03

Added forward migration `20261003078000_scope_snapshot_installment_totals.sql` to scope outgoing and incoming installment totals in `public.get_member_transfer_accounting_snapshot(uuid)` by the transfer's workspace and condominium. The exact unscoped query appears three times for outgoing totals and once for incoming totals in the inspected live definition; the migration verifies the expected occurrence counts before replacement. The branch file was re-read from GitHub and its blob verified. It is branch-only, not applied to production, and not runtime-tested.

Further hardened `20261003075000_scope_transfer_installment_queries.sql` and `20261003076000_scope_transfer_allocation_totals.sql` with exact anchor-count checks before global replacements. Current read-only production definitions contain seven and six matching installment predicates in preview and confirmation respectively, and two outgoing allocation predicates in each function; the snapshot reader has one outgoing allocation predicate. Both revised files were re-read from GitHub and their blob hashes confirmed. These checks reduce the risk of silently rewriting unexpected function text but do not substitute for execution in a controlled test database.

No migration was applied to Supabase production, no data or migration history was changed, and no overall QA/collaudo or PR merge was performed.


## Unit carryover anchor hardening — 2026-10-03

Hardened `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql` to require exactly one unscoped unit-carryover query before rewriting each existing preview/confirmation function, and to reject mixed scoped/unscoped variants. The snapshot insertion anchor is also required to be unique. Read-only inspection confirms the live preview and confirmation definitions each contain the expected unscoped carryover query and the snapshot key, so the repair branch is relevant to the observed schema. The updated file was committed and its GitHub blob verified. No production changes were made.

The close-function inspection also confirms the unit-level fiscal carryover guard from the already-existing live definition, while the additional unit-unassigned installment closure guard from `20261003071000` is still absent. The latter remains a branch-only pending correction; migration execution and QA remain deferred until the full issue set is reconciled.


## Unit-unassigned installment migration hardening — 2026-10-03

Hardened `20261003062000_include_unit_unassigned_installments_in_transfer.sql` with expected occurrence counts for outgoing installment predicates in preview and confirmation, plus a unique JSON insertion anchor for the assignment-scope marker. Hardened `20261003071000_block_transfer_close_with_unassigned_installments.sql` to require unique declaration, unit-carryover query, and closure-condition anchors before modifying the close function. Both files were committed to the working branch and their updated content was fetched back from GitHub. These are textual guards only: no migration execution, production write, overall QA, or merge was performed.


## Scope repair anchor reconciliation — 2026-10-03

Read-only inspection of the live transfer function definitions confirmed one unit-expense anchor in preview and one in the accounting snapshot reader. The preview extraordinary-allocation predicate occurs twice in the live function, so migration `20261003077000_scope_preview_extraordinary_allocations.sql` was corrected to require exactly two anchors before replacing both. Migrations `20261003073000_scope_transfer_unit_expenses.sql` and `20261003078000_scope_snapshot_installment_totals.sql` now reject mixed states where scoped and unscoped predicates coexist, rather than treating any scoped occurrence as complete idempotency.

These changes only update SQL files in the working branch. No production migration or full QA was run.


## Migration dependency ordering correction — 2026-10-03

Corrected 20261003062000_include_unit_unassigned_installments_in_transfer.sql so it performs only the semantic expansion from member-assigned installments to member-assigned plus unit-unassigned installments. Workspace and condominium filtering is deliberately deferred to 20261003075000_scope_transfer_installment_queries.sql. This preserves a valid dependency chain: 0620 introduces the expanded predicate, and 0750 scopes that exact predicate. Previously, 0620 embedded tenant filters itself, which made the subsequent 0750 anchor impossible to match in sequence.

Also corrected the declaration anchor in 20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql to target the unique v_open_carryovers numeric; declaration independently of other variables in the function's DECLARE list. The revised 0620 and 0640 files were fetched back from GitHub and their blob hashes verified. These corrections are branch-only; no production migration was run.


## Incoming allocation mixed-state guard — 2026-10-03

Hardened `20261003076000_scope_transfer_allocation_totals.sql`: the incoming-member allocation predicate in the accounting snapshot reader now explicitly rejects a mixed state containing both scoped and unscoped predicates, and requires exactly one anchor when the unscoped form remains. The revised migration was fetched back from GitHub and its blob SHA verified. This remains a branch-only SQL change; no production migration, overall QA, or merge was performed.


## Idempotence completeness checks — 2026-10-03

Strengthened `20261003077000_scope_preview_extraordinary_allocations.sql` so its already-scoped path requires both expected predicate occurrences, not merely one. Strengthened `20261003078000_scope_snapshot_installment_totals.sql` to verify that all three outgoing and the single incoming snapshot installment predicates are scoped, with no unscoped remnants, before returning successfully. Both files were fetched back and their blob hashes verified. These are branch-only textual safeguards; production remains unchanged and full QA/collaudo remains deferred.


## Close guard idempotence hardening — 2026-10-03

Strengthened `20261003071000_block_transfer_close_with_unassigned_installments.sql`: the already-installed path now verifies exactly one declaration, the complete unit-installment query and condition, and rejects duplicates or coexistence with the unscoped unit-carryover anchor. The migration was fetched back from GitHub and its blob hash verified. This remains branch-only; no production migration or overall QA/collaudo was run.


## Future installment preview/snapshot idempotence — 2026-10-03

Hardened `20261003060000_expand_member_transfer_preview_installments.sql` and `20261003061000_preserve_future_installments_transfer_snapshot.sql`. Their already-present paths now require exactly one occurrence of each expected JSON key and verify the relevant outgoing-member, future-date, and outstanding-balance predicates before returning. Both migration files were fetched back from GitHub and their blob SHAs verified. These remain branch-only changes; no production migration, merge, deployment, or full QA/collaudo was performed.


## Carryover and expense snapshot guards — 2026-10-03

Hardened `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql` to require exactly one snapshot key and one scoped query, rejecting an unscoped remnant and checking the residual-balance filter. Hardened `20261003072000_capture_transfer_unit_expenses.sql` to reject duplicate keys and require source, tenant, unit, direction, and date filters. Hardened `20261003074000_scope_extraordinary_transfer_allocations.sql` to reject duplicate scoped predicates and mixed scoped/unscoped states. All three files were fetched back from GitHub and their blob SHAs verified. Branch-only; no production migration, merge, deployment, or overall QA/collaudo performed.


## Captured accounting snapshot idempotence — 2026-10-03

Hardened `20261003052000_expose_captured_transfer_snapshot.sql`: the already-installed path now requires exactly one captured-snapshot JSON key and exactly one expected source expression, rejecting missing, duplicate, or malformed states. The updated migration was fetched back from GitHub and its blob SHA verified. Branch-only change; no production migration, merge, deployment, or overall QA/collaudo was performed.


## Extraordinary allocation snapshot idempotence — 2026-10-03

Hardened `20261003050000_preserve_transfer_extraordinary_allocations.sql`: the already-present snapshot path now verifies a unique JSON key and the expected allocation/ledger workspace and condominium filters plus extraordinary-expense type. The updated migration was fetched back from GitHub and its blob SHA verified. This is a branch-only safeguard; no production migration, merge, deployment, or overall QA/collaudo was performed.


## Transfer close-guard idempotence correction — 2026-10-03

Corrected `20261003071000_block_transfer_close_with_unassigned_installments.sql`: its already-installed path previously rejected the expected unit-carryover query anchor, even though that query correctly remains in the function after the installment guard is added. The path now requires the carryover anchor exactly once and validates the installment condition exactly once, alongside the existing declaration/query checks. The migration was fetched back from GitHub and its blob SHA verified. Branch-only; no production migration or overall QA/collaudo was run.


## Installment migration exact-count hardening — 2026-10-03

Hardened `20261003075000_scope_transfer_installment_queries.sql` so its already-scoped path validates the exact expected seven preview and six confirmation predicates, rejecting duplicates, omissions, or mixed scoped/unscoped states. Hardened `20261003062000_include_unit_unassigned_installments_in_transfer.sql` with the same exact counts for expanded predicates and a uniqueness check for the `assignment_scope` JSON key. Both files were fetched back from GitHub and their blob SHAs verified. Branch-only; production was not changed, and full QA/collaudo remains deferred.


## Allocation total scope exact-count hardening — 2026-10-03

Hardened `20261003076000_scope_transfer_allocation_totals.sql`: the already-scoped path now validates exact expected counts for outgoing allocation predicates (two each in preview and confirmation, one in snapshot reader) and exactly one incoming snapshot predicate, rejecting missing, duplicated, or mixed scoped/unscoped conditions. The migration was fetched back from GitHub and its blob SHA verified. Branch-only; no production migration or full QA/collaudo was run.


## Repair migration 0500 SQL construction — 2026-10-03

Repaired `20261003050000_preserve_transfer_extraordinary_allocations.sql`: reconstructed the complete replacement string for the immutable extraordinary-allocation snapshot, restored the scoped allocation/ledger join and its tenant, condominium, expense-type, deliberation-date, and due-date filters, and retained a fail-closed idempotence path with unique key/source/scope checks. The updated migration was fetched back from GitHub and its exact content and blob SHA verified. This is a source-level correction only; SQL execution against a database has not been claimed, production remains unchanged, and full QA/collaudo remains deferred.


## Unit expense scope idempotence — 2026-10-03

Hardened `20261003073000_scope_transfer_unit_expenses.sql`: the already-scoped path now requires exactly one scoped predicate per target function and rejects any remaining unscoped variant. The file was fetched back from GitHub and the resulting blob SHA verified. This is a branch-only source change; no production DDL or data changes and no full QA/collaudo were performed.


## Extraordinary preview idempotence count correction — 2026-10-03

Corrected `20261003077000_scope_preview_extraordinary_allocations.sql`: the already-scoped path had compared the byte-length delta against one predicate length despite requiring two occurrences. It now compares against twice the predicate length, so both expected preview predicates must be present. The source was fetched back and its blob SHA verified. Branch-only; no database execution or production change, and full QA/collaudo remains deferred.


## Snapshot installment guard cleanup — 2026-10-03

Cleaned `20261003078000_scope_snapshot_installment_totals.sql` by removing a duplicated pair of final outgoing/incoming scope validations. The remaining checks still enforce the expected three outgoing and one incoming scoped predicates and reject unscoped variants. Updated source was fetched back from GitHub and its blob SHA verified. Branch-only; no database execution or production change, and full QA/collaudo remains deferred.


## Unit expense snapshot idempotency hardening — 2026-10-03

Hardened `20261003072000_capture_transfer_unit_expenses.sql`: when the snapshot key is already present, the guard now requires exactly one occurrence of each source, unit, condominium, workspace, direction, and pre-transfer date predicate, while still rejecting duplicate snapshot keys. Updated migration was fetched back from GitHub and its blob SHA verified. Branch-only; no database execution or production change, and full QA/collaudo remains deferred.


## Future installment snapshot guard hardening — 2026-10-03

Updated `20261003061000_preserve_future_installments_transfer_snapshot.sql` so the already-applied guard requires exactly two occurrences of the future-due predicate and exactly two residual-positive predicates, in addition to unique snapshot keys and the outgoing-member filter. Source fetched back and verified. Branch-only; no database execution or production change; full QA/collaudo deferred.


## Future installment preview guard hardening — 2026-10-03

Updated `20261003060000_expand_member_transfer_preview_installments.sql` so the already-applied guard requires exactly two occurrences of the future-due predicate and exactly one residual-positive predicate, while retaining unique checks for the snapshot keys. Source was fetched back from GitHub and verified. Branch-only; no database execution or production change; full QA/collaudo deferred.


## Preview residual predicate count correction — 2026-10-03

During cross-review, corrected the already-applied guard in `20261003060000_expand_member_transfer_preview_installments.sql`: the residual-positive predicate appears in both `outstanding_total` and `outstanding_due_after`, so the required exact count is two, not one. The updated source was fetched back and verified. Branch-only; no database execution or production change; full QA/collaudo remains deferred.


## Unit-level carryover migration control-flow repair — 2026-10-03

Corrected `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql`: the unscoped carryover query is now tenant-scoped and the snapshot insertion is performed in the same function-definition update, with a single execution after both transformations. Removed the stray control-flow closure that made the migration block structurally invalid. Source was fetched back and matched exactly. Static source review only; no SQL execution, database mutation, production change, or full QA/collaudo.


## Unit carryover idempotency occurrence correction — 2026-10-03

Further review of `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql` found that the scoped carryover predicate is expected twice after transformation: once in the original carryover query and once in the inserted snapshot aggregation. Corrected the already-installed guard to require exactly two occurrences, rather than one. Updated migration fetched back and verified. Source-level verification only; no database execution or production changes; full QA/collaudo remains deferred.

## Captured snapshot migration source repair — 2026-10-03

Static review found that `20261003052000_expose_captured_transfer_snapshot.sql` had a malformed `v_new` dollar-quoted string: part of the migration body had been inserted inside the replacement text, leaving the PL/pgSQL block structurally invalid. Reconstructed the replacement as the captured snapshot JSON key/source followed by the existing transfer JSON object anchor, and restored the intended executable block. The corrected file was committed to the feature branch and fetched back from GitHub with exact content equality. This is source-level verification only; no SQL was run against Supabase, production remains unchanged, and comprehensive QA/collaudo is still deferred.

## Captured snapshot insertion anchor correction — 2026-10-03

Cross-review against the foundational `20261001110000_add_member_transfer_accounting_snapshot.sql` found that the canonical transfer JSON anchor is `'transfer',jsonb_build_object(`, without a space after the comma. Corrected `20261003052000_expose_captured_transfer_snapshot.sql` to match that exact source anchor, so the forward migration can locate the insertion point in the function created by the base migration. Updated file was fetched back from GitHub and exact content equality verified. Source-level correction only; no SQL execution or production changes. Full QA/collaudo remains deferred until the known migration issues are resolved.

## Captured snapshot dollar-quote defect correction — 2026-10-03

A fresh full-file read of `20261003052000_expose_captured_transfer_snapshot.sql` showed that its `v_old` dollar-quoted string was still malformed and duplicate trailing source remained after the migration block, despite the earlier anchor correction note. Rebuilt the complete file so `v_old` is exactly `$old$'transfer',jsonb_build_object($old$`, `v_new` contains only the intended captured-snapshot insertion, and the DO block closes once. The replacement was fetched back from the feature branch and exact content equality verified. This is a source correction only; no SQL execution, production change, merge, deployment, or comprehensive QA/collaudo was performed.


## Transfer close financial tenant/unit scope — 2026-10-04

Added `20261003079000_scope_transfer_close_financial_positions.sql` after the live-schema review found that the close function's outgoing-owner installment, expense-allocation, and fiscal-carryover checks filtered only by member ID. The migration now binds each check to the transfer's workspace, condominium, and unit, with exact-anchor counts and fail-closed mixed-state handling. The new migration was fetched back from GitHub and its blob SHA recorded. Source-level change only: no migration was executed, production was not modified, and full QA/collaudo remains deferred.


## Extraordinary allocation scope migration ordering correction — 2026-10-04

Review of the migration patches identified an ordering defect: `20261003076000_scope_transfer_allocation_totals.sql` scopes outgoing allocation predicates before `20261003077000_scope_preview_extraordinary_allocations.sql` runs, so the latter's original unscoped anchor could not match. Updated 0770 to require the tenant-scoped allocation anchor created by 0760, then add the ledger workspace/condominium predicates. The migration retains two-occurrence checks and rejects partial/mixed states. File was fetched back from GitHub after the change. This is source-level reconciliation only; no SQL was executed against production.


## Allocation-scope migration occurrence-count correction — 2026-10-04

Cross-review of 0740 and 0760 found that 0740 already scopes the confirmation function's extraordinary allocation predicate, leaving only one ordinary outgoing allocation predicate for 0760 to scope there. The previous expected count of two would stop the migration. Updated 0760 to expect one scoped outgoing anchor for the private confirmation function and retain two for preview; snapshot-reader behavior remains unchanged. The updated source was fetched back from GitHub and checked for the corrected branch-specific count. No SQL was executed and production remains unchanged.


## Follow-up correction: 0740 anchor formatting and 0760 counts — 2026-10-04

A deeper comparison against the live `private.confirm_condominium_member_transfer` definition showed that 0740's multiline anchor did not match the deployed function's single-line predicate. Rewrote 0740's old/new predicate strings to match the function text. With the resulting single-line fully scoped predicate, 0760 correctly sees two outgoing allocation predicates in confirmation (ordinary plus extraordinary), so restored its expected count to two. Both files were fetched back from the branch after the updates. This resolves the source-anchor/count mismatch found in static cross-review; it is not a live migration test, and production was not changed.


## Follow-up correction: ordered partial allocation scope — 2026-10-04

The prior 0760 count adjustment alone was insufficient: because 0740 scopes the extraordinary confirmation predicate before 0760, the function intentionally contains one scoped and one unscoped outgoing allocation predicate at that intermediate point. Updated 0760 to recognize that exact state, scope the remaining ordinary predicate, and then require two scoped predicates; unexpected counts or mixed states still stop the migration. This replaces the earlier simplified occurrence-count logic. No SQL was executed against Supabase.


## Formatting-independent validation for 0740 — 2026-10-04

Sequential review showed 0500 installs the extraordinary-allocation snapshot predicate as a multiline SQL fragment, while 0740's idempotence check required a single-line byte-for-byte match. Updated 0740 to recognize the existing snapshot key and validate its source, allocation/ledger tenant predicates, type, and date filters independently of whitespace. This avoids a false migration stop after 0500 while retaining fail-closed checks. Verified the changed source was saved to the branch; no database migration was run.


## Unit carryover close guard exact-query validation — 2026-10-04

Hardened `20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql`: its idempotent path now validates the complete workspace-, condominium-, and unit-scoped unit-carryover query, rather than checking only for the `into` clause. The installation path reuses the same canonical query string. The migration source was fetched back from the branch and verified. This is static source validation only; no SQL execution, production mutation, merge, deployment, or full QA/collaudo was performed.

## Allocation criteria unit-join tenant scoping — 2026-10-04

Hardened `20260930110001_allocation_criteria_scope.sql` by constraining each join from millesimal values to condominium units by both workspace and condominium, in addition to unit ID. This keeps eligible-unit counts, quota totals, and generated allocation rows aligned to the requested tenant. The updated migration was fetched back from the feature branch and exact content equality verified. Static source review only; no SQL execution, production mutation, merge, deployment, or full QA/collaudo.

## Transfer preview and accounting snapshot tenant scoping — 2026-10-04

- Scoped installment and expense-allocation aggregates in `20261001110000_add_member_transfer_accounting_snapshot.sql` to the transfer's `workspace_id` and `condominium_id`, in addition to the member and date predicates.
- Scoped installment and extraordinary-allocation queries in `20261001113000_add_member_transfer_preview.sql` to the resolved workspace and condominium, including both allocation and ledger-entry sides of extraordinary joins.
- Both migration files were fetched back from the branch and matched the submitted contents. This is a static source correction only: no SQL was executed against Supabase, no production data was changed, and full QA remains deferred until all known issues are resolved.


## Unified owner installment transfer-close guard — 2026-10-04

Static review of installment generation confirmed that `p_unify_by_member=true` creates owner-grouped installments with `unit_id=NULL`, while the unit-scoped close check could omit those outstanding balances. Updated `20261003079000_scope_transfer_close_financial_positions.sql` so close checks include a unified installment when its source ledger entry has an allocation for the transferred unit and the installment's representative member matches the outgoing owner by stable user ID (or normalized email when both user IDs are null). Because `paid_amount` is stored only on the grouped installment and has no per-unit breakdown, the guard blocks closure while any such grouped residual remains rather than inventing a split. Updated migration was fetched back from the branch; static source checks confirmed balanced parentheses in the replacement predicate and the expected migration delimiters. This is not SQL runtime validation: no migration was run, production remains unchanged, and full QA/collaudo remains deferred.


## Unified installment representative-member correction — 2026-10-04

A follow-up review found that a unified installment can reference a representative member row different from the outgoing member row selected for a particular unit, even when both rows identify the same owner. Corrected `20261003079000_scope_transfer_close_financial_positions.sql` to compare the representative and outgoing member by stable `user_id`, or normalized email when both user IDs are null, while retaining workspace, condominium, source-ledger, and transferred-unit allocation scope. Unit-specific installments still require the outgoing member ID. The updated migration was fetched back from GitHub; static checks confirmed both branches are present, the outer member-ID restriction no longer excludes unified representatives, parentheses are balanced, and the prior anchor remains unique. This is static source verification only; no SQL execution, production mutation, merge, deployment, or full QA/collaudo was performed.


## Unified installment source-unit identity resolution — 2026-10-04

Further review of `20261001110001_harden_current_owner_installment_generation.sql` shows unified installments select a representative member from the owner group, while the allocation loop identifies ownership by the member records associated with each allocated unit. Updated the unified-installment close guard in `20261003079000_scope_transfer_close_financial_positions.sql` to resolve the owner against member records associated with the source allocation's unit, rather than requiring the allocation owner to be the representative installment member. This handles multiple member rows for one owner across units while preserving tenant, condominium, ledger-entry, and transferred-unit constraints. Source was fetched back after the change. This is a static correction; the data relationship and function behavior still require SQL execution in a controlled test environment. Production remains read-only; no merge, deployment, or full QA/collaudo.


## Financial-history delete guard RLS hardening — 2026-10-04

Added `20261003080000_harden_member_delete_financial_history.sql` to replace the member-delete guard with a trigger-only `SECURITY DEFINER` function and an empty search path. This prevents row-level security visibility from hiding installment, expense-allocation, or fiscal-carryover references during the existence checks. The function performs read-only checks and preserves the existing exception contract and trigger. This is a source-level hardening; validate it by applying the migration in a disposable Supabase environment and testing deletes with financial rows hidden by RLS. Production remains read-only; no merge, deployment, or full QA/collaudo.


## Member deletion and financial-reference retention audit — 2026-10-04

A read-only catalog inspection of the connected production schema found that foreign keys from `condominium_installments.member_id`, `condominium_expense_allocations.member_id`, `condominium_ledger_entries.member_id`, and `condominium_fiscal_carryovers.member_id` use `ON DELETE SET NULL`. This preserves financial rows but removes their direct member attribution. In contrast, `condominium_member_transfers.outgoing_member_id` and `incoming_member_id` use `ON DELETE RESTRICT`, preserving referenced transfer history. The existing AFTER DELETE trigger in `20261003070000_repair_deleted_member_owner_references.sql` cleans the unit JSON `ownerMemberIds` only; it does not restore financial attribution after the foreign keys null member IDs.

Operational implication: financial-history members should be archived/deactivated rather than physically deleted. No automatic reassignment or blocking-delete trigger was added in this pass because doing so without auditing all application deletion paths and legitimate cleanup workflows could break existing operations or incorrectly reassign historical balances. Before release, align the application’s member-removal action with archival semantics and retain explicit historical ownership for accounting records. Production was queried read-only; no database writes, migrations, merge, deployment, or final QA/collaudo were performed.


## Preserve member identities referenced by transfer history — 2026-10-04

Hardened `20261003080000_harden_member_delete_financial_history.sql` so the SECURITY DEFINER delete guard explicitly blocks deleting a member referenced as either the outgoing or incoming party in `public.condominium_member_transfers`. The transfer table already declares both member foreign keys with `ON DELETE RESTRICT`; the trigger now provides a consistent domain-specific error before the FK constraint and makes the lifecycle protection explicit. The owner-reference cleanup trigger remains responsible for non-transfer owner JSON references after permitted deletions. This is a branch-only migration change; production remains read-only and no migration was applied.


## Member deletion protection and owner-reference cleanup review — 2026-10-04

Reviewed branch migrations `20261001100000_protect_member_delete_financial_history.sql`, `20261003070000_repair_deleted_member_owner_references.sql`, and `20261003080000_harden_member_delete_financial_history.sql`. The initial delete guard checks member-linked installments, expense allocations, and fiscal carryovers but is an invoker function and omits transfer-history references. The later `20261003080000` definition replaces it with a trigger-only SECURITY DEFINER function, empty search path, fully qualified relations, and existence checks for those accounting rows plus incoming/outgoing member-transfer references. This prevents deleting members whose IDs remain part of accounting or transfer history even if the deleting administrator's RLS view hides those rows. The `20261003070000` AFTER DELETE trigger separately removes the deleted member's legacy ID from unit `ownerMemberIds` arrays, scoped through the member's condominium and workspace. These protections are complementary: financial-history deletion is blocked, while stale redundant unit-owner JSON is cleaned only when deletion is otherwise permitted. Static source review only; trigger ordering, function ownership/RLS bypass, constraints, and runtime behavior must be verified in a disposable Supabase environment before applying pending migrations. Production remains read-only; no merge, deployment, or full QA/collaudo.


## Unified installment with deleted representative — 2026-10-04

The production schema confirms that `condominium_installments.member_id` uses `ON DELETE SET NULL`. A unified installment has `unit_id IS NULL`, so after its representative member is deleted the previous identity comparison cannot resolve the owner. Updated the fail-closed guard in `20261003079000_scope_transfer_close_financial_positions.sql` to also detect a null-member installment explicitly marked `Rata unificata per proprietario` when its linked source allocations include the transferred unit. The allocation lookup remains scoped to workspace, condominium, ledger entry, and transferred unit; the member identity join is left-sided so this branch can detect the orphaned representative. This deliberately blocks closure rather than assigning an ambiguous balance to either party. Migration source was fetched back from the branch. This remains static validation only; do not apply to production without a controlled test database and reviewed deployment sequence.


The embedded PL/pgSQL dynamic-SQL literal was also corrected so the generated predicate compares `notes` to the exact unified-installment marker. The revised migration and reconciliation note were fetched back; parenthesis balance and expected guard-fragment checks pass statically. SQL execution remains outstanding.


## Ledger-entry member attribution delete protection — 2026-10-04

Read-only inspection of the production foreign keys confirmed `condominium_ledger_entries.member_id` also uses `ON DELETE SET NULL`. The member-delete guard in `20261003080000_harden_member_delete_financial_history.sql` previously checked installments, expense allocations, fiscal carryovers, and transfer parties, but omitted direct ledger-entry attribution. Added a scoped-by-member existence check for ledger entries to prevent deleting a member while that historical attribution exists. The change preserves the trigger-only SECURITY DEFINER function and does not reassign accounting records. Branch-only; production remains read-only, and SQL execution/runtime validation is outstanding.


## Production versus branch migration boundary — 2026-10-04

A read-only Supabase migration-history check returned 177 applied migrations, with the latest recorded version `20261003050722` (`block_transfer_close_with_unresolved_unit_carryovers`). The branch contains subsequent transfer-accounting migrations through `20261003080000_harden_member_delete_financial_history.sql`, which are not recorded as applied in the production migration history. Read-only catalog inspection confirms the production member-delete trigger exists, while the branch's newer `20261003080000` function definition adds ledger-entry and transfer-party checks that are not yet reflected in the inspected production function. This is an environment boundary, not permission to apply pending DDL: production remains unchanged. The pending branch migrations require ordered validation in a disposable Supabase environment before any release decision.


## Unified installment representative-member predicate — 2026-10-04

Aligned the transfer-close guard with the actual installment generator in `20261001110001_harden_current_owner_installment_generation.sql`: unified installments store a non-null representative `member_id` and the note `Rata unificata per proprietario`. The close guard therefore must not require `i.member_id is null`. Removed that incompatible condition and retain matching by owner identity on the source allocation's unit, scoped to workspace, condominium, and ledger entry. This is statically reconciled against the generator source; SQL execution and controlled-data validation remain pending. Production remains read-only; no merge, deployment, or final QA/collaudo.


## Unified installment orphan and null-email guard — 2026-10-04

Tightened the unified-installment branch in `20261003079000_scope_transfer_close_financial_positions.sql`: it now requires the generator's exact `Rata unificata per proprietario` marker, treats a legacy null representative member as a fail-closed condition when the source allocation touches the transferred unit, and avoids equating two missing emails as proof of shared identity. This prevents unrelated/null-email profiles from matching accidentally and prevents an orphaned unified balance from being silently ignored. Branch-only change; fetch-back and static fragment checks are required, SQL execution in a disposable Supabase environment remains outstanding. Production remains read-only; no merge, deployment, or final QA/collaudo.


## Scope transfer-confirmation accounting snapshot — 2026-10-04

Added `20261003080000_scope_transfer_confirmation_snapshot.sql` to explicitly scope outgoing-owner installment and allocation totals captured during transfer confirmation by `workspace_id` and `condominium_id`. The migration checks each exact source fragment and accepts either the original unscoped form or the already-scoped form, raising an exception for missing, duplicated, or mixed anchors. This addresses consistency with the tenant-scoped preview and retrieval functions. File creation is on the feature branch only; fetch-back and static inspection are required. No production DDL, merge, deployment, or full QA/collaudo was performed.


## Unified installment close-guard alignment — 2026-10-04

Static cross-check of `20261003079000_scope_transfer_close_financial_positions.sql` against `20261001110001_harden_current_owner_installment_generation.sql` confirms that generated unified installments use `unit_id IS NULL`, carry the `Rata unificata per proprietario` note, and retain a representative `member_id`. The close guard now restricts its unified branch to that marker and resolves owner identity from members associated with the source allocation unit, while retaining tenant, condominium, ledger-entry, and transferred-unit predicates. This reduces false positives from unrelated NULL-unit installments and avoids relying solely on the representative member row. Static review only: the generated replacement function and migration have not been executed against a disposable Supabase database; do not treat this as runtime validation. Production remains read-only and no merge/deployment is authorized.


## Unique version for transfer confirmation snapshot — 2026-10-04

The transfer confirmation snapshot scoping migration was assigned version `20261003080100` because `20261003080000` was already used by `harden_member_delete_financial_history`. The migration content was preserved under the unique versioned filename `20261003080100_scope_transfer_confirmation_snapshot.sql`; the duplicate-version filename was removed. This prevents two migrations from sharing the same version key. No production migration was run.


## Member financial-history delete guard attachment — 2026-10-04

Review found that `20261003080000_harden_member_delete_financial_history.sql` defined the SECURITY DEFINER guard function but did not attach it to `condominium_members`. Added an idempotent `BEFORE DELETE` trigger so the existence checks actually prevent deletion when installment, allocation, carryover, ledger, or transfer history exists. Trigger attachment is statically verified in the branch; migration execution and runtime behavior remain pending controlled non-production validation. Production remains read-only.


## Preserve financial member identity on deletion — 2026-10-04

Read-only inspection of the production foreign keys confirmed that `condominium_installments.member_id`, `condominium_expense_allocations.member_id`, `condominium_fiscal_carryovers.member_id`, and `condominium_ledger_entries.member_id` use `ON DELETE SET NULL`. That preserves financial rows but removes their member attribution, weakening later transfer reconciliation. Added branch-only migration `20261003080000_prevent_financial_member_deletion.sql`: a `BEFORE DELETE` trigger rejects hard deletion whenever any of those four accounting tables references the member, directing operators to archive the profile instead. Transfer history already has restrictive foreign keys to outgoing/incoming members. The new migration was committed to the feature branch and is not applied to production. SQL runtime validation in a controlled database and full QA/collaudo remain pending.


## Duplicate migration version cleanup — 2026-10-04

Removed `20261003080000_prevent_financial_member_deletion.sql`, which duplicated version `20261003080000` already used by `20261003080000_harden_member_delete_financial_history.sql`. The retained hardened migration includes the same financial-reference deletion protection plus ledger-entry and transfer-party checks, uses a trigger-only SECURITY DEFINER function with an empty search path, and attaches the BEFORE DELETE trigger. This prevents ambiguous ordering or migration-history collisions. The redundant file was deleted from the feature branch; no database migration, production write, merge, deployment, or full QA/collaudo was performed.


## Production function definitions versus branch — read-only check 2026-10-04

The connected Supabase project `BETHAG` (Postgres 17.6.1) was queried read-only. Its migration history ends at `20261003050722`; the feature branch contains later files `20261003070000` through `20261003080100`, which are pending and must not be treated as deployed. The live `public.prevent_member_delete_with_financial_history()` is still an invoker function with `search_path=public` and checks installments, allocations, and carryovers only; it does not yet include ledger-entry or transfer-party references. The live AFTER DELETE owner-reference cleanup trigger exists and its function is SECURITY DEFINER with an empty search path and workspace/condominium scoping, but this live state is not proof that the new branch repair migration has been applied. The live transfer preview still contains unscoped installment reads; the live snapshot reader still contains unscoped installment/allocation totals and unit-expense ledger reads. These are confirmed source-level differences between production definitions and the branch's pending scope/hardening migrations.

The repository comparison reports the feature branch 179 commits ahead of `main` and not behind, and the latest observed BETHAG build for the branch head completed successfully. This build result does not validate SQL migration execution, data preservation, RLS behavior, or transfer accounting. No production writes, migration application, merge, or full QA/collaudo were performed. Next safe step is to reproduce the production schema in an isolated Supabase branch/test database, apply the pending migrations in order, inspect resulting function definitions and run targeted accounting/tenant-isolation tests before considering deployment.


## Confirmation snapshot anchor reconciliation — 2026-10-04

Corrected `20261003080100_scope_transfer_confirmation_snapshot.sql` to match the live confirmation function's actual installment predicates. The prior replacement incorrectly narrowed the three due-before aggregates to explicit member rows and could omit unit-unassigned installments. The migration now recognizes the unscoped predicate that includes either the outgoing member or a null-member installment assigned to the transfer unit, and adds workspace and condominium predicates without removing either branch of that OR condition. The update was committed to the feature branch. Static source verification only; the disposable branch has its base schema but lacks accounting tables/functions and has no migration history, so this migration has not been executed. Production remains unchanged; no merge, deployment, or full QA/collaudo.

## Disposable branch baseline inspection — 2026-10-04

Created the isolated Supabase branch `bethag-migration-reconciliation-qa` (project ref `mxhciszzpqzvsaqcnwhg`) with no production data. The branch reports `FUNCTIONS_DEPLOYED`, but read-only catalog inspection shows only the baseline public tables `activities`, `assemblies`, `communications`, `condominium_members`, `condominium_requests`, `condominiums`, `deadlines`, `documents`, `profiles`, `suppliers`, `workspace_members`, and `workspaces`; accounting tables such as `condominium_installments`, `condominium_expense_allocations`, `condominium_ledger_entries`, `condominium_fiscal_carryovers`, and `condominium_member_transfers` are absent. The Supabase migration listing returned no rows despite the baseline objects and helper functions being present. Therefore the branch is not currently a faithful database reproduction of production and cannot validate transfer-accounting migrations as-is. No DDL was applied to production or to the isolated branch in this inspection. Reconstruct a verified baseline/schema migration set before replaying forward migrations; do not mark migration history manually or apply branch-only patches until dependencies are present.


### Follow-up: make confirmation snapshot anchor compatible with preceding scope migration

A second static pass found that the allocations-before entry in migration `20261003080100` used the same scoped expression for both the expected old and replacement anchors. That would make the anchor test fail when the prior allocation-scope migration had already scoped the query. The old anchor is now the actual unscoped expression; the replacement remains explicitly workspace/condominium scoped. This lets the migration accept either the exact pre-patch state or the exact already-scoped state, while still rejecting mixed/duplicate matches. Change committed in `75a48c0b08d6c3ddf55bf10b52a4d272362371c1`; not executed because the isolated branch is migration-failed and missing the accounting schema.


### Final static correction of snapshot migration source — 2026-10-04

A read-back caught that the previous text replacement had damaged the old-anchor array in `20261003080100_scope_transfer_confirmation_snapshot.sql`. The migration file has now been rebuilt in full with four complete old/new anchor pairs, valid dollar-quoted strings, and exact count checks. GitHub read-back confirms the old/new arrays close correctly, contain four anchors each, and the three installment aggregates retain the unit-unassigned OR branch while adding workspace/condominium scope. This is source-level verification only; execution remains blocked until a faithful accounting schema is available on the isolated branch. The branch is currently reported as `MIGRATIONS_FAILED`; production has not been changed.


## Historical schema-source cross-check — 2026-10-04

A further read-only comparison of the repository's recovery branches located two useful but non-canonical artifacts on `bethag-migration-repair`: `docs/recovery/baseline_source_and_branch_graph_20261001.md` and `docs/recovery/qa_baseline_blockers_and_dependency_gate.md`. The former records that the tracked migration chain is not proven replayable from an empty database and that the original initial migration and original grant-hardening migration were not recovered. The latter explicitly classifies `20260928050000_reconstruct_portal_access_registry.sql` as a reconstructed fragment, dependent on pre-existing workspace, condominium, member, profile, and authorization objects; it is not a complete schema baseline.

The backup branch `backup/pre-rollback-20261001` also contains catalog evidence in `docs/PRODUCTION-INTEGRITY-CATALOG.md` (198 constraints, 153 indexes, and 62 RLS policies for the 27 tables absent from `bethag-develop`) and `docs/SCHEMA-GAP-PRODUCTION-DEVELOP.md` (47 public production tables versus 20 in develop, with column inventories for missing tables). These artifacts improve the inventory but are catalog snapshots, not executable DDL: they do not alone establish column defaults, complete FK ordering, object ownership, grants, policies, and dependency-safe creation for the entire schema.

The recovery branch's portal registry SQL was inspected directly. It supplies a possible reconstruction for `public.portal_access`, but it must remain labeled reconstructed and must not be treated as proof that the initial schema or grant history has been restored. GitHub code search did not locate tracked source definitions for the principal accounting tables or the original initial migration by their names. The dependency gate therefore remains open: no baseline has been certified, no migrations have been replayed, and no production database has been modified. Continue by reconciling each catalog object against available original migration definitions and only then authoring a separately identified, reviewable baseline for an isolated database.


## Recovered foundation DDL candidate — 2026-10-04

A read-only inspection of `backup/pre-rollback-20261001` found `docs/PROPOSED-FOUNDATION-DDL-NOT-APPLIED.md` (blob `5f105e5b68be32916103cc27ba124c1ced0a4abc`). The artifact contains proposed `CREATE TABLE` definitions for 27 public tables, including the missing accounting and transfer tables, and 153 index statements; its header reports 381 columns and 198 catalog constraints. This is a material recovery source and supersedes the earlier statement that only a column inventory was available.

It is still explicitly a **proposal, not an applied migration**. Its own scope excludes RLS policies, grants, triggers, function bodies, object ownership, comments, and sequence/identity details; six duplicate constraint definitions were deduplicated by definition, so canonical constraint naming requires review. It also represents a Production end-state snapshot and overlaps later incremental migrations. Therefore it must not be appended verbatim to the current migration chain or replayed on an existing database.

Next reconciliation step: compare each of the 27 proposed table definitions with the corresponding incremental migration introductions/alterations, identify duplicated or later-evolved columns and constraints, then compose a separately versioned bootstrap candidate with an explicit object manifest. Preserve this DDL proposal as source evidence and test any composed baseline only on a disposable isolated database. Production remains unchanged; migration replay and final QA remain pending.

## Foundation DDL cross-check — targeted migration sample (2026-10-04)

The candidate DDL contains 27 distinct table definitions (the initial count of 28 included the SQL token `IF`, excluded after correcting the parser). A targeted content check was performed against nine accounting/fiscal migration files and eight transfer/payment migration files in this branch. This is a scoped sample, not a full 147-file migration-to-DDL reconciliation.

| Candidate table | Explicit CREATE found in checked files | ALTER found in checked files | Interpretation |
|---|---|---|---|
| `condominium_accounting_settings` | `20260930235000_accounting_settings.sql` | same | Incremental create exists; compare its full definition to candidate DDL before bootstrap consolidation |
| `condominium_allocation_rules` | `20260930241000_allocation_rules_and_consumption.sql` | same | Incremental create/alter exists |
| `condominium_consumption_readings` | `20260930241000_allocation_rules_and_consumption.sql` | same | Incremental create/alter exists |
| `condominium_fiscal_carryovers` | `20260930230000_fiscal_year_carryovers.sql` | same | Incremental create/alter exists |
| `condominium_ledger_entries` | — | `20260930233000_link_funds_to_ledger.sql`, `20260930235500_classify_expense_type.sql` | Alterations depend on a prior table definition not found in this checked subset |
| `condominium_payment_reversal_audit` | `20261001083000_payment_reversal_audit_and_reconciliation.sql` | same | Incremental create/alter exists |
| `condominium_member_transfers` | `20261001104500_add_condominium_member_transfer.sql` | same | Incremental create/alter exists |
| `condominium_expense_allocations` | — | — | No create/alter in this sample; not evidence that no definition exists elsewhere |
| `condominium_installments` | — | — | No create/alter in this sample; dependent accounting migrations indicate a prior baseline is required |
| `condominium_fiscal_years` | — | — | No create/alter in this sample |
| `condominium_funds` | — | — | No create/alter in this sample |
| `condominium_millesimal_tables` | — | — | No create/alter in this sample |
| `condominium_millesimal_values` | — | — | No create/alter in this sample |
| `condominium_fiscal_carryover_compensations` | — | — | No create/alter in this sample |
| `condominium_allocation_intakes` | — | — | No create/alter in this sample |
| `communication_recipients` | — | — | No create/alter in this sample |
| `condominium_budgets`, `condominium_audit_log`, `condominium_legal_cases`, `condominium_register_items`, `condominium_suppliers`, `condominium_tax_obligations`, `condominium_work_documents`, `condominium_work_events`, `condominium_work_progress`, `condominium_works` | — | — | No create/alter found in the checked sample; broader scan remains required |

### Reconciliation decision

The checked migrations confirm that at least some candidate tables are created incrementally, while other accounting migrations alter tables whose original definitions are absent from this targeted sample. Therefore the candidate DDL cannot safely be inserted wholesale as a new baseline: it would duplicate some table creations and still requires exact dependency/order reconciliation for the rest. Next gate is a full-file pass over all tracked migrations, followed by column/constraint/index-level comparison and isolated replay validation. No SQL was applied to Production or to a live user dataset; final QA remains deferred until repair work is complete.

## Incremental migration dependency findings — second pass (2026-10-04)

A further content scan covered the 24 migrations from `20260928153422` through `20260930183000` (the portal/insurance/unit group and the early accounting hardening group). The scan is based on SQL text references and explicit `CREATE TABLE`/`ALTER TABLE` statements; references in function bodies are not treated as table introductions.

Additional explicit table introductions observed:
- `portal_registration_requests` in `20260928153242_add_condomino_registration_workflow.sql` (outside the 24-file slice due to the slice boundary; recorded here as an observed dependency).
- `condominium_fiscal_carryover_compensations` in `20260930160000_fiscal_carryover_compensation.sql`.
- `condominium_allocation_rules` and `condominium_consumption_readings` were previously observed in `20260930110000_accounting_consumption_and_installment_percentages.sql`.
- `condominium_fiscal_carryovers` in `20260930230000_fiscal_year_carryovers.sql`, `condominium_accounting_settings` in `20260930235000_accounting_settings.sql`, and `condominium_payment_reversal_audit` in `20261001083000_payment_reversal_audit_and_reconciliation.sql` were observed in the prior targeted pass.

The scanned hardening migrations repeatedly reference `condominium_expense_allocations`, `condominium_installments`, `condominium_fiscal_years`, `condominium_ledger_entries`, `condominium_millesimal_tables`, `condominium_millesimal_values`, and `condominium_payment_movements`, but the scanned files do not introduce those tables. This reinforces the baseline dependency gap: these files are patches against an already-present schema, not an empty-database bootstrap. Table references alone do not prove the initial definition or column-level compatibility.

The text scan also identified `condominium_budgets` as a dependency in `20260929232000_harden_fiscal_year_closure.sql`, without a table DDL statement in the scanned slice. Absence of a create statement in a slice is not proof of absence from the full migration history. Full inventory and exact DDL reconciliation remain open; no baseline has been authored or executed from these partial findings.

## Accounting and unit-integrity dependency pass (2026-10-04)

The migration text review was extended through the unit/accounting integrity group ending at `20260930215000`. No explicit `CREATE TABLE` for the remaining core accounting relations was found in this slice; multiple migrations instead reference existing tables in guards, RPCs, fiscal transitions, and hard-delete routines.

Observed dependencies include:
- `condominium_expense_allocations` and `condominium_installments`: integrity guards, unit-delete protection, fiscal-year transition, payment and allocation controls.
- `condominium_fiscal_years`, `condominium_fiscal_carryovers`, `condominium_ledger_entries`, and `condominium_payment_movements`: fiscal transitions, access hardening, payment reconciliation and delete routines.
- `condominium_funds`, `condominium_budgets`, `condominium_audit_log`, `condominium_legal_cases`, `condominium_register_items`, `condominium_suppliers`, `condominium_tax_obligations`, `condominium_works`, `condominium_work_events`, `condominium_work_documents`, and `condominium_work_progress`: referenced by the complete condominium hard-delete routine, but not created in the reviewed slice.
- `condominium_allocation_rules` and `condominium_millesimal_tables`: used by allocation-scope validation; no create statement in this slice.

These references are important dependency evidence but are not sufficient to infer columns, foreign-key actions, policies, or original creation versions. The working finding remains that the repository's tracked chain needs a verified foundation source for replay from empty state. Continue full inventory rather than infer or synthesize a production baseline from function references.

## Mid-chain accounting/RLS migration scan — 2026-10-04

Reviewed migration files in the filename range `20260930230000`–`20260930400000`, in addition to the earlier targeted review. This scan finds the following explicit table introductions among the 27 candidate DDL tables:

| Table | Introducing migration |
|---|---|
| `condominium_fiscal_carryovers` | `20260930230000_fiscal_year_carryovers.sql` |
| `condominium_accounting_settings` | `20260930235000_accounting_settings.sql` |
| `condominium_allocation_rules` | `20260930241000_allocation_rules_and_consumption.sql` |
| `condominium_consumption_readings` | `20260930241000_allocation_rules_and_consumption.sql` |
| `condominium_allocation_intakes` | `20260930250000_manual_ai_allocation_intake.sql` |
| `condominium_fiscal_carryover_compensations` | `20260930160000_fiscal_carryover_compensation.sql` |
| `condominium_payment_reversal_audit` | `20261001083000_payment_reversal_audit_and_reconciliation.sql` |
| `condominium_member_transfers` | `20261001104500_add_condominium_member_transfer.sql` |

Other candidate relations appear throughout the reviewed migrations as dependencies for installment schedules, ledger/fund links, allocation logic, fiscal-year controls, RLS, foreign-key indexes, and portal/document visibility. No explicit create statements for the core relations `condominium_expense_allocations`, `condominium_installments`, `condominium_fiscal_years`, `condominium_funds`, `condominium_ledger_entries`, `condominium_millesimal_tables`, `condominium_millesimal_values`, or `condominium_payment_movements` were found in the portions checked; their original DDL source remains unresolved.

The review also notes dependencies on candidate DDL tables in later RLS and FK-index migrations, but those references do not provide enough information to reconstruct exact schema. This is a text-based partial scan of the chain, not yet a complete 147-file, column-by-column reconciliation. Do not infer that unlisted tables are absent from every migration or create a baseline from this table alone. The next step remains full-chain parsing and exact structural comparison (columns, types, defaults, constraints, indexes, policies, triggers, and functions), then replay testing on a disposable isolated database. Production remains untouched.

## Portal visibility and condominium-deletion dependency pass — 2026-10-04

Reviewed the next migration slice, `20260930410000`–`20261001063435`. The files in this slice principally harden portal publication/registration visibility, resident/member and workspace scope, profile permissions, and condominium deletion behavior. The reviewed deletion routines reference the recovered accounting and work-module relations (including fiscal carryovers and compensations), but this slice did not introduce new table definitions among the 27 candidate foundation tables. The performance-index migration references `communication_recipients`, without creating or altering its table in the checked file.

This adds dependency evidence, not a substitute for schema reconciliation: references inside policies, functions, and deletion routines cannot establish column types, defaults, keys, or a table's original migration. The origin of core accounting relations still requires tracing beyond this slice and exact comparison against the candidate DDL. Full-chain review remains incomplete; no migration was executed and Production was not modified.

## Member-transfer and fiscal-continuity dependency pass — 2026-10-04

Reviewed the migration slices `20261001063800`–`20261001120000` and `20261002045106`–`20261002120000`. The first slice confirms an explicit introduction of `condominium_payment_reversal_audit` in `20261001083000_payment_reversal_audit_and_reconciliation.sql`, and `condominium_member_transfers` in `20261001104500_add_condominium_member_transfer.sql`; later transfer migrations alter the transfer lifecycle and add accounting snapshots/previews. The subsequent slice focuses on transferred-member portal lifecycle, workspace/unit ownership validation, privilege hardening, and preserving closed fiscal-year accounting. It references the existing accounting relations, including `condominium_expense_allocations`, `condominium_installments`, `condominium_fiscal_years`, `condominium_ledger_entries`, and `condominium_payment_movements`, without introducing their base table definitions in the files checked.

These findings reinforce that the transfer/accounting features are incremental consumers of a prior accounting schema; they do not supply a safe replacement baseline. Review remains a bounded text scan, not a complete 147-file reconciliation or SQL replay. Exact schema lineage and compatibility checks are still required before any isolated replay; Production remains untouched.

## Transfer-scope and financial-history guard pass — 2026-10-04

Reviewed the final migration segment through `20261003080100_scope_transfer_confirmation_snapshot.sql`. This segment modifies existing transfer and financial routines rather than introducing foundation table definitions. In particular, the latest migrations add tenant/condominium/unit scoping to transfer-close financial checks and the immutable transfer-confirmation snapshot, and add a trigger guard preventing deletion of members with linked installment, allocation, carryover, ledger, or transfer history. These routines depend on the previously introduced `condominium_member_transfers` table and the established accounting relations; they do not resolve the original DDL lineage for the core accounting tables.

The filename-range scans now cover the remainder of the tracked migration list through the last file `20261003080100`. This is useful dependency evidence but does not constitute semantic validation of every SQL statement, full comparison of each candidate table's columns/constraints/indexes/policies/triggers, or successful replay. The historical initial migration's missing original SQL and incomplete foundation lineage remain blocking uncertainties. No SQL was applied to Production.

## Exact CREATE-definition comparison — first recovered table set — 2026-10-04

Compared the candidate foundation DDL against the explicit `CREATE TABLE` statements in the tracked introducing migrations for `condominium_allocation_rules`, `condominium_consumption_readings`, `condominium_fiscal_carryover_compensations`, `condominium_fiscal_carryovers`, `condominium_accounting_settings`, `condominium_allocation_intakes`, and `condominium_payment_reversal_audit`.

- The extracted column-name lists match for all seven tables in this comparison; no source-only or candidate-only column names were detected.
- The candidate definitions omit inline foreign-key and check constraints present in the introducing migration statements. The checked source statements include 3 FK references and 2 checks for allocation rules; 4 FKs and 3 checks for consumption readings; 4 FKs and 1 check for carryover compensations; 6 FKs and 8 table constraints for fiscal carryovers; 2 FKs and 3 constraints for accounting settings; and 7 FKs and 3 checks for allocation intakes.
- The payment-reversal audit source definition declares `original_payment_id` unique, while the candidate table block does not.
- The accounting-settings candidate has defaults for accounting start/end dates, whereas the introducing migration declares both dates `NOT NULL` without defaults.

This is a comparison of original CREATE statements, not yet the effective schema after all subsequent ALTER TABLE, CREATE INDEX, and constraint migrations. Therefore omitted constraints must be checked against later migrations before classifying them as absent from the final schema. The candidate DDL should not be treated as equivalent or replay-ready; this pass establishes concrete reconciliation deltas and the next exact checks. No database changes were made.

## Member-transfer table definition cross-check — 2026-10-04

Compared `public.condominium_member_transfers` in `20261001104500_add_condominium_member_transfer.sql` with the recovered candidate DDL. The introducing migration defines 15 columns and includes workspace, condominium, unit, outgoing/incoming member, and creator foreign keys, plus transfer-type and status checks. The candidate block includes the same core columns and additionally `closed_at` and `closed_by`, but omits those foreign keys and checks. The candidate therefore appears to combine a later lifecycle shape with a weaker constraint set; the later lifecycle migration and all subsequent ALTER statements must be traced before deciding the canonical final definition.

The transfer-related functions in adjacent migrations query installments, expense allocations, and ledger entries scoped to workspace/condominium/unit. This reinforces that those accounting relations are hard dependencies of the transfer workflow, but does not supply their canonical table definitions. No DDL was applied and no QA was run.

## Confirmed transfer-status constraint mismatch and corrective migration — 2026-10-04

The original `20261001104500_add_condominium_member_transfer.sql` creates `condominium_member_transfers_status_ck`, allowing `Bozza`, `Confermato`, and `Annullato`. The lifecycle migration `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` attempts to drop `condominium_member_transfers_status_check` (a different name) and adds that second constraint permitting `Chiuso`. Since the original `_status_ck` is not removed, both checks can remain active, so `Chiuso` fails the original check. This is a concrete migration-chain defect, not merely a candidate-DDL difference.

Added `20261004090000_fix_member_transfer_status_constraint.sql` on the reconciliation branch. It drops both possible constraint names and recreates one canonical `_status_ck` constraint allowing all four lifecycle values. This migration is idempotent with respect to those constraint names. It has been committed to the working branch only; it has not been executed against any database. Existing rows and downstream behavior still require validation during the final authorized collaudo.

## Additional transfer lifecycle invariant review — 2026-10-04

A second transfer-chain discrepancy requires resolution: migration `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` explicitly sets the outgoing member's `data.current_owner=false` when the transfer is confirmed. The later replacement of `private.confirm_condominium_member_transfer` in `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` sets `position_status='In chiusura'` but omits the `current_owner=false` assignment. Because the later `CREATE OR REPLACE FUNCTION` replaces the earlier implementation, the earlier assignment cannot be relied upon. Other filters also inspect both current-owner and position-status flags, so this is a data-invariant inconsistency worth correcting in the transfer function and checking against subsequent function rewrites. It is recorded as an unresolved code-level issue rather than patched by a broad text replacement, to avoid corrupting the later scope-hardening function body.

## Corrective migration for outgoing current-owner flag — 2026-10-04

The later `20261002045106_prevent_portal_reactivation_for_transferred_members.sql` checks both `position_status` and `current_owner` when preventing portal reactivation. The active transfer-confirmation implementation originating in `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` sets the outgoing member to `position_status='In chiusura'` but omits `current_owner=false`, despite an earlier implementation setting both. Portal deactivation is covered by the position-status condition, but the owner flag remains inconsistent for other consumers of the JSON metadata.

Added `20261004091000_preserve_outgoing_current_owner_flag.sql` to insert `'current_owner',false` into the outgoing-member JSON update in the latest private confirmation function. It validates a unique expected old or corrected fragment and aborts rather than applying an ambiguous replacement. The migration is committed to the working branch only; exact application against the final live function definition and subsequent semantic validation remain pending in the authorized final collaudo.

## Transfer financial guards and migration-order cross-check — 2026-10-04

Reviewed the latest tracked transfer-related definitions from `20261002120000_preserve_closed_fiscal_year_accounting.sql` through `20261003080100_scope_transfer_confirmation_snapshot.sql`. The preview/snapshot chain progressively includes future installments and unit-unassigned installments, and includes unit-unassigned fiscal carryovers; the closure guards subsequently block unresolved member and unit-level carryovers and scope financial checks to the transfer's workspace, condominium, and unit. The final snapshot scope migration adds tenant/condominium predicates to installment and allocation aggregates while preserving unit-unassigned installment inclusion. No additional deterministic textual replacement defect was confirmed in this slice. These function bodies depend on foundational accounting relations whose canonical baseline is still being reconstructed, so this source review is not a substitute for execution against a disposable database.

The two targeted corrections recorded above are deliberately separate forward migrations and do not modify prior migration history. The chain remains unexecuted against production and no final QA/collaudo has been started.

## Fiscal carryover attribution — later correction verified — 2026-10-04

The initial carryover implementation in `20260930230000_fiscal_year_carryovers.sql` and the intermediate payment-basis correction in `20260930231000_correct_carryover_payment_basis.sql` group installments only by `unit_id` and use `max(member_id)`. Read in isolation, this can misattribute the net balance when a unit has installments associated with multiple members.

This issue is corrected by the later `20261001082000_fix_fiscal_carryover_regeneration.sql`: its replacement implementation groups by both `i.unit_id,i.member_id`, preserving separate member balances (and the unit-level `NULL` member group). It also locks source and target fiscal years and checks chronological order, archived-condominium state, target-year status, and whether existing carryovers have compensations before regeneration. Therefore, the earlier attribution defect is superseded in the tracked chain; do not add a redundant patch for it. Actual schema/function presence and behavior still require final authorized validation.


## Installment percentage validation correction — 2026-10-04

Review of the final tracked schedule-generator definitions found that the validation added in `20260930290000_fix_installment_rounding_and_unification.sql` and repeated in `20261001083500_lock_concurrent_installment_generation.sql` tests `array_length(p_percentages,1)<>n` without normalizing a NULL length. An explicitly empty, non-NULL array has a NULL length, so that part of the compound PL/pgSQL `IF` expression can evaluate to NULL rather than reject the input. The empty array can therefore pass validation and later produce NULL installment values.

Added `20261004092000_reject_empty_installment_percentages.sql` on the working branch. It performs a guarded replacement in both the public and private eight-argument schedule-generator definitions, changing the length test to `coalesce(array_length(p_percentages,1),0)<>n`; it aborts if either expected function or unique source fragment is missing/ambiguous and is idempotent if already corrected. This correction has not been applied to any database. Validate function signatures, generated definitions, and behavior on a disposable database during final collaudo; Production remains untouched.


## Schedule-generator target signature verification — 2026-10-04

Verified the exact `CREATE OR REPLACE FUNCTION` declarations in the tracked source files: the public eight-argument overload is defined in `20260930290000_fix_installment_rounding_and_unification.sql`, and the private eight-argument overload is defined in `20261001083500_lock_concurrent_installment_generation.sql`. Their argument types match the guarded `to_regprocedure` targets in `20261004092000_reject_empty_installment_percentages.sql`. This confirms the patch targets exist in the migration source chain; it does not prove they are present in any particular database or that the migration has been executed. No database was modified.


## Tracked migration directory boundary and bootstrap dependency — 2026-10-04

Re-read the complete `supabase/migrations` directory listing on the reconciliation branch. The first tracked SQL file is `20260928060000_expose_first_admin_bootstrap.sql`; the previously referenced initial migration `20260928021707_initial_bethag_backend.sql` is not present in this branch's migration directory. The early tracked files already operate on existing application relations (for example, workspace and condominium bootstrap/save/delete routines) rather than providing a complete schema bootstrap. Targeted repository searches also returned no explicit `CREATE TABLE` matches for `condominium_installments`, `condominium_expense_allocations`, `condominium_fiscal_years`, or `condominium_ledger_entries` in the indexed source. The absence of search hits is not, by itself, proof those relations never appear in any SQL form; however, together with the directory boundary and downstream references, it leaves their authoritative original definitions unverified. Do not replay this migration directory against an empty or production database as a complete installation chain. The missing baseline source or a verified schema export remains necessary to finish exact structural reconciliation.


## Recupero della proposta DDL storica e riconciliazione del gap — 2026-10-04

Recuperata dal branch storico `backup/pre-rollback-20261001` la proposta `docs/PROPOSED-FOUNDATION-DDL-NOT-APPLIED.md` (blob `5f105e5b68be32916103cc27ba124c1ced0a4abc`). La proposta contiene 27 blocchi `CREATE TABLE` e include tutte le otto relazioni contabili che risultavano senza DDL introduttivo individuato nelle migrazioni esaminate: `condominium_expense_allocations`, `condominium_installments`, `condominium_fiscal_years`, `condominium_funds`, `condominium_ledger_entries`, `condominium_millesimal_tables`, `condominium_millesimal_values` e `condominium_payment_movements`. Questo restringe il problema: le definizioni sono recuperabili come proposta estratta dai cataloghi di Production, ma non è ancora stata trovata la loro migrazione originaria e la proposta non è un bootstrap canonico né una base automaticamente replayabile.

Il file storico dichiara come origine metadati read-only di Production del 2026-10-01 e riporta 27 tabelle, 381 colonne, 198 vincoli (con 6 coppie duplicate deduplicate) e 153 indici. Restano fuori RLS, grants, trigger, funzioni, owner, commenti, sequence/identity e dipendenze non catturate. La proposta è stata soltanto letta dal branch storico: non è stata copiata o applicata come migration. Prossimo passaggio: confrontare le otto definizioni recuperate, colonna per colonna e vincolo per vincolo, con ogni successivo `ALTER TABLE`, indice e funzione della catena, quindi integrare le correzioni necessarie nel branch di lavoro senza toccare Production.


### Dettaglio strutturale verificato della proposta storica

La lettura integrale della proposta conferma 27 `CREATE TABLE`, 193 istruzioni `ALTER TABLE ... ADD CONSTRAINT`, 102 riferimenti `FOREIGN KEY`, 58 condizioni `CHECK` e 153 istruzioni `CREATE INDEX` (conteggi testuali sul file storico). I conteggi si riferiscono alla proposta non applicata e non attestano che ogni vincolo sia ancora coerente con l'intera catena incrementale. Le otto tabelle contabili individuate sono presenti con colonne, tipi, nullabilità e default espliciti; le migrazioni successive le utilizzano come schema già esistente e aggiungono guardie, indici, trigger e logica procedurale. Il confronto deve quindi essere semantico, non una semplice aggiunta dei `CREATE TABLE`: in particolare vanno rilevate le divergenze tra vincoli estratti da Production e i vincoli aggiunti/rimossi dalle migrazioni, evitando duplicazioni o restrizioni incompatibili con gli stati di ciclo di vita introdotti dopo.


### Coerenza tra overpayment e riconciliazione dei pagamenti

Il confronto della catena `20260930230000_fiscal_year_carryovers.sql` e `20261001083000_payment_reversal_audit_and_reconciliation.sql` ha evidenziato una contraddizione: la registrazione conserva intenzionalmente l'intero movimento per trasformare l'eccedenza in credito riportabile, ma il trigger `public.sync_condominium_installment_from_payments()` interrompe la transazione se la somma dei movimenti supera l'importo della rata. Questo rende irraggiungibile il comportamento di overpayment documentato nella funzione di registrazione. La migrazione `20261004100000_allow_installment_overpayment_movements.sql` è stata aggiunta al branch: aggiorna in modo controllato la funzione trigger, mantenendo il movimento integrale e limitando `paid_amount` della rata al suo importo, così che l'eccedenza possa essere contabilizzata come credito. La migrazione verifica la definizione attesa e fallisce in caso di sorgente inattesa o guardia duplicata. È una correzione di repository non ancora applicata al database; resta da verificare in collaudo integrato al termine delle altre riconciliazioni.

### Public fiscal carryover RPC alignment
- `20260930231000_correct_carryover_payment_basis.sql` replaced `public.generate_fiscal_year_carryovers(...)` with a legacy implementation grouped only by `unit_id` and using `max(member_id)`, which could collapse co-owner balances.
- `20261001082000_fix_fiscal_carryover_regeneration.sql` introduced the hardened private implementation grouped by `unit_id, member_id`, with authentication, authorization, locking, fiscal-year validation, compensation safeguards, and opening-balance update, but did not itself replace the public RPC.
- `20261004101000_route_public_carryovers_to_hardened_function.sql` now routes the public RPC to that private implementation, explicitly restricts public/anon execution, and grants the public wrapper to `authenticated` while keeping the private implementation ungranted to client roles (the `SECURITY DEFINER` wrapper invokes it internally). This aligns the public entry point with the corrected per-member accounting logic. Migration is committed to the working branch only; it has not been applied to Supabase. Final database replay and QA remain deferred until all issues are resolved.

## Corrective migration inventory refresh — 2026-10-04

The tracked `supabase/migrations` directory now contains 152 SQL files (the earlier snapshot recorded 147). The five subsequent branch-only corrective migrations are `20261004090000_fix_member_transfer_status_constraint.sql`, `20261004091000_preserve_outgoing_current_owner_flag.sql`, `20261004092000_reject_empty_installment_percentages.sql`, `20261004100000_allow_installment_overpayment_movements.sql`, and `20261004101000_route_public_carryovers_to_hardened_function.sql`. They are forward-only repository changes intended to repair identified migration-chain defects without rewriting historical files. Their presence in GitHub does not mean they have been applied to Supabase; no production database operation or final QA was performed in this pass.


## Foundation DDL source comparison — 2026-10-04

A targeted comparison of the historical, Production-derived candidate DDL against tracked introducing migrations confirms three source/schema differences that must remain explicit before any bootstrap migration is assembled:

- `condominium_accounting_settings`: the tracked create migration requires `accounting_start_date` and `accounting_end_date` with no defaults; the historical candidate includes calendar-year defaults. Do not silently choose either behavior for a new baseline: the Production catalog snapshot describes deployed behavior, while the migration describes intended fresh-install behavior. Resolve this divergence deliberately and consistently in the eventual bootstrap and forward path.
- `condominium_payment_reversal_audit`: the tracked create migration declares `original_payment_id uuid not null unique`; the historical candidate omits the uniqueness. The canonical foundation must preserve this one-reversal-per-original-payment invariant, and the candidate is not safe to apply as-is.
- `condominium_member_transfers`: the introducing migration has named type/status checks and references to workspace, condominium, unit, outgoing/incoming members and creator; the historical candidate's table block includes `closed_at`/`closed_by` but omits those table-level constraints/FKs. The lifecycle and snapshot migrations must be included when deriving the final canonical shape rather than treating the candidate table block as complete.

This is a source comparison only, not a live schema validation. No DDL was applied to Supabase; no QA/collaudo was started. Further reconciliation must inspect all subsequent ALTERs, policies, grants, triggers, functions, and identity dependencies before producing a foundation migration.


## Transfer lifecycle schema trace — 2026-10-04

Follow-up inspection of the tracked transfer migrations confirms the intended lifecycle evolution: `20261001104500_add_condominium_member_transfer.sql` introduces the transfer table with named type and status checks and foreign keys for workspace, condominium, unit, outgoing/incoming members and creator; `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` adds nullable `closed_at` and `closed_by` (the latter references `auth.users(id)`) and introduces the lifecycle status check that also allows `Chiuso`. The historical candidate's table block contains the two closure columns, but its catalog-derived constraints include two status checks simultaneously, one of which rejects `Chiuso`; the forward migration `20261004090000_fix_member_transfer_status_constraint.sql` removes both possible status-check names and recreates one canonical check permitting `Bozza`, `Confermato`, `Chiuso`, `Annullato`. This resolves the status-check conflict for databases that execute the migration sequence, but does not by itself reconstruct omitted foreign keys in a clean-install baseline. The separate `closed_by` index migration is idempotent and should be retained once in a consolidated baseline.

The candidate DDL's missing unique constraint on `condominium_payment_reversal_audit.original_payment_id` is still a catalog-vs-migration divergence; do not add a corrective unique index blindly without checking deployed duplicates and deciding whether the historical catalog or migration invariant is authoritative. No live DB query or collaudo was performed in this step.


## Earliest tracked migrations and bootstrap prerequisites — 2026-10-04

Inspection of the first four tracked migrations confirms that the current directory does not establish a clean-install foundation. The earliest file, `20260928060000_expose_first_admin_bootstrap.sql`, creates only the public wrapper and calls `private.claim_first_workspace_admin(uuid)`, which must already exist. The next migration defines `public.save_condominium(...)` and `public.delete_condominium(...)` against the pre-existing `public.condominiums` relation and authorization helpers. The collaborator-permissions migration creates/updates policies on pre-existing `condominiums`, `condominium_members`, `documents`, `deadlines`, `assemblies`, `suppliers`, `activities`, `communications`, `condominium_requests`, and `portal_access`; the following portal-access migration likewise relies on `portal_access`, `condominium_members`, and `condominiums`.

Accordingly, the tracked sequence's first migration is an application-layer bootstrap wrapper, not a database bootstrap. A clean-install baseline must first define these core relations, workspace membership and authorization functions, then apply module migrations in dependency order. Replaying the current migration directory alone is not demonstrated to create a working database. The missing historical initial migration cannot be reconstructed safely from table DDL alone: its functions, RLS policies, grants, triggers, storage configuration, and dependencies still need authoritative source comparison. Production remains untouched; this is repository inspection only, not a clean-install run or final QA.


## Focused module-creation trace — 2026-10-04

A further source-level pass checked the tracked migrations that introduce or extend the insurance, condominium-intake, unit, and accounting modules. The following tracked files contain explicit table creation statements: `20260929110000_add_condominium_insurance_policies.sql` (`condominium_insurance_policies`), `20260930125903_condominium_creation_intakes.sql` (`condominium_creation_intakes`), `20260930110000_accounting_consumption_and_installment_percentages.sql` (`condominium_allocation_rules`, `condominium_consumption_readings`), `20260930230000_fiscal_year_carryovers.sql` (`condominium_fiscal_carryovers`), `20260930235000_accounting_settings.sql` (`condominium_accounting_settings`), `20260930241000_allocation_rules_and_consumption.sql` (redefinitions/creation guards for allocation rules and consumption readings), and `20261001083000_payment_reversal_audit_and_reconciliation.sql` (`condominium_payment_reversal_audit`). The installment-schedule, funds-to-ledger, installment-percentage, and unit-completion migrations also extend existing relations and therefore are not substitutes for the missing core schema.

This confirms that the Production-derived proposal's 27 tables are a selected accounting/work subset, not a full core bootstrap: core entities such as workspaces, profiles, condominiums, members, portal access, and unit relations still require authoritative definitions, while several tracked migrations assume them before they run. The checked module migrations are source evidence only; this trace does not establish complete dependency order or equivalence with deployed catalog state. No migration was executed, no Production object was changed, and final QA remains deferred.


## Cross-check against retained schema-reconstruction artifacts — 2026-10-04

The historical branch contains supporting audit artifacts that sharpen the bootstrap gap: `PROPOSED-PRODUCTION-RLS-POLICIES-NOT-APPLIED.md` records 62 policies for the 27 accounting/work tables, while `FUNCTIONS-TRIGGERS-RLS-DEPENDENCY-AUDIT.md` inventories 85 relevant functions and 88 non-internal triggers but includes SQL bodies for only 14 selected functions. The manifest `PROPOSED-CONSOLIDATED-BOOTSTRAP-MANIFEST.md` explicitly treats the Production DDL as a final-state snapshot that must not be concatenated with incremental migrations.

The retained `COMMON-TABLES-PRODUCTION-DEVELOP-DIFF.md` also documents concrete environment gaps: missing `documents.file_size_bytes`, absent constraints on `communications.email_status`, `condominium_requests.title/status` and insurance monetary values, missing `condominium_creation_intakes.created_condominium_id` plus its FK, and the missing `condominiums.archived_by` FK in develop. These are historical metadata findings, not proof that the same gaps persist in the current database state; each needs a fresh read-only schema check before a targeted repair is authored.

**Action boundary:** the evidence is sufficient to reject a naive concatenation or a 27-table-only bootstrap, but insufficient to publish a faithful full bootstrap: core table definitions and complete function bodies/grants/triggers are not all available in the retained artifacts. No speculative baseline or schema patch is added. Production remains read-only; final QA stays deferred until reconciliation is complete.


## Migration filename/version inventory — 2026-10-04

A fresh recursive Git tree inventory of `supabase/migrations` on `fix/owner-reference-migration-20261003` returns 152 SQL files. Every filename follows the 14-digit version prefix convention, and the inventory contains no duplicate version prefixes. Therefore the previously recorded duplicate-timestamp concern applies to the earlier snapshot/branch inventory and is not present in the current branch tree as inspected here. This resolves filename-level uniqueness only: it does not prove dependency order, successful execution, or consistency of the migration ledger in any Supabase environment. No migration files were renamed or rewritten in this pass.


## Recupero di ulteriori fonti di schema dal branch di riparazione — 2026-10-04

L'ispezione dei branch alternativi ha individuato in `bethag-migration-repair` un set di artefatti di recupero più ampio, assente dal branch operativo: `docs/recovery/production_public_tables_snapshot.sql` (snapshot catalogo tabelle, 92.840 caratteri), undici file `production_functions_definitions_001.sql`–`011.sql` (definizioni SQL di funzioni estratte dal catalogo), oltre a snapshot di viste, trigger e inventario funzioni. Sono fonti utili per il confronto di oggetti, ma i file stessi li qualificano come snapshot di sola lettura e non come migrazioni replay-safe. Non contengono, per quanto verificato, il testo originale della migration `20260928021707_initial_bethag_backend`.

Nel medesimo branch è presente `20260928043430_create_portal_access_baseline.sql`, che crea la tabella `portal_access`; la successiva `20260928050000_reconstruct_portal_access_registry.sql` è una continuazione ricostruita, non la migration iniziale originale. Il documento `core_units_accounting_dependency_review.md` evidenzia inoltre che `condominium_units` viene creata soltanto dalla migrazione tardiva `20261001180000_restore_condominium_units_base.sql`, mentre alcune migrazioni precedenti la referenziano: è un blocco concreto di ordine/dipendenza per il replay cronologico pulito, da risolvere confrontando l'intero insieme delle operazioni.

È stato tentato il trasferimento dei file snapshot nel branch operativo tramite l'API GitHub, ma la creazione è stata rifiutata con errore HTTP 422 (sha non fornito); pertanto **nessuno snapshot è stato copiato o modificato** e il branch di riparazione resta la fonte originale di tali artefatti. Il registro corrente è stato aggiornato soltanto con queste evidenze. Non sono stati eseguiti SQL, replay, deploy o QA e Production resta intatta.


## Confronto indici e baseline delle unità con snapshot Production — 2026-10-04

Confrontati il blocco `public.condominium_units` nello snapshot catalogo Production del branch `bethag-migration-repair` e la migrazione `20261001180000_restore_condominium_units_base.sql`. Le colonne fondamentali, il vincolo di stato e i sette indici dichiarati risultano sostanzialmente coincidenti, inclusi i tre indici univoci:
- `condominium_units_code_building_uq` su `(condominium_id, lower(btrim(building_code)), lower(btrim(unit_code)))`;
- `condominium_units_condominium_unit_code_normalized_uidx` su `(condominium_id, lower(trim(unit_code)))`;
- `condominium_units_unique_unit` su `(condominium_id, lower(btrim(unit_code)))`.

I due ultimi indici hanno la stessa espressione logica e sono ridondanti tra loro; inoltre entrambi impongono unicità del codice a livello di condominio, anche se il primo indice esprime un'identità distinta per fabbricato. Poiché lo snapshot Production conferma che questi indici erano presenti nel catalogo rilevato, non è corretto rimuoverli unilateralmente nella migrazione di ripristino né presumere che la ridondanza sia soltanto un errore introdotto dal branch. Resta una decisione di modello/dati: verificare duplicati reali e valutare se il codice unità debba essere univoco nell'intero condominio o soltanto all'interno del fabbricato; solo dopo progettare una migrazione correttiva forward, con preflight e piano di rollback su ambiente isolato.

La migrazione di ripristino include anche RLS e policy per manager/residenti, mentre lo snapshot tabellare non contiene le policy. L'equivalenza della tabella/indici è quindi parziale e non certifica grants, policies, trigger, ownership o l'ordine cronologico del replay. Nessun indice è stato modificato e nessuna query è stata eseguita su Production.


## Matrice dipendenze bootstrap — approfondimento statico 2026-10-04

Il confronto con le fonti nel branch `bethag-migration-repair` conferma che il set di migrazioni disponibile non contiene un bootstrap core completo e autonomo. La sequenza più antica rintracciata in quel branch inizia da `20260928043430_create_portal_access_baseline.sql`; il file crea `portal_access` con FK verso `workspaces`, `condominiums`, `condominium_members` e `profiles`, dunque richiede che queste relazioni esistano già. La migration `20260928050000_reconstruct_portal_access_registry.sql` si definisce continuazione ricostruita e non sostituisce la migration fondativa mancante. La funzione pubblica di bootstrap amministratore del file `20260928060000_expose_first_admin_bootstrap.sql` delega a `private.claim_first_workspace_admin(uuid)`, perciò richiede anche la funzione privata e i suoi prerequisiti. `20260928070000_save_condominium_rpc.sql` dipende da `private.can_manage_workspace_module(uuid,text)`, introdotta nel file `20260928090000_collaborator_module_write_permissions.sql`; la chiamata RPC viene quindi definita prima del relativo helper nel flusso disponibile. Lo stesso file helper sostituisce policy su condomini, membri e moduli, assumendo che tabelle e colonne di ambito workspace siano già presenti.

| Oggetto/operazione | Dipendenza visibile | Conseguenza |
|---|---|---|
| `portal_access` baseline | `workspaces`, `condominiums`, `condominium_members`, `profiles` | Necessario bootstrap core precedente, non presente nella sequenza disponibile |
| `public.claim_first_workspace_admin(uuid)` | `private.claim_first_workspace_admin(uuid)` | Funzione privata e grant devono essere recuperati/verificati prima del wrapper |
| `public.save_condominium(...)` | `private.can_manage_workspace_module(uuid,text)`, tabella `condominiums` e relativo vincolo di conflitto | Helper anticipato rispetto alla RPC oppure definizione wrapper differita in una migration correttiva progettata e testata |
| `private.can_manage_workspace_module(uuid,text)` e policy collaborative | `workspace_members`, tabelle modulo, colonne `workspace_id` | Richiede schema core e modulo coerenti prima delle policy |
| `condominium_units` | Riferimenti in migrazioni precedenti alla sua migration base `20261001180000` | Ordine replay pulito ancora bloccato; non riordinare file storici senza replay isolato |

La verifica è statica sui file e sul branch indicati: non dimostra che l’ordine corrisponda alla cronologia applicata sul database né che le dipendenze siano tutte censite. Il tentativo di trasferire lo snapshot catalogo nel branch operativo continua a essere bloccato dall’API di creazione file che restituisce HTTP 422 (“sha wasn't supplied”); non si dichiara quindi presente alcun nuovo artefatto snapshot nel branch operativo. La prossima correzione consentita è ricostruire il grafo completo migration-per-migration e recuperare definizioni fondative da fonti attendibili; non introdurre un bootstrap sostitutivo finché tabelle, funzioni, grants, trigger, policy e ownership non hanno provenienza verificabile. Nessun SQL, replay, deploy, modifica Production o QA finale eseguiti.


## Estrazione relazioni core dallo snapshot Production — 2026-10-04

È stata eseguita un'estrazione mirata delle definizioni `CREATE TABLE` presenti in `docs/recovery/production_public_tables_snapshot.sql` sul branch `bethag-migration-repair` (blob SHA `c22a73b4c55187dee4a562afff99e5598ff6007b`). Il catalogo snapshot contiene 47 tabelle pubbliche. Le relazioni core estratte confermano queste dipendenze FK:

| Relazione | Dipendenze FK esplicite nello snapshot | Nota d'ordine |
|---|---|---|
| `workspaces` | nessuna FK pubblica | candidato nodo iniziale; contiene solo ID, nome, piano e date nello snapshot |
| `profiles` | `auth.users(id)` | dipendenza dal sistema Auth, non da una tabella applicativa |
| `condominiums` | `workspaces(id)`, `profiles(id)` via `archived_by` | richiede workspace e profili per il vincolo archivio |
| `workspace_members` | `workspaces(id)`, `profiles(id)`, `condominiums(id)` via `condominium_id` | deve seguire le tre relazioni referenziate |
| `condominium_units` | `condominiums(id)`, `workspaces(id)` | base unità dipendente dal core condominiale |
| `condominium_members` | `condominiums(id)`, `profiles(id)`, `condominium_units(id)` via `unit_id` | il vincolo su `unit_id` richiede che le unità siano create prima, o aggiunto successivamente |
| `portal_access` | `condominiums(id)`, `workspaces(id)`, `profiles(id)`, `condominium_members(id)` via `member_id` | dipende dall'intero nucleo precedente |

**Conseguenza tecnica:** un bootstrap nuovo, se in futuro autorizzato e testato in ambiente isolato, deve separare la creazione delle tabelle dai vincoli FK che chiudono le dipendenze incrociate. In particolare `condominium_members.unit_id → condominium_units.id` e `portal_access.member_id → condominium_members.id` vanno aggiunti soltanto dopo che entrambe le tabelle referenziate esistono. L'ordine teorico ricavato dallo snapshot è quindi: `workspaces` e `profiles` → `condominiums` → `condominium_units` → `condominium_members` → `portal_access`, con `workspace_members` dopo `condominiums`; le FK che formano dipendenze circolari o anticipano tabelle vanno differite. Questo è un grafo preliminare di sole FK, non un ordine di replay completo: funzioni, trigger, policy, grants, indici, viste e operazioni dati possono imporre ulteriori prerequisiti.

**Discrepanza da non propagare:** nello snapshot, `condominiums.archived_by` ha FK verso `profiles(id)`, mentre precedenti confronti storici segnalavano tale FK assente in develop. La migrazione `20261001180000_restore_condominium_units_base.sql` aggiunge `archived_by` come colonna, ma non crea il relativo vincolo FK. Prima di una migration forward occorre verificare il catalogo corrente dell'ambiente target con accesso read-only e decidere una correzione isolata. Inoltre lo snapshot `condominium_members` include FK `unit_id` verso `condominium_units`, quindi non è corretto usare l'estratto come SQL di bootstrap in un unico passaggio senza differire tale vincolo.

Le definizioni sono state consultate come fonte di confronto e non sono state copiate come migration eseguibile: lo snapshot è uno stato catalogato e non contiene da solo semantica di bootstrap, ownership, grants e sequenza completa. Nessun oggetto Production è stato modificato; nessun SQL o QA è stato eseguito.


## Verifica delle definizioni di funzioni Production recuperate — 2026-10-04

Esaminati gli artefatti sorgente `docs/recovery/production_functions_definitions_001.sql`–`011.sql` nel branch `bethag-migration-repair`. Le definizioni confermano la presenza, nelle fonti Production recuperate, dei seguenti helper privati e delle firme rilevanti:

| Funzione | Firma rilevata nella fonte | Evidenza/dipendenza esplicita |
|---|---|---|
| `private.claim_first_workspace_admin` | `(p_workspace_id uuid DEFAULT NULL::uuid) RETURNS uuid` | Presente in `production_functions_definitions_002.sql`; il wrapper pubblico recuperato in `006.sql` la richiama con `p_workspace_id`. La funzione usa contesto Auth e oggetti workspace; non costituisce da sola un bootstrap delle tabelle. |
| `private.can_manage_workspace_module` | `(target_workspace uuid, required_permission text) RETURNS boolean` | Presente in `002.sql`; numerose funzioni di gestione la invocano prima di operazioni su dati di condominio e contabilità. |
| `private.can_access_workspace_module` | `(target_workspace uuid, required_permission text) RETURNS boolean` | Presente in `001.sql`; utilizzata nelle funzioni di accesso del portale e nei controlli di visibilità. |
| `private.can_access_condominium` | `(target_condominium uuid) RETURNS boolean` | Presente in `001.sql`; la definizione richiama controlli di amministrazione workspace, accesso al modulo condomini e accesso residente. |
| `private.can_access_resident_condominium` | `(target_condominium uuid) RETURNS boolean` | Presente in `001.sql`; dipende dal modello di appartenenza residente/condominio. |

Il wrapper `public.claim_first_workspace_admin(uuid)` è presente in `production_functions_definitions_006.sql` e delega alla funzione privata. La definizione Production di `private.claim_first_workspace_admin` dichiara un parametro con default NULL, mentre il wrapper e la migration d'esposizione vanno confrontati sulla firma effettiva e sui privilegi: il solo nome della funzione non prova equivalenza di overload, default, owner o grants. Analogamente, l'ordine di definizione degli helper deve precedere le funzioni e le policy che li invocano; la migrazione disponibile `20260928070000_save_condominium_rpc.sql` precede cronologicamente `20260928090000_collaborator_module_write_permissions.sql`, fonte dell'helper `can_manage_workspace_module`, e resta quindi un'incompatibilità del replay pulito da risolvere nella ricostruzione della baseline.

Questi file sono estratti di definizioni Production, esplicitamente non eseguibili come migrazione: non attestano in modo sufficiente grants, ownership, dipendenze di tutte le tabelle, né la cronologia reale del database. I tentativi di recuperare dal branch operativo i singoli file migration indicati non hanno restituito contenuto verificabile; la ricerca testuale sul repository non ha restituito risultati. Per evitare una falsa correzione, non è stato creato un helper sostitutivo né alterato l'ordine dei file storici. Il prossimo passo resta associare ogni firma Production alla migrazione operativa corrispondente e documentare per ciascuna i prerequisiti e i privilegi da ripristinare, prima di produrre un eventuale bootstrap consolidato.

Nessun SQL, replay, deploy, scrittura su Production o QA finale eseguiti.


## Corrispondenza effettiva tra snapshot funzioni e migrazioni operative — 2026-10-04

Confrontati direttamente i file omonimi presenti sia nel branch operativo `fix/owner-reference-migration-20261003` sia nel branch di recupero `bethag-migration-repair`. Per le migration `20260928060000_expose_first_admin_bootstrap.sql`, `20260928070000_save_condominium_rpc.sql` e `20260928090000_collaborator_module_write_permissions.sql`, i contenuti e gli SHA risultano identici tra i due branch (rispettivamente `fac77a0fe4b762d7ed06bc5ebea6915609833403`, `20b18feacafb547bd9052c4ec11dbd9955f0bd50`, `a3f4d19ae06b51173ec32c2a094b19bd6a4a3889`). La copia nel branch di recupero non fornisce quindi una variante più completa di queste migration.

| Oggetto | Stato nella migration operativa | Gap residuo |
|---|---|---|
| `public.claim_first_workspace_admin(uuid)` | Wrapper SQL SECURITY DEFINER presente in `20260928060000`; revoca PUBLIC e grant EXECUTE ad authenticated | La logica delegata `private.claim_first_workspace_admin(uuid)` non è definita in questa migration; la sua definizione compare nell'estratto Production `production_functions_definitions_002.sql`, ma non è stata identificata una migration fondativa corrispondente nel set recuperato. |
| `public.save_condominium(...)` | RPC SECURITY DEFINER e grants espliciti presenti in `20260928070000` | Invoca `private.can_manage_workspace_module(uuid,text)`, la cui definizione compare soltanto nella migration `20260928090000` successiva. È un blocco verificato per replay cronologico pulito, anche se può funzionare su database dove l'helper esisteva già. |
| `private.can_manage_workspace_module(uuid,text)` | Definita in `20260928090000`, SECURITY DEFINER, STABLE, search_path public; EXECUTE revocato a PUBLIC/anon e concesso ad authenticated | Richiede `public.workspace_members` con colonne `workspace_id,user_id,active,role,permissions` già creata. Il file applica inoltre policy su tabelle di modulo, quindi assume che le tabelle e le colonne citate siano disponibili. |

Il parametro del wrapper pubblico `claim_first_workspace_admin` ha `DEFAULT NULL`, coerente con la definizione privata recuperata, ma questa corrispondenza nominale non dimostra che la funzione privata sia stata installata nella corretta baseline. Nell'estratto Production, `private.claim_first_workspace_admin` è PL/pgSQL SECURITY DEFINER con `search_path TO ''`; il wrapper operativo usa SQL SECURITY DEFINER con `search_path TO ''`. Per `can_manage_workspace_module`, l'estratto Production usa `(select auth.uid())`, mentre la migration usa `auth.uid()` direttamente: entrambe sono forme SQL valide, ma non si assume equivalenza comportamentale completa senza esecuzione controllata e confronto di owner/grants.

**Correzione immediata non applicata:** non è stato aggiunto un duplicato della funzione privata né riscritta la migration storica `20260928070000`. Senza la baseline originaria e la verifica delle dipendenze di `workspace_members`, introdurre ora una funzione ricostruita o anticipare la migration potrebbe rendere il replay apparentemente completo ma non riproducibile o sicuro. La prossima attività è rintracciare una fonte versionata attendibile della baseline privata e ricostruire la sequenza di prerequisiti di `workspace_members`; soltanto allora sarà possibile definire una migration forward mirata e validarla in ambiente isolato.

Nessun SQL, replay, deploy, modifica Production o QA finale eseguiti.


## Ricerca della baseline e delle origini di workspace_members — 2026-10-04

Ulteriore ricerca mirata nel repository per i messaggi di commit `workspace_members`, `initial_bethag_backend` e `bootstrap schema` non ha restituito commit corrispondenti. Il recupero diretto di `supabase/migrations/20260928021707_initial_bethag_backend.sql` sul branch operativo ha restituito `NOT_FOUND`; questo conferma soltanto che il file non è accessibile a quel percorso e ref, non che la baseline non sia mai esistita o non sia recuperabile da altre fonti.

I file operativi `20260928060000_expose_first_admin_bootstrap.sql` e `20260928090000_collaborator_module_write_permissions.sql` sono stati riaperti sul branch di recupero: il primo contiene il wrapper pubblico e non la funzione privata delegata; il secondo definisce l'helper che interroga `public.workspace_members` e presuppone quindi che la tabella e le colonne `workspace_id,user_id,active,role,permissions` siano già presenti. Non è emersa una migration fondativa verificabile da cui ricavare in sicurezza la definizione completa della tabella, i vincoli, le policy e i privilegi.

**Esito operativo:** il prerequisito `workspace_members` resta non attribuito a una migration fondativa attendibile; non viene fabbricata una definizione SQL né modificata la sequenza storica. Per superare il blocco occorre recuperare il file originario o un'altra fonte versionata completa, quindi confrontarla con lo snapshot Production e le dipendenze effettive. Nessuna interrogazione o modifica al database, replay, deploy o QA finale eseguiti.


## Divergenza tra baseline portal_access nei branch di recupero — 2026-10-04

Il confronto del file `supabase/migrations/20260928043430_create_portal_access_baseline.sql` tra `bethag-migration-repair` e `bethag-migration-repair-clean` ha rilevato due blob differenti: SHA `fac06a6b9d4810722e486f4fe51de4e3e8bec2d8` nel primo branch e `0bb9a3229777a10beb92f3c8a0b117a0faaa0847` nel secondo. Le due versioni definiscono la stessa tabella `public.portal_access`, le medesime colonne dichiarate, FK, vincolo di unicità, indici e policy di lettura; la differenza visibile è nella formattazione/commenti e nell'esplicitazione dei riferimenti alle migration successive nell'intestazione del branch `bethag-migration-repair`. Non è quindi emersa, da questo file, una diversa definizione sostanziale dello schema.

Le migration successive nominate nell'intestazione (`20260928043547_restrict_data_api_table_grants.sql` e `20260928043618_optimize_portal_access_auth_check.sql`) non risultano reperibili con `fetch_file` nei due branch verificati. La baseline `portal_access` dipende inoltre da `workspaces`, `condominiums` e `condominium_members`; non sostituisce la necessaria baseline di queste tabelle e di `workspace_members`. Il confronto restringe dunque la divergenza nota, ma non sblocca un replay integrale.

Nessuna versione è stata copiata o promossa automaticamente: prima di un eventuale consolidamento occorre stabilire il branch canonico e recuperare le migration mancanti, oltre alla baseline delle tabelle referenziate. Nessun SQL, replay, deploy, modifica Production o QA finale eseguiti.


## Verifica della migration ricostruttiva portal_access e grants — 2026-10-04

Esaminato il contenuto integrale di `20260928050000_reconstruct_portal_access_registry.sql` nel branch `bethag-migration-repair` (blob `4929bb2f32e2615fec3151df20dfa3c9805449a5`). La migration ripete `CREATE TABLE IF NOT EXISTS public.portal_access`, dichiara le FK verso `workspaces`, `condominiums`, `condominium_members` e `profiles`, il controllo del ruolo `resident/council` e l'unicità `(workspace_id, legacy_id)`; quindi crea gli indici email/utente/membro/condominio/workspace, abilita RLS e applica grants CRUD a `authenticated` e `service_role`, oltre alla policy di lettura del record proprio. La policy di gestione è rinviata alla migration `20260928090000`.

Questa migration non è un bootstrap autonomo affidabile: in presenza della baseline `20260928043430`, il secondo `CREATE TABLE IF NOT EXISTS` non riconcilia né corregge una tabella preesistente; esegue comunque gli indici, RLS, grants e policy successivi. Nel branch `bethag-migration-repair-clean` il file `20260928050000_reconstruct_portal_access_registry.sql` non è reperibile, mentre la baseline `20260928043430` è presente in una variante testuale differente. Pertanto i due branch di recupero non sono intercambiabili per questa porzione: il branch `repair` conserva una continuazione con grants espliciti che non è stata verificata nel branch `repair-clean`.

**Disposizione:** non copiare la migration ricostruttiva in altri branch senza verificare l'effettivo stato della tabella e dei grants di destinazione. La versione attuale documenta l'intento e una possibile continuazione, ma non risolve le dipendenze fondative mancanti né prova i privilegi correnti di Production. Nessun SQL, replay, deploy, modifica Production o QA finale eseguiti.


## Inventario completo dei prefissi migration e confronto con branch di recupero — 2026-10-04

È stato interrogato l'albero Git ricorsivo per gli SHA correnti del branch operativo (`071c06fc50b24b4c222ec3e90d5d8bc9a3b8fee0`) e del branch `bethag-migration-repair` (`110e2945cfed0f1edd58197b774c974cdc8da2f4`). Il primo contiene 152 file sotto `supabase/migrations/`; il secondo 212. Nel branch operativo la prima migration presente è `20260928060000_expose_first_admin_bootstrap.sql`, seguita da RPC e policy; non sono presenti nell'albero la baseline `portal_access` `20260928043430` né la continuazione `20260928050000`. Il branch di recupero contiene entrambe, ma il suo inventario di migration comincia anch'esso da `20260928043430`: non è stato individuato in nessuno dei due alberi un file di bootstrap iniziale con definizione di `workspaces`, `profiles`, `condominiums` e `workspace_members`.

Questo inventario spiega un'importante differenza tra i branch: l'operativo ha mantenuto la catena delle migration funzionali e correttive ma non le due migration iniziali del registro portale; il branch recovery include le due migration portal ma non fornisce la baseline core mancante. Il numero maggiore di file nel branch recovery non prova quindi una storia completa e replayabile. L'assenza è riferita agli alberi Git verificati agli SHA indicati, non a eventuali backup esterni, reflog non esposti o ambienti locali non collegati.

**Conclusione di questa passata:** il blocco principale resta il recupero del bootstrap core, non la sola riconciliazione portal_access. Per procedere in sicurezza serve una fonte originaria verificabile (dump completo, migration locale o commit non presente nei branch esaminati) e un confronto catalog-only dello schema di destinazione prima di scrivere un forward migration. Nessuna mutazione DB/Production, replay, deploy o QA finale effettuati.


## Uso degli snapshot Production per il recupero del core — 2026-10-04

Lettura mirata di `docs/recovery/production_public_tables_snapshot.sql` nel branch `bethag-migration-repair` (blob `c22a73b4c55187dee4a562afff99e5598ff6007b`). Il file dichiara esplicitamente di essere una ricostruzione schema-only da introspezione catalogo e **non** una migration replay-safe. Contiene 47 definizioni di tabelle, incluse `public.workspaces`, `public.profiles`, `public.workspace_members`, `public.condominiums`, `public.condominium_members`, `public.condominium_units` e `public.portal_access`; perciò fornisce una base concreta per estrarre colonne, default, vincoli e relazioni del core che non compaiono come bootstrap versionato negli alberi Git verificati.

Le definizioni snapshot attestano una forma osservata del catalogo, non la storia di creazione, la completezza di policy/grants, né la compatibilità dell'ordine di replay. In particolare, `workspace_members` contiene FK a `condominiums` e `profiles`, mentre altre tabelle referenziano workspace e condomini: la semplice copia del blocco `CREATE TABLE` in ordine di file non garantirebbe replay corretto, né ricostruirebbe funzioni, indici, trigger, policy e privilegi nella sequenza corretta. Lo snapshot resta quindi una fonte strutturale autorevole per confronto, ma non è stato promosso a migration eseguibile.

**Prossimo criterio di ricostruzione:** costruire una baseline nuova e separata solo a partire dallo snapshot, mantenendo separati (a) definizioni tabelle/vincoli, (b) indici e trigger, (c) funzioni, (d) RLS/policy e grants; annotare per ciascun oggetto provenienza e dipendenze, quindi confrontare il risultato con gli altri snapshot disponibili. L'assenza del testo SQL storico rimane dichiarata, senza spacciare la ricostruzione per l'originale. Non sono stati eseguiti SQL o modifiche a Production, replay, deploy o QA.


## Matrice dipendenze FK del core estratta dallo snapshot — 2026-10-04

È stata eseguita un'estrazione statica delle FK dichiarate nei 47 blocchi `CREATE TABLE` di `docs/recovery/production_public_tables_snapshot.sql` (branch `bethag-migration-repair`, blob `c22a73b4c55187dee4a562afff99e5598ff6007b`). L'estrazione considera solo riferimenti tra le 47 tabelle pubbliche incluse nello snapshot; non comprende dipendenze da schemi esterni, funzioni, trigger, policy o viste.

### Dipendenze core osservate

| Tabella | Dipende da |
|---|---|
| `workspaces` | Nessuna tabella pubblica dello snapshot |
| `profiles` | Nessuna tabella pubblica dello snapshot; FK esterna ad `auth.users` |
| `condominiums` | `workspaces`, `profiles` |
| `condominium_units` | `condominiums`, `workspaces` |
| `condominium_members` | `condominiums`, `condominium_units`, `profiles` |
| `workspace_members` | `workspaces`, `profiles`, `condominiums` |
| `portal_access` | `workspaces`, `condominiums`, `condominium_members`, `profiles` |

La relazione tra `condominium_members` e `condominium_units` conferma che le unità sono un prerequisito strutturale per la tabella membri nello snapshot; `workspace_members` dipende inoltre da `condominiums`, quindi non può essere collocata prima della creazione di quest'ultima se si mantengono tutte le FK inline. Le due tabelle `workspaces` e `profiles` non hanno dipendenze verso altre tabelle pubbliche nello snapshot e sono candidate a essere create per prime, previa gestione delle dipendenze esterne come schema `auth` ed estensioni.

L'estrazione statica **non definisce ancora un ordine di replay completo**: non risolve le dipendenze di funzioni, viste, trigger, RLS e grants, né certifica che lo snapshot sia completo rispetto al catalogo corrente. Non è stato generato o eseguito SQL. La matrice serve come evidenza per una futura baseline isolata, non come autorizzazione al replay.

**Avanzamento:** la dipendenza FK del nucleo è ora esplicitata nel registro; resta aperta la riconciliazione semantica di tutte le 47 tabelle con le migrazioni storiche e la verifica degli oggetti non tabellari. Nessuna modifica a Production e nessun collaudo QA eseguiti.


## Disallineamenti specifici tra migrazioni unità/intake e snapshot — 2026-10-04

Confrontate le sorgenti nel branch operativo con lo snapshot catalogo Production recuperato dal branch `bethag-migration-repair`:

- `20260929165000_complete_condominium_units.sql` (blob `f0d0865f87899394ef01a583d08faf66fbf2d918`) esegue query, UPDATE e INSERT su `public.condominium_units`, ma non crea la tabella. Nell'albero ricorsivo del branch operativo al commit `706c4ee4fc41421925fabc322f88965c19096852` non è presente la migration `20261001180000_restore_condominium_units_base.sql` citata in precedenti appunti; la directory contiene invece migrazioni che la usano prima e dopo. La definizione osservata di `condominium_units` è nello snapshot Production, non in una baseline storica verificata. Quindi l'ordine di replay resta bloccato da un prerequisito non ricostruito in modo versionato nel branch attuale.
- `20260930125903_condominium_creation_intakes.sql` (blob `36dc4e10ddb8a4123cd88a6bc0a218f28027e44f`) crea la tabella e definisce campi, check, due indici, RLS, policy e grants; la definizione corrispondente nello snapshot include anche `created_condominium_id uuid` e la FK `condominium_creation_intakes_created_condominium_id_fkey` verso `condominiums(id)` con `ON DELETE SET NULL`. La migration recuperata non dichiara quella colonna né la FK. È una differenza di schema concreta, ma il solo confronto non determina se sia stata aggiunta da una migration successiva non presente nel branch, da una modifica manuale o da una diversa revisione: non applicare una patch finché non è individuata la provenienza e verificato il catalogo corrente.
- La migration `20260928093000_align_portal_request_access.sql` (blob `fd3a805f93e73dcad0fba7aae203d3abcb86b692`) definisce funzioni che interrogano `portal_access` e `condominium_members` e invocano `private.is_workspace_admin` e `private.can_access_workspace_module`. Il file non definisce questi helper. La migration `20260928090000_collaborator_module_write_permissions.sql` definisce `private.can_manage_workspace_module`, non i due helper richiamati. Per il replay, la provenienza, le firme e i grants di `is_workspace_admin` e `can_access_workspace_module` devono quindi essere tracciati separatamente e verificati prima dell'esecuzione; la loro eventuale presenza in Production non dimostra che la sequenza Git sia autonoma.

### Disposizione
Questi delta sono classificati come **dipendenza/versione non riconciliata**, non come correzioni già validate. Occorre recuperare la migration della base unità o progettare una sostituzione separata, e rintracciare la provenienza della colonna/FK dell'intake. Non è stato eseguito SQL, non sono state alterate migration e non è stato avviato il collaudo finale.


## Tracciamento delle funzioni di autorizzazione core — 2026-10-04

Il confronto mirato degli snapshot di funzioni Production nel branch `bethag-migration-repair` conferma che `private.can_access_workspace_module(uuid,text)` è definita nel file `docs/recovery/production_functions_definitions_001.sql` (blob `769ac074036737f98e0393a65fb876e1e8911bdf`, blocco attorno alle righe 291–315), mentre `private.can_manage_workspace_module(uuid,text)` e `private.claim_first_workspace_admin(uuid)` sono nello snapshot `production_functions_definitions_002.sql` (blob `876b732024041793f92d41fad2ef6630704fd5cd`). Entrambi i file sono esplicitamente etichettati come snapshot di recupero, non migration eseguibili.

La funzione `private.can_access_condominium(uuid)` nello snapshot 001 invoca `private.is_workspace_admin`, `private.can_access_workspace_module` e `private.can_access_resident_condominium`. La migration `20260928093000_align_portal_request_access.sql` sostituisce le definizioni di accesso al condominio e al residente, ma non crea `is_workspace_admin` né `can_access_workspace_module`. La migration `20260928090000_collaborator_module_write_permissions.sql` crea `can_manage_workspace_module`, funzione distinta dalla `can_access_workspace_module` chiamata nelle policy e nelle funzioni di accesso. Pertanto la sola presenza della migration 09:00 non soddisfa il prerequisito di autorizzazione in lettura.

### Disposizione tecnica

- Classificare `can_access_workspace_module` e `is_workspace_admin` come **funzioni con definizione Production recuperata ma sorgente migration storica non individuata negli alberi verificati**.
- Non sostituire automaticamente `can_access_workspace_module` con `can_manage_workspace_module`: nomi e funzioni hanno scopi di autorizzazione diversi e la sostituzione potrebbe alterare l'accesso effettivo.
- Prima di una baseline ricostruita, confrontare per ogni funzione firma, corpo, proprietario, SECURITY DEFINER, search_path, ACL/EXECUTE e chiamanti; la sola definizione testuale non basta a certificare sicurezza o compatibilità.

Questa verifica è documentale e statica. Nessuna funzione è stata creata/modificata su Production, nessun replay, deploy o QA è stato eseguito.


### Precisazione: funzione admin e bootstrap — 2026-10-04

La lettura estesa degli snapshot Production completa la mappa precedente: `private.is_workspace_admin(uuid)` è definita in `docs/recovery/production_functions_definitions_003.sql` (blob `81f00cc54c4ff7d7b734020a2277c1d63d0fb331`), e verifica l'appartenenza attiva in `public.workspace_members` con ruolo `admin`. Quindi la definizione Production è recuperata; resta non individuata la corrispondente migration storica nei branch Git esaminati. Analogamente, `private.can_access_workspace_module(uuid,text)` è nello snapshot 001, ma non va confusa con `can_manage_workspace_module`.

La migration `20260928060000_expose_first_admin_bootstrap.sql` (blob `fac77a0fe4b762d7ed06bc5ebea6915609833403`) espone `public.claim_first_workspace_admin(uuid)` e la concede ad `authenticated`, ma richiama `private.claim_first_workspace_admin(uuid)` senza definirla. Il corpo della funzione privata è presente nello snapshot 002 (blob `876b732024041793f92d41fad2ef6630704fd5cd`), non in questa migration. Di conseguenza, la migrazione di esposizione non è autosufficiente in un replay pulito: deve essere preceduta da una sorgente privata verificata, inclusi proprietario, ACL e dipendenze da `workspaces`, `workspace_members`, `profiles` e `auth.uid()`.

**Stato:** definizioni rilevate negli snapshot di catalogo, provenienza storica delle funzioni private non certificata. La funzione wrapper non è stata eseguita o modificata; nessun DDL, replay, deploy o collaudo è stato effettuato.


### Verifica mirata della tabella di acquisizione condominio — 2026-10-04

È stato ripetuto il confronto diretto tra `20260930125903_condominium_creation_intakes.sql` (blob `36dc4e10ddb8a4123cd88a6bc0a218f28027e44f`) e la definizione corrispondente nello snapshot `docs/recovery/production_public_tables_snapshot.sql` (blob `c22a73b4c55187dee4a562afff99e5598ff6007b`). Il delta è confermato: lo snapshot include `created_condominium_id uuid` e il vincolo `condominium_creation_intakes_created_condominium_id_fkey` verso `condominiums(id) ON DELETE SET NULL`; la migration citata non include né la colonna né la FK. La migration contiene invece la struttura JSON, i controlli di stato e fonte, gli indici, RLS, policy e grant descritti nella registrazione precedente.

Nel tree verificato del branch operativo, i soli file migration con nome riconducibile a intake/creation sono `20260930125903_condominium_creation_intakes.sql`, `20260930250000_manual_ai_allocation_intake.sql` e `20260930260000_harden_allocation_intake_validation.sql`; non compare una migration successiva nominata per l'intake di creazione che spieghi il delta. Questo restringe la ricerca nel branch, ma non prova che la colonna sia stata aggiunta da una migration storica non recuperata, da una modifica manuale o da altra pipeline.

**Azione sospesa:** non aggiungere una migration correttiva finché non siano verificati lo stato attuale del catalogo, il flusso applicativo che legge/scrive `created_condominium_id` e la provenienza dell'alterazione. Il confronto è statico sul repository e sullo snapshot disponibile; nessuna modifica SQL o QA è stata eseguita.


### Precisazione cross-branch: base unità immobiliari — 2026-10-04

La verifica cross-branch corregge la portata della precedente osservazione: `20261001180000_restore_condominium_units_base.sql` **esiste** nel branch `bethag-migration-repair` (blob `fe10dc03984d9fe415464e1789a62e9cbda8d68c`), ma non è presente nel tree del branch operativo `fix/owner-reference-migration-20261003` verificato per questa riconciliazione. Non va quindi descritta come assente da tutti i branch. Nei branch `main` e `backup/pre-rollback-20261001` non è stata individuata tramite il percorso/versione esatti.

Il file di ripristino contiene la definizione base di `condominium_units`, aggiunge `condominium_members.unit_id` e la FK, configura indici e policy RLS. Tuttavia il suo timestamp/versione è successivo a `20260929165000_complete_condominium_units.sql`, che già aggiorna e inserisce righe in `public.condominium_units`. Pertanto il recupero del file nel branch di riparazione chiarisce la provenienza di una definizione candidata, ma non risolve l'ordine per un replay cronologico pulito. Inoltre la migration contiene due indici univoci normalizzati su `(condominium_id, unit_code)` con espressioni equivalenti (`lower(trim(...))` e `lower(btrim(...))`): non eliminarli senza verifica di equivalenza effettiva, dipendenze e dati duplicati nell'ambiente autorizzato.

**Disposizione:** tenere separati il recupero del file nel branch di riparazione e l'assenza nel branch operativo; non spostare o rinominare la migration e non eseguirla speculativamente. Prima di una soluzione occorrono baseline completo, verifica degli oggetti già presenti e piano di replay isolato. Nessuna modifica a Production o QA eseguita.


### Dipendenze cronologiche aggiuntive del dominio unità — 2026-10-04

La lettura dei file nel branch operativo conferma che il problema di ordine non riguarda soltanto `20260929165000_complete_condominium_units.sql`. Anche:

- `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) esegue un `UPDATE` su `public.condominium_units` e legge `condominium_members.unit_id`;
- `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) crea una funzione trigger e un constraint trigger su `public.condominium_units`, con riferimenti a `condominium_members`;
- `20261001095000_add_unit_cadastral_transformations.sql` (blob `ec83741bbb80396238380a97eb0aaf890858e591`) crea gli oggetti di trasformazione che hanno FK verso `condominium_units` e ne modifica gli attributi di ciclo di vita.

La migrazione candidata che crea la tabella e aggiunge `condominium_members.unit_id`, `20261001180000_restore_condominium_units_base.sql` (blob `fe10dc03984d9fe415464e1789a62e9cbda8d68c` nel branch `bethag-migration-repair`), è successiva a tutte le operazioni sopra e non è presente nel branch operativo. Questo rende esplicito un gruppo di dipendenze bloccanti nel replay cronologico, non un singolo riferimento anticipato. Il suo contenuto è una possibile base ricostruita, non prova che sia la sorgente storica applicata né che possa essere spostata senza ulteriori dipendenze.

**Decisione di riconciliazione:** classificare le migrazioni che operano su unità prima del ripristino base come dipendenze d'ordine da risolvere in un baseline isolato; non rinumerare né spostare file storici sulla sola base del timestamp. Prima della correzione occorre un inventario completo delle operazioni e degli oggetti preesistenti, quindi replay in ambiente usa-e-getta autorizzato. Nessuna esecuzione SQL, modifica Production o QA finale è stata eseguita.


### Controllo di coerenza del riferimento proprietario all'unità — 2026-10-04

La lettura integrale di `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) evidenzia una lacuna semantica nella funzione `public.validate_unit_owner_member_refs()`: per ogni valore in `condominium_units.data->'ownerMemberIds'` verifica che esista esattamente un `condominium_members` con lo stesso `condominium_id`, `legacy_id` e ruolo `Proprietario`, ma non confronta `m.unit_id` con `new.id`. La migrazione di riparazione `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) popola invece il riferimento filtrando esplicitamente `m.unit_id=u.id`. La validazione risulta quindi meno restrittiva del criterio usato dalla riparazione: potrebbe accettare su un'unità un ID legacy di un proprietario dello stesso condominio associato a un'altra unità.

Il trigger è inoltre definito come constraint trigger sulla sola tabella `condominium_units`, dopo INSERT o UPDATE di `condominium_id,data`; non intercetta direttamente un successivo cambio di `unit_id`, ruolo o `legacy_id` del membro. Eventuali altre protezioni di integrità vanno considerate separatamente e non sono sostituite da questo trigger.

**Correzione da preparare nel ramo di remediation:** allineare la validazione al legame autorevole `m.unit_id = new.id`, preservando il controllo di condominio/ruolo e gestendo esplicitamente i cambiamenti successivi dei membri (trigger complementare o vincolo applicativo transazionale). Prima di scrivere la migration forward occorre definire il comportamento previsto per unità senza proprietario, comproprietà e dati legacy, poi verificare i record esistenti in ambiente isolato. Non ho alterato la migration storica né creato/eseguito SQL correttivo; Production resta invariata e il QA finale resta rinviato.


### Correlazione con le protezioni member già presenti — 2026-10-04

Il catalogo di trigger salvato in `docs/recovery/production_triggers_snapshot.json` (branch `bethag-migration-repair`, blob `a9cd866d3e5d3a15ed18fe2d05db81ac1a19fabb`) mostra anche `trg_validate_member_unit_scope`, `trg_prevent_member_unit_reassignment_with_financial_history`, `trg_sync_member_unit_legacy_fields` e `trg_sync_portal_after_member_change` su `condominium_members`. La revisione preesistente `docs/recovery/targeted_rls_trigger_review.md` (blob `17fd6584df2f4005b9a3276dec27c27d368faeaf`) conferma che sono salvaguardie osservate a catalogo, ma non certificate con test runtime.

Questo restringe la lacuna segnalata nella sezione precedente: non si deve concludere che il sistema sia privo di controlli su unità, trasferimenti o portale. Il punto residuo specifico è la coerenza tra il JSON ridondante `ownerMemberIds` e la relazione membro-unità nei casi di modifica del ruolo o dell'associazione, oltre al fatto che la funzione `validate_unit_owner_member_refs()` controlla il condominio ma non confronta direttamente `m.unit_id` con l'unità validata. Le protezioni esistenti non vanno rimosse o replicate alla cieca; la futura remediation dovrà integrarsi con la sincronizzazione legacy, i vincoli di storico contabile e il flusso di subentro, e sarà da verificare in replay isolato.

Nessuna modifica al database o QA runtime è stata effettuata. La ricognizione resta statica e non certifica il comportamento del sistema installato.


### Effetti di cambio unità e ruolo sui riferimenti proprietario — 2026-10-04

Ulteriore confronto delle migrazioni operative:

- `20260930211000_guard_unit_scope_changes.sql` (blob `b65975dd8cfa4067693f04e40cbeb9d7c6c9d6a7`) blocca cambi di workspace/condominio e modifiche a fabbricato/civico quando trova storico in allocazioni o rate; non gestisce `ownerMemberIds`.
- `20260930510000_harden_unit_workspace_scope.sql` (blob `100b7568a6392b2dbeb56d8273b41d781afb100f`) convalida l'allineamento workspace-condominio delle unità; non valida il riferimento proprietario.
- `20261002110808_validate_transfer_outgoing_owner.sql` (blob `d8faca1980fc76bdfa8b616cd829229c28d43af8`) richiede che il membro uscente sia proprietario attivo e corrente sull'unità nel flusso di subentro.
- `20261004091000_preserve_outgoing_current_owner_flag.sql` (blob `9ecf9e1556356650019eac40001eb2884984cda2`) mantiene `current_owner=false` sulla posizione uscente alla conferma del trasferimento.

Questi controlli coprono aspetti distinti e non eliminano il rischio di riferimenti JSON obsoleti: il trigger `validate_unit_owner_member_refs` si attiva sulle modifiche a `condominium_units.condominium_id,data`, non sulle modifiche a ruolo o `unit_id` del membro. La pulizia dopo DELETE è prevista da `20261003070000_repair_deleted_member_owner_references.sql`, ma non è equivalente alla gestione di un cambio di ruolo o di unità. Inoltre, la migrazione di guardia allo scope protegge lo storico solo per i campi e le tabelle che interroga; non va interpretata come una validazione completa dei legami proprietario-unità.

**Azione di riconciliazione:** la futura migrazione forward dovrà decidere e applicare un'unica fonte autorevole per l'assegnazione proprietario-unità, aggiornare o invalidare i riferimenti JSON in modo transazionale nei cambi di `unit_id`/ruolo e conservare i vincoli del subentro e dello storico contabile. L'ordine resta subordinato al ripristino verificato della tabella base e alla conferma della definizione effettiva delle funzioni/triggers nel database isolato. Solo revisione statica; nessuna scrittura Production, replay o QA finale.


### Interazione con guardia scope unità e subentro — 2026-10-04

Il confronto puntuale di `20260930211000_guard_unit_scope_changes.sql` (blob `b65975dd8cfa4067693f04e40cbeb9d7c6c9d6a7`) mostra che la guardia impedisce modifiche a workspace/condominio e a fabbricato/civico in presenza di specifico storico contabile, ma non valida `ownerMemberIds`: è una protezione distinta e non risolve la coerenza proprietario-unità. Le migrazioni di subentro `20261002110808_validate_transfer_outgoing_owner.sql` (blob `d8faca1980fc76bdfa8b616cd829229c28d43af8`) e `20261004091000_preserve_outgoing_current_owner_flag.sql` (blob `9ecf9e1556356650019eac40001eb2884984cda2`) richiedono che il soggetto uscente sia proprietario attuale attivo dell'unità e marcano poi la posizione uscente come non più proprietario corrente e “In chiusura”. Questo conferma che una futura sincronizzazione di `ownerMemberIds` non deve riattivare o riproporre come corrente il proprietario uscente durante il subentro.

La revisione statica non basta a stabilire l'ordine effettivo di esecuzione di tutti i trigger né l'esito con comproprietari, transazioni concorrenti o righe legacy. Non aggiunta una migration speculativa: prima serve una definizione verificata della fonte autorevole per la proprietà corrente e la semantica di `ownerMemberIds`, quindi replay isolato con dati sintetici. Production resta invariata e il collaudo complessivo resta differito.


### Coerenza bidirezionale dei riferimenti proprietario — 2026-10-04

Confrontati i sorgenti effettivi `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`), `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`), `20261001094100_protect_member_financial_history.sql` (blob `8773b953d07b31dce62625f3fe9d2861c978c09a`) e `20260930510000_harden_unit_workspace_scope.sql` (blob `100b7568a6392b2dbeb56d8273b41d781afb100f`). La riparazione iniziale costruisce `ownerMemberIds` dai membri con `unit_id` coincidente, condominio coincidente e ruolo `Proprietario`; il validatore successivo controlla invece soltanto che ogni `legacy_id` appartenga al medesimo condominio e abbia ruolo proprietario, senza imporre la stessa unità. La protezione finanziaria impedisce alcune riassegnazioni con rate storiche, ma non costituisce sincronizzazione generale del JSON al mutare di ruolo o `legacy_id`.

Il trigger di pulizia al DELETE rimuove riferimenti per `OLD.legacy_id`; il catalogo salvato mostra inoltre un trigger di sincronizzazione dei campi unità legacy al variare di `unit_id`, ma non dimostra una sincronizzazione di `ownerMemberIds` nei cambi di ruolo/identificativo. Il rischio residuo è quindi una relazione denormalizzata non mantenuta bidirezionalmente e un controllo di integrità permissivo rispetto all'unità. La futura modifica dovrà definire il comportamento per unità senza proprietario, comproprietari, cambi ruolo, cambi unità consentiti e subentri, quindi sincronizzare/validare atomicamente senza sovrascrivere riferimenti legittimi. Evitare l'aggiornamento automatico indiscriminato di `ownerMemberIds` finché non siano noti i dati reali e i flussi applicativi.

Esito: problema di coerenza confermato da confronto statico; rimane da definire una remediation sicura e verificare il replay isolato. Nessun SQL eseguito su Production e nessun QA finale avviato.


### Esito confronto con i trigger di ambito e storico membro — 2026-10-04

Esaminati i sorgenti di `20260930211000_guard_unit_scope_changes.sql` (blob `b65975dd8cfa4067693f04e40cbeb9d7c6c9d6a7`), `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`), `20260929165000_complete_condominium_units.sql` (blob `f0d0865f87899394ef01a583d08faf66fbf2d918`) e `20261001094100_protect_member_financial_history.sql` (blob `8773b953d07b31dce62625f3fe9d2861c978c09a`).

- Il trigger di validazione proprietari opera su INSERT/UPDATE di `condominium_units` (colonne `condominium_id,data`) e verifica cardinalità, condominio e ruolo `Proprietario`; non verifica che il membro punti proprio all'unità (`condominium_members.unit_id = condominium_units.id`). Non è definito su UPDATE del membro, quindi una successiva modifica di `unit_id` o `role` può rendere obsoleto il riferimento JSON senza riattivare questa validazione.
- I controlli di ambito e storico membro/unità sono complementari, non sostitutivi: bloccano alcuni spostamenti con dati contabili e proteggono lo scope delle unità, ma non dimostrano la coerenza del JSON dei proprietari per ogni transizione.
- La migrazione `20260929165000_complete_condominium_units.sql` crea unità con `ownerMemberIds: []`; pertanto la futura regola non deve imporre che ogni unità abbia necessariamente un proprietario associato. Deve validare solo i riferimenti effettivamente presenti, preservando comproprietà e proprietari esterni.
- La migrazione `20261001094100_protect_member_financial_history.sql` guarda lo storico rateale del membro durante la riassegnazione, mentre le altre protezioni coprono ulteriori oggetti in migrazioni successive. La logica correttiva dovrà rispettare la posizione storica e il flusso di subentro, evitando aggiornamenti retroattivi dei riferimenti che cambino l'attribuzione contabile.

**Disposizione:** lacuna circoscritta e riproducibile a livello di sorgente; non è ancora sicuro produrre una migration correttiva eseguibile senza verificare dati legacy, trigger effettivi e comportamento di co-proprietari/trasferimenti in un replay isolato. Nessuna modifica DB o QA finale eseguita.


### Validazione owner refs rispetto alle mutazioni dei membri — 2026-10-04

Lettura diretta di `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) conferma che `trg_validate_unit_owner_member_refs` è un constraint trigger differibile installato su `condominium_units` per INSERT e UPDATE di `condominium_id,data`. La funzione verifica formato array, unicità del `legacy_id`, appartenenza al medesimo condominio e ruolo `Proprietario`, ma non confronta `condominium_members.unit_id` con `condominium_units.id`.

Il catalogo storico `docs/recovery/production_triggers_snapshot.json` (branch `bethag-migration-repair`, blob `a9cd866d3e5d3a15ed18fe2d05db81ac1a19fabb`) mostra trigger su `condominium_members` per scope, sincronizzazione campi legacy, protezione dello storico finanziario e sincronizzazione portale; non mostra un trigger che rivalidi gli array `ownerMemberIds` sulle unità interessate dopo UPDATE del membro. Il trigger di pulizia alla DELETE rimuove invece i riferimenti basati su `legacy_id`, ma non copre cambi di ruolo o unità. Pertanto un membro già referenziato può potenzialmente perdere il ruolo proprietario o essere riassociato (nei casi ammessi dalle altre guardie) lasciando un riferimento JSON non più coerente.

**Conseguenza per la correzione:** oltre al controllo diretto `m.unit_id = new.id` durante la validazione dell’unità, la remediation deve valutare un controllo differibile/serializzabile anche sulle modifiche a `condominium_members` che cambiano `unit_id`, `data->>'role'`, `legacy_id` o `condominium_id`. Deve preservare comproprietari, membri senza unità e trasferimenti autorizzati, e gestire atomicamente l’aggiornamento dei riferimenti. Prima di produrre una migration eseguibile occorre verificare nel catalogo corrente le definizioni effettive dei trigger e le eventuali modifiche applicative, oltre a riprodurre i casi in un database isolato. Nessuna migration SQL è stata eseguita o applicata.


### Provenienza dei trigger member-unit nel branch operativo — 2026-10-04

L'inventario aggiornato di `supabase/migrations/` nel branch `fix/owner-reference-migration-20261003` è stato confrontato con i trigger riportati in `docs/recovery/production_triggers_snapshot.json` (branch `bethag-migration-repair`, blob `a9cd866d3e5d3a15ed18fe2d05db81ac1a19fabb`). Sono presenti migration nominate per la protezione scope unità (`20260930211000_guard_unit_scope_changes.sql`), riferimenti proprietario (`20260930214000_repair_unit_owner_references.sql`, `20260930215000_validate_unit_owner_member_refs.sql`), storico finanziario e sincronizzazione portale. Nel tree operativo, invece, non è stato individuato un file migration con nome riconducibile alla sincronizzazione `condominium_members.unit_id` nei campi legacy, né uno che installi esplicitamente `trg_sync_member_unit_legacy_fields`.

Il trigger compare nel catalogo snapshot, quindi la sua presenza in quell'istantanea è documentata; la sua provenienza versionata e la riproducibilità in un replay pulito non risultano però stabilite dal branch operativo. Non va dedotto che il trigger sia assente dal database effettivo o che debba essere ricreato: potrebbe essere contenuto in una migration con nome non descrittivo, in uno script storico non recuperato o in una modifica manuale. Occorre risalire alla funzione `sync_condominium_member_unit_legacy_fields()`, cercarne la definizione in tutti gli snapshot/migration disponibili e confrontarla con la definizione live prima di intervenire.

**Disposizione:** aggiungere la sincronizzazione legacy alla lista di provenienza da chiudere nel baseline; non generare una sostituzione né eseguire DDL sulla sola base dell'assenza di un nome file corrispondente. Nessun database modificato e collaudo finale non avviato.


### Ricerca della funzione di sincronizzazione legacy — 2026-10-04

È stata estesa la ricerca testuale di `sync_condominium_member_unit_legacy_fields()` agli snapshot `production_functions_definitions_004.sql`–`011.sql` del branch `bethag-migration-repair` (blob rispettivamente `434016783d69dec686b6626c58c0dd0cc90bf47b`, `d920e12fa03007d9b331a9740bf9c743c60f27ab`, `bb5eb18f7d3eab4efbe57181bdf86c5b9e412469`, `552f017c25b8b84ef367595115c230d5fdbb3191`, `b432422d3f7228d99b8f9df5b2d50c5ef3382880`, `209b4998626e125ef8d9fb483acf691a241a0c2f`, `6bdcadce6f407bb541ceef63efee52822d454ff9`, `2d2ac632a2d8f5bf52dd61779813b0f336017006`): nessuna definizione della funzione è emersa. I file `001`–`003` contengono invece gli helper di autorizzazione già registrati e non risolvono questa provenienza.

Il risultato restringe la ricerca agli altri snapshot di oggetti, alle migration con nome non descrittivo e agli eventuali script di recovery; non dimostra che la funzione manchi dal database installato. La ricostruzione della funzione non è sicura senza il suo corpo effettivo e il comportamento atteso dei campi legacy. Nessuna DDL è stata generata o applicata e il collaudo finale resta differito.


### Copertura della riparazione iniziale degli owner refs — 2026-10-04

La lettura completa di `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) evidenzia un secondo limite distinto dal controllo permissivo già registrato: l'UPDATE ricostruisce `ownerMemberIds` soltanto per le unità per cui esiste almeno un membro con `unit_id`, condominio e ruolo `Proprietario`. Le unità senza una corrispondenza non vengono aggiornate, quindi eventuali riferimenti JSON preesistenti e ormai obsoleti possono rimanere. La migrazione non è pertanto una normalizzazione completa di tutti gli array.

Il validatore `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) verifica che ogni valore dell'array identifichi un solo membro proprietario nello stesso condominio, ma non lega quel membro all'unità in esame. Insieme, i due comportamenti significano che un array obsoleto può persistere se il membro è ancora proprietario nello stesso condominio, pur essendo associato a un'altra unità; inoltre l'assenza di proprietari non comporta di per sé la pulizia dell'array storico.

**Conseguenza operativa:** non estendere l'UPDATE in modo indiscriminato a `ownerMemberIds: []` senza verificare la semantica di unità con proprietari esterni, comproprietà e unità senza membro associato. La futura correzione dovrà prima classificare i valori attuali (membro associato alla stessa unità, membro di altra unità, ruolo non proprietario, legacy ID mancante/non univoco, owner esterno) e applicare una regola deterministica e transazionale, preservando i dati non riconducibili a membri. La discrepanza è confermata dal sorgente; nessuna migration correttiva è stata creata o eseguita e Production non è stata modificata.


### Trigger lato membro e coerenza bidirezionale proprietario-unità — 2026-10-04

Il confronto puntuale delle migrazioni attive precisa il perimetro del difetto:

- `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) ricostruisce `ownerMemberIds` solo da membri con lo stesso `unit_id`, condominio e ruolo `Proprietario`, ma aggiorna le unità soltanto quando trova almeno un proprietario idoneo. Non normalizza quindi le unità senza proprietario e non affronta da solo le modifiche successive ai membri.
- `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) valida i riferimenti quando cambia `condominium_units.condominium_id/data`, ma la ricerca del membro usa solo `condominium_id`, `legacy_id` e ruolo: manca il confronto con `m.unit_id = new.id`.
- `20261001094100_protect_member_financial_history.sql` (blob `8773b953d07b31dce62625f3fe9d2861c978c09a`) impedisce il cambio di unità/condominio in presenza di rate storiche; non sostituisce la validazione dei riferimenti proprietario.
- La ricognizione dei trigger di produzione registra inoltre un trigger di scope membro-unità e sincronizzazione dei campi legacy. La loro presenza non garantisce, da sola, che il JSON proprietari venga rivalidato quando cambia `unit_id`, `role` o `legacy_id`.

**Correzione da preparare, non ancora applicata:** mantenere il controllo di condominio e ruolo e vincolare ogni proprietario referenziato alla stessa unità; aggiungere una validazione complementare sul cambiamento dei campi del membro che possono invalidare i riferimenti, gestendo esplicitamente cambio ruolo/legacy ID, comproprietari e cancellazione (già coperta da cleanup AFTER DELETE). Prima di definire l'ordine dei trigger o lo SQL definitivo, confrontare i corpi completi e i nomi effettivi del catalogo, nonché stabilire se `ownerMemberIds` è obbligatorio, derivato o soltanto una cache in tutti i flussi di scrittura. Il backfill dovrà includere anche le unità prive di proprietari, preservando la distinzione tra assenza legittima e dato storico incompleto.

Nessuna migrazione è stata eseguita e nessuna modifica al database di produzione è stata effettuata. Il finding è statico e richiede ancora verifica in replay isolato prima di una correzione eseguibile.


### Copertura della riparazione degli owner refs e variazioni lato membro — 2026-10-04

Il confronto diretto di `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) con `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) individua un secondo caso limite: la riparazione aggiorna soltanto unità per cui esiste almeno un membro con `unit_id` corrispondente, `legacy_id` non nullo e ruolo `Proprietario`. Le unità senza un proprietario così qualificato non vengono aggiornate, quindi eventuali `ownerMemberIds` obsoleti su tali unità non sono rimossi da questa riparazione. La validazione differita si applica alle righe unità toccate dal relativo INSERT/UPDATE e non dimostra da sola che tutte le righe legacy siano state bonificate.

Il catalogo trigger recuperato include sincronizzazione dei campi legacy all'UPDATE di `condominium_members.unit_id`, ma non prova una sincronizzazione inversa dell'array JSON `condominium_units.data->ownerMemberIds` quando cambiano ruolo, unità o `legacy_id`. La pulizia osservata all'AFTER DELETE copre solo la cancellazione. Occorre quindi trattare come requisiti distinti: bonifica completa dei riferimenti storici, mantenimento della coerenza nelle successive modifiche ai membri e validazione per la stessa unità (non soltanto per lo stesso condominio). Prima di progettare la migrazione correttiva vanno stabilite le regole per unità senza proprietari, comproprietari, membri inattivi e trasferimenti, così da evitare rimozioni improprie o perdita di continuità.

Esito: difetto di copertura potenziale dimostrato dalla condizione SQL della riparazione; non è possibile quantificare le righe effettivamente incoerenti senza dati/catalogo aggiornati. Nessuna modifica SQL applicata e nessun test runtime eseguito.


### Verifica mirata: trigger di ambito membro/unità e vincoli proprietari — 2026-10-04

La migration `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) è esplicita: per ciascun valore in `ownerMemberIds` verifica unicità del `legacy_id`, appartenenza al medesimo condominio e ruolo `Proprietario`, ma non verifica che il membro sia associato alla specifica unità tramite `m.unit_id = new.id`. La migration precedente `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) invece ricostruisce il JSON filtrando proprio per `m.unit_id = u.id`; la validazione non garantisce quindi la stessa regola di coerenza applicata dalla riparazione.

Il trigger di validazione è differibile e si attiva su INSERT/UPDATE di `condominium_units` limitatamente a `condominium_id,data`. Il catalogo Production salvato nel recovery branch documenta inoltre trigger lato `condominium_members` per scope, sincronizzazione legacy e blocco di riassegnazioni con storico. Le migration disponibili nel branch di lavoro, tuttavia, non contengono i corpi di tutte queste funzioni e non consentono di stabilire integralmente l'ordine e l'interazione effettiva dei trigger. La migration `20260930211000_guard_unit_scope_changes.sql` (blob `b65975dd8cfa4067693f04e40cbeb9d7c6c9d6a7`) protegge modifiche di workspace/condominio e di alcuni campi di ambito dopo movimenti contabili, ma non sostituisce la validazione proprietario-unità.

**Decisione di riallineamento:** non modificare retroattivamente le due migration storiche e non applicare una sostituzione automatica di `ownerMemberIds` finché non siano ricostruiti i corpi effettivi dei trigger member, i casi di comproprietà e le regole per unità senza proprietario associato. La correzione forward dovrà garantire coerenza bidirezionale (riferimento JSON e `unit_id`/ruolo del membro), preservare le righe con storico e integrarsi con il subentro; deve essere prima verificata su baseline isolata e dati sintetici. Nessuna scrittura su Production e nessun collaudo finale eseguiti.


### Ulteriore difetto di validazione JSON dei proprietari — 2026-10-04

La lettura puntuale di `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) rileva che il ciclo controlla ogni elemento di `ownerMemberIds` separatamente e richiede un solo membro con quel `legacy_id` nel condominio e ruolo proprietario. Non verifica però che gli elementi dell'array siano distinti: lo stesso `legacy_id` può quindi comparire più volte e superare la validazione, purché identifichi un unico membro qualificato. La riparazione `20260930214000_repair_unit_owner_references.sql` ricostruisce l'array dalla relazione membro-unità, ma non impedisce che un successivo INSERT/UPDATE manuale o applicativo reintroduca duplicati.

La futura validazione forward dovrà verificare sia l'unicità del riferimento nell'array sia la corrispondenza del membro alla specifica unità (`m.unit_id = new.id`), oltre ai controlli già presenti di condominio e ruolo. Prima di introdurla resta necessario chiarire la semantica di comproprietà e membri inattivi e garantire che l'aggiornamento sia coerente con i trigger lato membri. Non sono state modificate le migration storiche né applicato SQL al database.


### Limite della riparazione dei riferimenti proprietario — 2026-10-04

Il confronto diretto con `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) evidenzia che l'UPDATE modifica soltanto le unità per cui esiste almeno un membro qualificato come `Proprietario` con `unit_id` coincidente e `legacy_id` non nullo. Per le unità senza tale membro, l'UPDATE non viene eseguito: un eventuale `ownerMemberIds` preesistente e obsoleto può quindi rimanere nel JSON. È distinto dal difetto già annotato nella validazione (assenza del confronto `unit_id` e mancato controllo duplicati).

La correzione forward dovrà quindi definire esplicitamente anche il caso senza proprietari associati: se la relazione membro-unità è la fonte autorevole, il JSON deve essere ricostruito come array vuoto per le unità senza riferimenti validi, salvo diversa regola di dominio documentata. Prima dell'aggiornamento massivo servono conteggi di confronto tra JSON e relazione autorevole, gestione dei legacy_id null/duplicati e verifica della semantica di comproprietà; non alterare lo storico né cancellare membri. Nessuna migration storica o database è stata modificata.


### Ciclo di vita del riferimento proprietario: aggiornamento della lacuna — 2026-10-04

Confrontati direttamente i tre sorgenti attivi:
- `20260930211000_guard_unit_scope_changes.sql` (blob `b65975dd8cfa4067693f04e40cbeb9d7c6c9d6a7`) protegge lo spostamento dell'unità con storico contabile, ma non mantiene `ownerMemberIds` quando cambia il membro.
- `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) ricostruisce il JSON usando i membri collegati a quella specifica unità, ma è un aggiornamento una tantum della migrazione.
- `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) valida il JSON solo su INSERT/UPDATE di `condominium_units`, e abbina il membro per condominio, legacy ID e ruolo, non per `unit_id`.

Il problema è quindi bidirezionale: un cambiamento successivo su `condominium_members.unit_id`, `legacy_id` o `data.role` può lasciare `ownerMemberIds` obsoleto, mentre una modifica dell'unità può superare il controllo con un proprietario del medesimo condominio ma di un'altra unità. Il trigger di sincronizzazione legacy dei campi unità non dimostra, da solo, che venga mantenuto anche il JSON proprietari.

Direzione di correzione da applicare solo dopo il controllo di compatibilità dati: rendere coerente il validatore con l'identità della stessa unità (`m.unit_id = new.id`), quindi definire una sincronizzazione transazionale del JSON quando cambiano associazione, legacy ID o ruolo del membro; gestire esplicitamente più comproprietari, unità senza proprietario, valori legacy e operazioni di subentro. Il trigger di cancellazione già esistente va mantenuto e verificato insieme alla sincronizzazione. La correzione non va applicata come semplice sostituzione SQL senza preflight su riferimenti esistenti, perché potrebbe bloccare scritture legittime o eliminare associazioni storiche.

Nessuna migrazione è stata eseguita sul database e nessun test runtime è stato dichiarato. La definizione della remediation resta subordinata al controllo del catalogo effettivo e a un replay isolato della baseline completa.


### Migration candidata di sincronizzazione membri-unità — 2026-10-04

Aggiunta al branch `fix/owner-reference-migration-20261003` la migration forward-only `20261004102000_sync_unit_owner_refs_on_member_change.sql` (commit `0af12841148e13597163d1194182cc47b615a53b`). Introduce un trigger dopo INSERT/UPDATE dei campi rilevanti di `condominium_members`, ricalcolando `ownerMemberIds` sulla relazione membro-unità per la vecchia e la nuova unità; include il caso in cui l'ultimo proprietario venga rimosso dal ruolo o trasferito, così da svuotare il riferimento obsoleto. Gli aggiornamenti sono condizionati alla differenza del JSON calcolato per limitare scritture superflue. Il trigger di DELETE già presente resta separato e non è rimosso.

La migration è stata aggiunta al repository come candidata, non applicata a Supabase. Prima del replay vanno verificati schema effettivo e tipi delle colonne, comportamento con legacy ID null/duplicati, co-proprietari, modifiche concorrenti, RLS/SECURITY DEFINER, compatibilità con i trigger esistenti e l'ordine rispetto al ripristino della tabella `condominium_units`. Il validatore attuale continua inoltre a non confrontare direttamente `m.unit_id = new.id`; la sincronizzazione non sostituisce questa correzione né la verifica dati preliminare. Nessun QA runtime o modifica Production effettuati.


### Verifica puntuale del validatore owner refs — 2026-10-04

Riletti i testi integrali di `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) e `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`) nel branch attivo. La riparazione ricava `ownerMemberIds` dai membri collegati alla stessa `unit_id`, allo stesso condominio e con ruolo `Proprietario`; il validatore, invece, verifica solo condominio, `legacy_id` e ruolo. Confermato quindi il disallineamento tra relazione autorevole e controllo del JSON denormalizzato.

Ulteriore punto: il validatore scorre gli elementi senza imporre l'unicità degli ID nell'array, perciò un riferimento ripetuto può superare il controllo se il membro corrispondente è unico. Un array vuoto è invece ammesso: non va introdotto un obbligo di proprietario per ogni unità senza chiarire le unità non assegnate, le pertinenze autonome e le casistiche di comproprietà. La correzione dovrà validare ogni riferimento contro la medesima unità e rifiutare duplicati nel JSON, preservando array vuoti validi e più proprietari distinti quando effettivamente associati all'unità.

Il trigger del validatore scatta su INSERT/UPDATE di `condominium_units` per `condominium_id,data`; non si attiva da solo quando cambia in seguito `condominium_members.unit_id`, ruolo o `legacy_id`. Il catalogo di produzione elenca separati trigger member-scope e sincronizzazione legacy, ma i loro corpi non sono stati verificati in questa passata. Prima di un intervento occorre confrontare quei corpi e il flusso applicativo, per scegliere una sincronizzazione/validazione transazionale completa e non creare falsi blocchi su subentri o modifiche anagrafiche.

Esito: difetto logico circoscritto confermato a livello statico; non è stata creata né eseguita una migrazione correttiva, né modificato lo schema remoto. Nessuna QA runtime eseguita.


### Esame della migrazione candidata di sincronizzazione owner refs — 2026-10-04

Individuata e letta `supabase/migrations/20261004102000_sync_unit_owner_refs_on_member_change.sql` nel branch attivo (blob `c439c311ce39f70ee3a88549e6210ec179b162f0`): la funzione `public.sync_unit_owner_refs_after_member_change()` aggiorna il JSON `ownerMemberIds` dopo INSERT e dopo UPDATE dei campi `unit_id, condominium_id, legacy_id, data`, ricalcolando sia l'unità precedente sia quella corrente in base ai membri con stessa unità/condominio e ruolo `Proprietario`. La logica confronta l'array attuale con quello atteso prima dell'UPDATE, riducendo scritture inutili; l'esecuzione è `SECURITY DEFINER`, con `search_path = ''` e riferimenti agli oggetti qualificati. Il trigger non include DELETE, coperto separatamente da `clean_deleted_member_owner_references()`.

La migrazione è una candidata forward-only già presente nel branch, non prova che sia stata applicata o sia compatibile con lo schema remoto. Prima dell'adozione restano da verificare: integrità e tipo di `legacy_id`, comportamento dei trigger concorrenti e deferred, correttezza per cambi ruolo/unità/condominio e membri senza `legacy_id`, preservazione di eventuali chiavi aggiuntive in `data`, gestione delle unità prive di proprietari e dei comproprietari, nonché coerenza del trigger DELETE. Il validatore attuale continua inoltre a non imporre che ogni ID in `ownerMemberIds` sia associato proprio alla unità validata e non rifiuta ID duplicati: la sincronizzazione riduce la deriva nei cambi member, ma non sostituisce tale correzione del validatore né un controllo dati preesistenti.

Non sono state eseguite migrazioni, query su Production o QA. Verifica statica del sorgente soltanto.


### Verifica puntuale della sincronizzazione owner refs — 2026-10-04

Riletta integralmente la migrazione candidata `20261004102000_sync_unit_owner_refs_on_member_change.sql` (blob `c439c311ce39f70ee3a88549e6210ec179b162f0`). La sincronizzazione AFTER INSERT/UPDATE ricalcola `ownerMemberIds` dalla relazione membro-unità, per l'unità precedente e quella nuova; la funzione è `SECURITY DEFINER`, usa `search_path = ''` e qualifica gli oggetti. La separazione dalla pulizia AFTER DELETE è coerente in linea generale con il trigger di cancellazione già presente. Il trigger unitario differito esistente fornisce una validazione al termine della transazione, ma la sua regola attuale controlla ancora solo condominio e ruolo, non l'uguaglianza `m.unit_id = new.id`.

**Rilievi da risolvere prima di considerarla pronta:**
- La funzione sostituisce l'intero valore di `ownerMemberIds` con l'aggregato atteso, perdendo ordine manuale e possibili valori legacy non riconducibili a membri attivi; confermare che il campo sia rigorosamente derivato e non abbia semantica aggiuntiva.
- L'aggregato non elimina duplicati di `legacy_id`; due righe proprietario con lo stesso identificativo generano riferimenti ripetuti. Occorre stabilire e imporre l'unicità della chiave legacy nel suo ambito, oppure aggregare valori distinti e gestire collisioni come errore dati.
- I membri proprietari senza `legacy_id` vengono esclusi silenziosamente. Va verificato se il modello li ammetta e, se no, se l'inserimento/aggiornamento debba fallire esplicitamente.
- La funzione dipende da `unit_id` e dalla codifica ruolo in `data->>'role'`; validare la compatibilità col tipo, con la normalizzazione e con i trigger `sync_condominium_member_unit_legacy_fields` e `validate_member_unit_scope` effettivi, incluso il loro ordine di esecuzione.
- La migrazione ricrea il trigger su INSERT e UPDATE, ma non fa backfill delle unità già incoerenti. Un backfill va progettato separatamente, con report preliminare di anomalie, preservazione delle chiavi JSON e conteggio dei riferimenti senza corrispondenza.
- La pulizia DELETE elimina l'ID cancellato ma non ricostruisce l'array dalla relazione residua; confrontare il suo comportamento con l'aggregazione su UPDATE e definire una sola regola canonica per inserimento, modifica e cancellazione.

La candidata migliora la sincronizzazione futura, ma non corregge da sola il validatore e non dimostra la coerenza dei dati già esistenti. Non ho cambiato la migrazione né eseguito SQL, accessi di scrittura a Production o QA. Prossimo passo: tracciare il contratto del campo nel codice applicativo e le funzioni/trigger member correlati, poi preparare una correzione forward-only e un backfill verificabile per ambiente isolato.


### Chiusura analisi statica: validazione bidirezionale proprietario-unità — 2026-10-04

Esaminato il contenuto effettivo di `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`). La funzione scorre `new.data->'ownerMemberIds'` e richiede un solo membro con lo stesso `condominium_id`, `legacy_id` e ruolo `Proprietario`; non verifica `m.unit_id = new.id`. Il constraint trigger è differito, ma si attiva soltanto dopo INSERT/UPDATE di `condominium_units` sulle colonne `condominium_id,data`. Una successiva modifica del membro (ruolo, `unit_id` o `legacy_id`) non riattiva questa specifica validazione.

Il catalogo storico dei trigger (branch `bethag-migration-repair`, `docs/recovery/production_triggers_snapshot.json`, blob `a9cd866d3e5d3a15ed18fe2d05db81ac1a19fabb`) elenca separatamente i controlli `trg_validate_member_unit_scope` e `trg_sync_member_unit_legacy_fields`; questi tutelano ambito e sincronizzazione, ma la loro sola presenza non dimostra che mantengano sempre coerente il JSON `ownerMemberIds`. La correzione deve quindi trattare la coerenza come relazione bidirezionale, preservando comproprietari, unità senza proprietario dichiarato, membri storicizzati e flussi di subentro.

**Esito della fase:** confronto del validator e correlazione con i trigger completati e registrati. Non è stato introdotto un SQL correttivo perché il repository non fornisce dati correnti e una regola certa per migrare riferimenti legacy orfani, proprietari multipli e membri trasferiti; forzare l'uguaglianza senza questa verifica rischierebbe di bloccare scritture valide o alterare dati storici. La fase successiva è la riconciliazione della semantica dei riferimenti con le funzioni client/RPC e le migrazioni che popolano `ownerMemberIds`, prima di scrivere una migration forward. Nessun replay, QA o intervento Production eseguito.


### Verifica migration forward per sincronizzazione dei riferimenti proprietario — 2026-10-04

Nel tree corrente è presente `20261004102000_sync_unit_owner_refs_on_member_change.sql` (blob `c439c311ce39f70ee3a88549e6210ec179b162f0`). La migration definisce un trigger AFTER INSERT/UPDATE di `condominium_members` sulle colonne `unit_id, condominium_id, legacy_id, data`; ricalcola `ownerMemberIds` per l'unità precedente e quella nuova a partire dai membri con stesso `unit_id`, stesso condominio, `legacy_id` non nullo e ruolo `Proprietario`. Il ricalcolo evita UPDATE se il JSON risultante è già uguale e revoca EXECUTE diretto a `public, anon, authenticated`. È una risposta concreta alla lacuna di mancata rivalidazione in seguito alle modifiche del membro, mentre la migration di DELETE `20261003070000_repair_deleted_member_owner_references.sql` rimuove il legacy ID eliminato.

**Revisione statica della migration:** la logica di base è coerente con `20260930214000_repair_unit_owner_references.sql` e con l'obiettivo di rendere `condominium_members.unit_id` la relazione sorgente. Prima di considerarla pronta al rilascio restano da chiudere: (1) verifica che i membri Proprietario con `unit_id IS NULL` o legacy ID non più corrispondenti non debbano essere rappresentati nell'array; (2) verifica di compatibilità con l'ordine dei trigger e con la validazione differita `trg_validate_unit_owner_member_refs`; (3) conferma di owner, `search_path`, privilegi e comportamento SECURITY DEFINER nel database ricostruito; (4) preflight dei dati per rilevare array preesistenti incoerenti, duplicati e unità prive di membri proprietari; (5) prova che le modifiche a `data` del membro non causino riscritture collaterali o conflitti con altri trigger. Le variabili dichiarate ma non usate (`v_unit_id`, `v_condominium_id`) sono pulizia, non un blocco funzionale.

**Esito:** migration identificata e confrontata con la riparazione iniziale e il trigger di DELETE; non duplicata né riscritta. La validità semantica dei dati e l'effettiva esecuzione restano da verificare in un database isolato con schema completo. Nessuna modifica Production, replay o QA finale eseguito.


### Collegamento codice applicativo e sincronizzazione proprietari — 2026-10-04

Esaminato `src/main.tsx` (blob `7d4a901f7717101e470cfa69bc83e2a4501e9619`), in particolare il flusso di acquisizione AI e il form unità. Il flusso di creazione AI associa un proprietario già esistente tramite codice fiscale/email e aggiunge `existingMember.id` a `ownerMemberIds`, ma nel ramo del membro già esistente non verifica né aggiorna `unitId`; il nuovo membro, invece, viene creato con `unitId: target.id`. Questo può produrre una selezione UI non coincidente con la relazione membro-unità e il trigger SQL di sincronizzazione può successivamente ricalcolare l'array escludendo il membro non assegnato a quell'unità. La procedura deve distinguere “persona già esistente nel condominio” da “persona già collegata proprio a questa unità”, e richiedere una scelta esplicita o un flusso autorizzato di assegnazione quando l'unità differisce.

Il form unità espone `ownerMemberIds` come `number[]` e modifica l'array indipendentemente dalla relazione `unitId`; occorre quindi verificare il mapping persistente tra ID applicativo e `legacy_id` e allineare il salvataggio affinché una selezione di proprietario aggiorni in modo atomico la relazione membro-unità, senza sovrascrivere associazioni esistenti né compromettere comproprietari e storico. La cancellazione locale filtra il membro dall'array di tutte le unità del condominio anziché limitarsi all'unità collegata: va ristretto alla relazione effettiva una volta garantita l'identificazione dell'unità.

**Esito:** individuata una causa applicativa concreta che può riaprire la discrepanza anche in presenza della migration `20261004102000_sync_unit_owner_refs_on_member_change.sql`. La correzione va fatta insieme al mapping backend di creazione/aggiornamento membro e unità, non con una modifica isolata al trigger. Nessuna modifica a `src/main.tsx` eseguita in questa passata; Production e QA restano invariati.


### Verifica aggiuntiva del backend applicativo proprietari — 2026-10-04

Esaminato `src/lib/bethagBackend.ts` nel branch attivo. `saveCondominiumMember()` risolve `unit_id` dal codice unità (`apartment`), conserva il precedente `unit_id`, salva il membro e riallinea `ownerMemberIds` sulle unità precedente e nuova, mantenendo i dati unità e i millesimi. Questo significa che la sincronizzazione non è del tutto assente dal backend: esiste già una logica applicativa concorrente con la migration SQL `20261004102000_sync_unit_owner_refs_on_member_change.sql`. Prima di introdurre altra logica occorre evitare divergenze tra le due fonti e considerare che il salvataggio membro e l'aggiornamento delle unità sono richieste separate, non un'unica transazione applicativa garantita.

Resta invece confermato il ramo AI di `src/main.tsx`: quando trova un membro esistente, aggiunge il suo ID all'array proprietari e termina il ciclo senza invocare `saveCondominiumMemberBackend`; non verifica né aggiorna quindi l'associazione `unit_id` per quella persona. La seconda procedura AI costruisce inoltre membri localmente, per cui va verificato il relativo percorso di persistenza. Ne consegue che la correzione va concentrata sui flussi AI e sulla semantica di identità/assegnazione, non nel duplicare semplicemente il riallineamento già implementato in `saveCondominiumMember()`.

**Esito:** backend e SQL trigger confrontati con il flusso AI. La causa del disallineamento è circoscritta a un ramo AI che salta il salvataggio del membro esistente; l'eventuale riassegnazione automatica non è sicura quando la persona è già collegata a un'altra unità. Nessun codice applicativo o database modificato in questa verifica; nessun replay o QA finale eseguito.


### Correzione del matching proprietari nel flusso AI — 2026-10-04

Aggiornato `src/main.tsx` nel flusso di conferma delle unità acquisite da documenti (commit `e5d621679680e33c681000e909acef02a87c0f8d`). La ricerca di un membro esistente è ora limitata al medesimo condominio, evitando di riutilizzare per errore l'identificativo di una persona registrata in un altro condominio. Se il soggetto risulta già censito nello stesso condominio ma collegato a un'unità diversa, il flusso interrompe il salvataggio con un messaggio che richiede la verifica e l'assegnazione tramite procedura autorizzata, anziché associare silenziosamente il proprietario all'unità sbagliata o riassegnare una posizione che potrebbe avere storico.

La modifica è circoscritta al ramo AI identificato nell'analisi statica. Non certifica gli altri percorsi di creazione/aggiornamento unità e membri, non risolve eventuali discrepanze già persistite e non sostituisce la correzione del validatore SQL (m.unit_id = new.id) né il controllo dei duplicati. Nessun database è stato modificato e nessun QA runtime eseguito; resta necessario verificare in ambiente isolato il mapping degli ID applicativi/legacy e il comportamento di errore del flusso.


### Validatore forward owner refs allineato alla stessa unità — 2026-10-04

Aggiunta la migration candidata `20261004103000_validate_unit_owner_refs_same_unit.sql` (commit `d27ad04bd79bed0372cb58d2720ca7b7552caa3c`). Sostituisce il corpo di `public.validate_unit_owner_member_refs()` mantenendo il constraint trigger differito e i privilegi trigger-only; ogni riferimento deve ora risolversi a un solo membro con stesso condominio, `unit_id = new.id` e ruolo `Proprietario`. I riferimenti ripetuti nell'array sono rifiutati, mentre un array vuoto resta valido e più comproprietari distinti sono ammessi.

La migration è stata aggiunta al branch, non eseguita. Prima di qualunque rilascio resta necessario eseguire il preflight degli owner refs esistenti e il replay su baseline isolata: righe legacy incoerenti potrebbero far fallire transazioni che aggiornano le unità, e va confermato il tipo effettivo di `unit_id`, la semantica dei membri inattivi e la compatibilità con sincronizzazione member, cancellazione e subentro. Non è stato modificato Production né avviato il collaudo finale.


### Allineamento applicativo: riferimenti proprietario e unità — 2026-10-04

Confronto mirato tra `src/main.tsx` (blob `8f6dadc247d8fb8fba215082cd11410671579e09`) e le migrazioni `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) e `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`).

- Il client rappresenta `ownerMemberIds` come ID numerici legacy e `unitId` come stringa; il database collega il membro tramite `unit_id` UUID e mantiene il campo JSON come riferimento ridondante. I flussi di creazione/importazione osservati assegnano entrambi, ma il client include anche identificativi locali temporanei per le unità. È quindi necessario verificare che i percorsi di salvataggio risolvano sempre l'unità locale in un UUID persistito prima di scrivere `unit_id` o i riferimenti proprietario; un valore locale non deve mai raggiungere una colonna UUID.
- La migrazione di riparazione popola `ownerMemberIds` solo dalle relazioni con `m.unit_id=u.id`, mentre il constraint trigger attuale controlla unicamente condominio, `legacy_id` e ruolo. Le due direzioni non hanno la stessa regola di validazione: un proprietario del medesimo condominio, ma associato a un'altra unità, può soddisfare il controllo del trigger.
- La validazione è collegata a INSERT/UPDATE di `condominium_units`; il cambio successivo di `unit_id`, ruolo o `legacy_id` del membro non richiama direttamente questo trigger. Il catalogo di produzione registra altri trigger per scope, sincronizzazione legacy e portale, ma dai soli nomi non si può attestare che riallineino `ownerMemberIds` in tutti questi casi.

**Decisione tecnica per la correzione:** mantenere `condominium_members.unit_id` come relazione autorevole; trattare `ownerMemberIds` come proiezione sincronizzata e non come seconda fonte di verità. La correzione futura deve validare l'identità legacy in modo univoco e la corrispondenza esatta membro-unità, quindi aggiornare la proiezione nelle transazioni di associazione, cambio qualifica e trasferimento. I proprietari multipli/co-intestatari devono restare supportati; le unità senza proprietario non devono essere rese invalide solo per l'array vuoto. Prima di aggiungere vincoli, verificare dati preesistenti, schema UUID e comportamento dei trigger già installati. Le unità locali temporanee vanno risolte nel livello applicativo prima della persistenza.

**Esito della fase statica:** disallineamento applicazione/schema circoscritto e requisito di correzione formalizzato nel registro. Non è stata introdotta una migrazione correttiva speculativa, perché senza il corpo completo dei trigger member e senza replay isolato si rischierebbe di rompere co-proprietà, trasferimenti o record legacy. Nessuna modifica Production e nessun QA finale eseguiti.


### Verifica delle migration forward per sincronizzazione e validazione owner refs — 2026-10-04

La ricognizione dell'albero aggiornato del branch individua anche due migration già presenti: `20261004102000_sync_unit_owner_refs_on_member_change.sql` (blob `c439c311ce39f70ee3a88549e6210ec179b162f0`) e `20261004103000_validate_unit_owner_refs_same_unit.sql` (blob `1a7a442759d890bb7e3aa98161eff08436f22468`). La seconda applica il confronto esatto `m.unit_id = new.id`, verifica i riferimenti duplicati e mantiene ammessi array vuoti e comproprietari distinti. La prima ricalcola la proiezione `ownerMemberIds` per l'unità precedente e quella nuova su INSERT/UPDATE dei campi `unit_id`, `condominium_id`, `legacy_id` e `data`, filtrando i membri con ruolo `Proprietario` e scrivendo solo quando il valore cambia.

**Esito statico:** le due migration sono coerenti sul principio che `condominium_members.unit_id` è la relazione autorevole e `ownerMemberIds` una proiezione; il loro ordine nominale colloca la sincronizzazione prima del validatore più restrittivo. Restano punti da verificare prima del rilascio: il trigger AFTER sul membro aggiorna la riga unità e quindi attiva il constraint trigger differito; occorre confermare in replay che la transazione validi lo stato finale senza ricorsioni o conflitti con gli altri trigger. Vanno inoltre controllati i tipi e la serializzazione di `legacy_id`, l'eventuale esistenza di ID duplicati, le modifiche a membri inattivi, e il caso in cui l'unità precedente sia già stata eliminata o trasformata. La sincronizzazione non ricostruisce automaticamente dati legacy che non abbiano un `unit_id` valido; il preflight dati resta necessario.

Le migration sono presenti nel branch, ma questa verifica non dimostra che siano state applicate al database remoto. Nessun replay, modifica Production o collaudo finale è stato eseguito. La fase di riconciliazione documentale del flusso owner-reference è aggiornata; la verifica operativa rimane subordinata a una baseline isolata e completa.


### Allineamento client/backend della proiezione proprietari — 2026-10-04

Esaminato `src/lib/bethagBackend.ts` (versione precedente al commit di correzione): `saveCondominiumMember` persiste il membro tramite upsert, poi esegueva una seconda sincronizzazione client-side di `ownerMemberIds` sulle unità precedente e nuova. Il branch contiene già la migration `20261004102000_sync_unit_owner_refs_on_member_change.sql`, che svolge questa sincronizzazione con trigger database sugli INSERT/UPDATE dei membri, e `20261004103000_validate_unit_owner_refs_same_unit.sql`, che valida i riferimenti sull'unità.

È stata quindi rimossa da `saveCondominiumMember` la seconda scrittura client-side: il trigger database resta l'unico sincronizzatore della proiezione, mentre il client conserva l'upsert dell'anagrafica e il flusso di aggiornamento portale. Questo evita di riscrivere dal client un JSON unità appena aggiornato dal database e riduce il rischio di sovrascrivere campi concorrenti. Il client continua a passare il ruolo applicativo in `data`; la colonna SQL `role` è invece valorizzata a `resident` come categoria di accesso, perciò il filtro proprietario nel trigger continua a leggere `data->>'role'`, coerentemente con il mapping attuale.

**Commit applicativo:** `84745d80b7818443c1ba8acc22b04e68f329f0a2`. Modifica statica al file; non sono stati eseguiti build, replay SQL, test runtime, deploy o modifiche Production. L'effettiva coerenza operativa dipende dall'applicazione della migration di sincronizzazione nel database di destinazione e resta da verificare nella fase finale di collaudo.


### Verifica CI della modifica applicativa — 2026-10-04

Il commit applicativo `84745d80b7818443c1ba8acc22b04e68f329f0a2` è associato al workflow GitHub Actions `BETHAG build`, run `37208045829`, concluso con esito `success`. Il PR #13 risulta ancora aperto verso `main`; il workflow di build non equivale al collaudo funzionale o al replay delle migration. La modifica client è quindi verificata dal build CI, ma non ancora certificata a runtime.


### Allineamento validatore proprietari e flusso membro-unità — 2026-10-04

Confronto diretto delle migrazioni `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) e `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`): la riparazione ricostruisce `ownerMemberIds` esclusivamente da membri con `m.unit_id = u.id`, stesso condominio, `legacy_id` non nullo e ruolo `Proprietario`; il validatore successivo controlla soltanto condominio, `legacy_id` e ruolo, non l'unità collegata. Quindi i due passaggi non applicano la stessa regola di integrità.

**Esito della fase di confronto:** discrepanza confermata e registrata; non modificare la migrazione storica già applicata. La correzione forward dovrà rendere coerente la regola di proprietà con `unit_id`, ma prima deve preservare le posizioni legacy prive di `unit_id`, i comproprietari e i trasferimenti con storico. Inoltre il trigger attuale è sulla tabella `condominium_units`: un aggiornamento successivo del membro a `unit_id` o ruolo non provoca da solo la rivalidazione del JSON dell'unità. La presenza di trigger member-side per scope, sincronizzazione legacy, storico finanziario e portale è documentata nel catalogo recuperato, ma non sostituisce questa sincronizzazione dei riferimenti proprietario.

Non è stata creata una migrazione eseguibile né effettuata alcuna modifica al database: i dati attuali e i flussi effettivamente distribuiti non sono disponibili per stabilire in sicurezza il trattamento delle associazioni legacy. La fase statica di confronto è conclusa; resta bloccata la remediation SQL fino a verifica del catalogo e dei dati in ambiente isolato. QA complessivo resta rinviato al termine della risoluzione.


### Revisione delle due migrazioni forward per owner refs — 2026-10-04

Sono state reperite e confrontate le candidate già presenti nel branch:
- `20261004102000_sync_unit_owner_refs_on_member_change.sql` (blob `c439c311ce39f70ee3a88549e6210ec179b162f0`): ricalcola l'array per l'unità precedente e quella nuova dopo INSERT/UPDATE di `unit_id`, `condominium_id`, `legacy_id` o `data`; conserva i comproprietari aggregando tutti i membri qualificati collegati alla stessa unità.
- `20261004103000_validate_unit_owner_refs_same_unit.sql` (blob `1a7a442759d890bb7e3aa98161eff08436f22468`): impone corrispondenza di condominio, `unit_id`, `legacy_id` e ruolo per ogni riferimento JSON e rifiuta riferimenti duplicati; mantiene ammissibile l'array vuoto.

La coppia affronta la discrepanza individuata senza riscrivere le migrazioni storiche. **Rimangono precondizioni da chiudere prima dell'esecuzione:** (1) verificare se il ruolo autorevole sia sempre `data->>'role'` o se esistano righe in cui il ruolo è nella colonna `role`; (2) identificare e bonificare in ambiente isolato i riferimenti legacy a membri senza `unit_id`, perché la nuova validazione li respingerebbe; (3) verificare che il trigger esistente di pulizia su DELETE copra i casi di legacy ID nullo e riferimenti storici; (4) verificare ordinamento/deferrabilità dei trigger e il comportamento con unità non proprietarie, pertinenze e trasferimenti. La sincronizzazione non intercetta DELETE direttamente, affidandosi al trigger separato `trg_clean_deleted_member_owner_references`.

**Esito:** candidate SQL presenti e logicamente coerenti per i normali casi INSERT/UPDATE e comproprietà, ma non ancora approvate per replay pulito o applicazione ai dati esistenti. Nessun SQL è stato eseguito; nessuna modifica a Production e nessun collaudo finale sono stati effettuati.


### Verifica migrazione di riparazione owner refs — 2026-10-04

Confrontati i sorgenti effettivi `20260930214000_repair_unit_owner_references.sql` (blob `247f9d31c26203464a870fe37ff60a9d9caf91c1`) e `20260930215000_validate_unit_owner_member_refs.sql` (blob `428e91a190fde962cfe457572f48924a075a77f6`). La riparazione ricostruisce `ownerMemberIds` dalla relazione autorevole `condominium_members.unit_id`, ma aggiorna soltanto le unità per cui trova almeno un membro con ruolo `Proprietario`: non svuota eventuali riferimenti obsoleti su unità senza proprietari validi. La validazione successiva controlla che ciascun legacy ID identifichi esattamente un proprietario nello stesso condominio, ma non impone la corrispondenza `m.unit_id = new.id`. Quindi il controllo non dimostra che il proprietario appartenga proprio all'unità che lo dichiara.

Correzione da preparare come migrazione forward-only, senza riscrivere gli script storici: definire una strategia esplicita per riferimenti obsoleti e unità senza proprietari, allineare la validazione alla relazione membro-unità e coprire anche modifiche successive di `unit_id`, `legacy_id`, `condominium_id` e ruolo. Prima di applicarla, serve preflight sui dati per distinguere unità legittimamente prive di proprietario, comproprietari e riferimenti legacy orfani; l'operazione va resa transazionale e compatibile con i trigger di storico contabile, trasferimento e sincronizzazione già rilevati. Non è stato creato né eseguito SQL correttivo perché il catalogo/dataset corrente non è disponibile per il preflight e il replay isolato.


### Riallineamento flusso applicativo membri-unità — 2026-10-04

Confrontato `src/main.tsx` (blob `8f6dadc247d8fb8fba215082cd11410671579e09`) con `src/lib/bethagBackend.ts` (blob `9c74a3209e139d6d4b3e919930f213b634a0f6f3`) e con le due candidate SQL owner-ref già presenti. Il salvataggio puntuale del membro risolve `unit_id` dal codice testuale `apartment`, mentre la sincronizzazione generale ricostruisce `unit_id` anch'esso da `apartment` e non dà precedenza al `unitId` già strutturato nell'oggetto. La rinumerazione di unità aggiorna il campo `apartment` dei membri collegati, ma resta da proteggere il caso di anagrafica con `unitId` valido e `apartment` vuoto/non corrispondente. È una possibile divergenza tra relazione strutturata e dato legacy.

Il caricamento backend calcola proprietari collegati da `condominium_members.unit_id`, ma unisce tale lista ai valori già salvati in `condominium_units.data.ownerMemberIds` senza scartare i riferimenti obsoleti. La UI poi usa l'array JSON per visualizzare proprietari, quindi riferimenti legacy non validi possono restare visibili fino a una riconciliazione. Il salvataggio puntuale del membro delega correttamente al trigger DB la proiezione JSON; la sincronizzazione generale e la cancellazione hanno inoltre percorsi distinti da tenere coerenti.

**Correzione applicativa da integrare:** preferire l'ID unità strutturato quando è presente e verificato nello stesso condominio; usare `apartment` solo come fallback di migrazione/compatibilità; dopo il salvataggio ricaricare o ricalcolare la proiezione proprietari dalla relazione autorevole, senza conservare ID JSON non risolti. La logica deve rispettare l'eventuale appartenenza a più unità soltanto se il modello dati la supporta esplicitamente, e non deve spostare posizioni con storico fuori dal flusso di subentro. Le candidate SQL `20261004102000` e `20261004103000` già considerate sono coerenti col principio, ma non sostituiscono l'allineamento del client.

Questa è una verifica statica dei sorgenti; non sono state modificate le funzioni applicative né eseguiti replay, scritture DB o QA runtime. La correzione client va applicata come modifica coordinata, seguita da build e collaudo finale solo dopo la risoluzione delle altre discrepanze.


## Reconciliation refresh — 2026-10-04

This section supersedes the earlier pending-content table above, which listed only two files and is now incomplete. A fresh inventory found 154 SQL files in the branch and 177 migration-history records in production. Production's latest recorded version is `20261003050722`. The following 25 branch files have later filename versions and are not recorded in production history:

| Branch version | Repository file | Deployment status |
|---|---|---|
| `20261003052000` | `20261003052000_expose_captured_transfer_snapshot.sql` | Pending |
| `20261003060000` | `20261003060000_expand_member_transfer_preview_installments.sql` | Pending |
| `20261003061000` | `20261003061000_preserve_future_installments_transfer_snapshot.sql` | Pending |
| `20261003062000` | `20261003062000_include_unit_unassigned_installments_in_transfer.sql` | Pending |
| `20261003063000` | `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql` | Pending |
| `20261003064000` | `20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql` | Pending |
| `20261003070000` | `20261003070000_repair_deleted_member_owner_references.sql` | Trigger/function present in live schema; history record absent — reconcile before any replay |
| `20261003071000` | `20261003071000_block_transfer_close_with_unassigned_installments.sql` | Pending |
| `20261003072000` | `20261003072000_capture_transfer_unit_expenses.sql` | Pending |
| `20261003073000` | `20261003073000_scope_transfer_unit_expenses.sql` | Pending |
| `20261003074000` | `20261003074000_scope_extraordinary_transfer_allocations.sql` | Pending |
| `20261003075000` | `20261003075000_scope_transfer_installment_queries.sql` | Pending |
| `20261003076000` | `20261003076000_scope_transfer_allocation_totals.sql` | Pending |
| `20261003077000` | `20261003077000_scope_preview_extraordinary_allocations.sql` | Pending |
| `20261003078000` | `20261003078000_scope_snapshot_installment_totals.sql` | Pending |
| `20261003079000` | `20261003079000_scope_transfer_close_financial_positions.sql` | Pending |
| `20261003080000` | `20261003080000_harden_member_delete_financial_history.sql` | Pending |
| `20261003080100` | `20261003080100_scope_transfer_confirmation_snapshot.sql` | Pending |
| `20261004090000` | `20261004090000_fix_member_transfer_status_constraint.sql` | Pending |
| `20261004091000` | `20261004091000_preserve_outgoing_current_owner_flag.sql` | Pending |
| `20261004092000` | `20261004092000_reject_empty_installment_percentages.sql` | Pending |
| `20261004100000` | `20261004100000_allow_installment_overpayment_movements.sql` | Pending |
| `20261004101000` | `20261004101000_route_public_carryovers_to_hardened_function.sql` | Pending |
| `20261004102000` | `20261004102000_sync_unit_owner_refs_on_member_change.sql` | Pending |
| `20261004103000` | `20261004103000_validate_unit_owner_refs_same_unit.sql` | Pending |

The production history contains 177 records while the branch contains 154 migration files; these are not a one-to-one replay set. Historical version/name differences and missing filename matches must be reconciled by comparing SQL contents and live schema, not by rewriting history or blindly replaying old migrations. This inventory is not authorization to deploy. Production was queried read-only; no migration was applied in this refresh.


### Live-schema exception — owner cleanup

A read-only inspection of production on 2026-10-04 found the trigger `trg_clean_deleted_member_owner_references` and function `public.clean_deleted_member_owner_references()` installed on `public.condominium_members`. The function definition matches the branch migration `20261003070000_repair_deleted_member_owner_references.sql`, while the production migration ledger has no matching version/name entry. This is schema/history drift: do not replay this migration or fabricate a history row until the deployment origin and complete definition/dependencies are reconciled. The application deletion path now delegates cleanup to this database trigger, so this live-schema presence is a prerequisite that must be addressed explicitly before rollout to any environment lacking the trigger.

### Unit-reference client alignment — 2026-10-04

Updated `src/lib/bethagBackend.ts` in commits `8efc4e89`, `17b45362`, and `48f1bb2b`:

- Bulk member synchronization now resolves a valid structured `unitId` against units loaded for that member's condominium before falling back to the legacy `apartment` code.
- Member save validates `unitId` against the same condominium, falls back to the normalized legacy code for older records, and persists the canonical unit code and resolved ID in the member JSON/column. A stale or cross-condominium ID cannot be used to attach the member elsewhere.
- Unit hydration now projects owner IDs from the authoritative member `unit_id` relation and condominium role, instead of unioning those IDs with potentially stale JSON-only references.

The edits were fetched back from the branch and their key code paths verified statically. No runtime build result is available for the latest commit yet; no production data was written and no migration was applied.

### Member deletion guard — live function is behind the branch candidate

A read-only comparison of production `public.prevent_member_delete_with_financial_history()` with `20261003080000_harden_member_delete_financial_history.sql` found that the live trigger function checks installments, expense allocations, and fiscal carryovers, but does not check `condominium_ledger_entries` or `condominium_member_transfers`. The branch candidate adds both checks and uses `SECURITY DEFINER` with an empty `search_path`, retaining a trigger-only execution model. Production already has the `BEFORE DELETE` trigger, so applying the candidate should replace the function behind that trigger; do not drop or bypass the protection. Until this migration is safely reconciled and deployed through the approved migration process, member deletion protection in production is incomplete for those two history sources. The application must continue treating deletion as blocked/unsafe where accounting or transfer history may exist.

### Transfer-confirmation snapshot scope — live definition remains unscoped

Read-only inspection of production `private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)` confirms that the accounting snapshot still aggregates installments and expense allocations without explicit `workspace_id` and `condominium_id` predicates. Candidate migration `20261003080100_scope_transfer_confirmation_snapshot.sql` adds both tenant and condominium scope to the three installment totals and the allocations total, while retaining unit-unassigned installments linked to the transferred unit. The migration uses exact single-occurrence source anchors and aborts on missing, duplicate, or mixed anchors; this is safer than an unguarded textual replacement, but the production function's full anchor-count preflight has not yet been independently validated against every fragment. Treat this as an outstanding production schema/function drift item; do not apply in production without controlled migration review and backup/rollback planning.


### Incomplete tenant scoping in transfer-confirmation snapshot candidate — 2026-10-04

A closer read of the live `private.confirm_condominium_member_transfer(...)` body and candidate `20261003080100_scope_transfer_confirmation_snapshot.sql` shows that the candidate scopes only four aggregates (three historical installment totals and the historical allocation total). Other snapshot readers in the same function remain unscoped in both the live definition and the candidate: `installments_after`, `outstanding_total`, `outstanding_due_after`, `unit_unassigned_carryovers`, and the extraordinary-allocation snapshot joined to ledger entries. The candidate therefore does not yet establish tenant/condominium isolation for the complete persisted accounting snapshot, despite guarding its four selected replacement anchors.

**Required correction:** extend the forward migration to scope every snapshot read consistently to the locked unit's `v_workspace` and `v_condominium`, including joined ledger rows where the schema supports those keys; preserve the intentional unit-unassigned installment/carryover semantics. Before editing the replacement arrays, verify the relevant table columns and exact live source fragments, then assert each old/new anchor's occurrence count in a read-only preflight. The current migration is not approved for production application. No SQL writes or migrations were executed, and final QA remains deferred.


### Follow-up correction to transfer snapshot migration (2026-10-04)

The previous edit of `20261003080100_scope_transfer_confirmation_snapshot.sql` was found malformed on fetch-back and has been replaced in full. The rebuilt candidate now defines nine old/new SQL anchors: three historical installment aggregates, the pre-transfer allocation aggregate, future installment snapshot, two outstanding totals, unit-unassigned carryovers, and extraordinary allocations with tenant predicates on both allocations and ledger entries. The committed file was fetched back and matched byte-for-byte with the intended content; nine old-anchor delimiters were present. The migration includes an explicit nine-anchor cardinality check and aborts if any source fragment is missing, duplicated, or already mixed. The full exact-fragment counts against production and isolated replay are still pending; do not apply this migration to production yet. No production writes were performed.


A subsequent dependency review found that migration `20261003076000_scope_transfer_allocation_totals.sql` scopes the extraordinary-allocation predicate before `20261003080100` runs. The latter's expected source anchor has therefore been adjusted to match that intermediate state and add the ledger tenant predicates. The updated migration was fetched back and verified byte-for-byte. Exact production fragment preflight and isolated replay remain outstanding; production was not modified.


### Dependency-order anchor correction (2026-10-04)

The transfer confirmation snapshot migration's source anchors now reflect the intermediate tenant-scoped state introduced by `20261003074000_scope_extraordinary_transfer_allocations.sql` and `20261003075000_scope_transfer_installment_queries.sql`. The extraordinary-allocation anchor was normalized to the exact single-line SQL emitted by the earlier migration, including workspace and condominium predicates on both allocation and ledger rows. The revised migration was fetched back and verified byte-for-byte. This is static source verification only; exact live source comparison and isolated ordered replay are still required before deployment.


Further ordered-source inspection (2026-10-04): `20261003050000_preserve_transfer_extraordinary_allocations.sql` inserts the extraordinary-allocation reader with multiline tenant predicates already present. Consequently, the later `20261003080100_scope_transfer_confirmation_snapshot.sql` must validate that exact intermediate predicate rather than search for a flattened one-line variant. Its ninth anchor has been changed to the exact multiline tenant predicate emitted by the earlier migration; the first eight anchors explicitly accept the already tenant-scoped intermediate state. The migration file was fetched back and matched byte-for-byte. This resolves a statically identified ordered-anchor mismatch; isolated replay and live exact-source preflight remain pending.


Production-source comparison (read-only, 2026-10-04): the live `private.confirm_condominium_member_transfer` has the extraordinary snapshot key once, but its allocation and ledger predicates are still unscoped (`a.member_id=p_outgoing_member_id` and `l.expense_type...`). The 0740 migration previously treated any existing snapshot key as evidence that both tenant scopes were already present and would stop on this live state. The guard is now fail-closed but repairs this exact multiline unscoped state, while accepting only the exact fully scoped state idempotently; source file fetched back byte-identically. Production remains unchanged. Re-run the complete ordered migration sequence in an isolated database before deployment.


Additional migration-chain correction (2026-10-04): production's live confirmation function also retains the unit-unassigned carryover JSON reader from the earlier migration without workspace/condominium predicates. The old-state anchor in `20261003080100_scope_transfer_confirmation_snapshot.sql` now matches that exact unscoped reader, while the replacement remains tenant-scoped. The edit was fetched back and verified byte-identically. A read-only JavaScript simulation of the 0740 extraordinary-reader repair against the live function matched its exact multiline anchor once and produced one fully scoped reader with each of the four tenant predicates exactly once. This is a static string-level simulation only, not a PostgreSQL replay or production change; isolated ordered replay remains required.


Ordered anchor simulation update (2026-10-04): the `20261003080100_scope_transfer_confirmation_snapshot.sql` old/new arrays had diverged (the old array's carryover reader was malformed/missing as a distinct entry). Both arrays are now reconstructed with nine paired entries, fetched back byte-identically, and checked against the read-only live function. A string-level simulation of the ordered 0740 → 0750 → 0760 → 0780 → 0790 → 0801 transformations matched the expected live anchors: 0740 extraordinary reader 1; 0750 installment predicates 6 in confirmation and 7 in preview; 0760 outgoing allocation predicates 1 remaining in confirmation and 2 in preview; 0790 close checks 1 each; and 0801 paired arrays 9/9, with all nine final replacement fragments occurring once. This simulation does not parse or execute PostgreSQL and does not validate schema dependencies or runtime behavior. Full isolated replay and CI remain outstanding; production has not been changed.


### Read-only schema inventory across Supabase environments — 2026-10-04

A direct `information_schema.columns` inventory confirms that production and `bethag-develop` both contain `portal_access` and `condominium_units`, with matching visible column sets for those tables; neither has a `unit_label` column. The production unit table includes `id, workspace_id, condominium_id, legacy_id, unit_code, data, created_at, updated_at, building_code, lifecycle_status, lifecycle_effective_date, superseded_at`. `bethag-develop` has the same unit columns and portal-access columns, but does not yet contain the transfer confirmation function. The `member-transfer-qa` branch has `portal_access` but no `condominium_units` or transfer confirmation function. The `migration-reconciliation-qa` branch has neither table nor the transfer function. These are catalog observations only; no schema writes were made.

The proposed unit baseline files `20261001141530_restore_condominium_units_base.sql` and `20261001141559_complete_condominium_units.sql` were not retrievable from the checked PR head, and GitHub code search did not locate them. They must be recovered from the authoritative repository revision or the exact deployed migration source before attempting a faithful ordered replay. Do not substitute guessed DDL or reset the existing QA branches, as their untracked schema/data could be lost.


### Recovery-source discovery — 2026-10-04

The previous note that the unit table definition was unrecoverable is refined: the repository's read-only production catalog snapshot `docs/recovery/production_public_tables_snapshot.sql` contains the exact production `CREATE TABLE public.condominium_units` and `CREATE TABLE public.portal_access` definitions, including their captured columns, constraints, and foreign keys. This is a recovery snapshot, not an ordered migration, and it contains a deferred constraint-trigger catalog representation; it must not be replayed as standalone DDL without reconstructing trigger/function, RLS, grants, indexes, and prerequisite table order. The migration directory on both `main` and the working branch contains `20260929165000_complete_condominium_units.sql`, which assumes `public.condominium_units` already exists and only normalizes/completes unit rows; no separate table-creation migration was found in the current directory listing. The missing base migration source is therefore not present under the previously queried filenames, but its deployed table shape is recoverable from the catalog snapshot. No new baseline DDL was generated or applied; exact historical migration provenance and safe isolated replay remain open.


### Unit-table security and index dependencies — 2026-10-04

Read-only inspection of the production catalog confirms four indexes on `public.condominium_units`: `condominium_units_building_code_idx(workspace_id, condominium_id, building_code)`, `condominium_units_code_lookup_idx(condominium_id, unit_code)`, `condominium_units_condominium_idx(condominium_id)`, and `condominium_units_workspace_idx(workspace_id)`. RLS is enabled and the table has four policies: manager-only insert, update, and delete using `private.can_manage_workspace_module(..., 'condomini')`; read permits authorized workspace-module access or qualifying active resident/council portal access joined to an active member assigned to that unit and a non-archived condominium. This policy depends on `portal_access`, `condominium_members.unit_id`, `condominiums.archived_at`, and private workspace authorization helpers. These exact live predicates and index definitions should be retained when reconstructing a baseline. The inventory is observational only; no policy, index, table, or data was changed.


### Extended production inventory for condominium_units — 2026-10-04

A further read-only catalog inspection expanded the earlier index inventory. In addition to the four non-unique indexes, production has three overlapping unique indexes on normalized unit codes: `condominium_units_code_building_uq(condominium_id, lower(btrim(building_code)), lower(btrim(unit_code)))`, `condominium_units_condominium_unit_code_normalized_uidx(condominium_id, lower(unit_code))`, and `condominium_units_unique_unit(condominium_id, lower(btrim(unit_code)))`. These definitions are not interchangeable when `building_code` is populated; preserve the exact live definitions and verify existing duplicate data before attempting to consolidate them. The primary-key index is also present.

Production additionally has these non-internal triggers on `public.condominium_units`: `prevent_condominium_unit_delete_with_financial_data`, `prevent_condominium_unit_delete_with_members`, `require_confirmed_genealogy_for_unit_lifecycle_trg`, `trg_clear_member_unit_legacy_on_unit_delete`, `trg_ensure_unit_millesimal_values`, `trg_guard_unit_scope_changes`, `trg_prevent_archived_condominium_mutation`, `trg_prevent_financial_unit_delete`, `trg_prevent_unsafe_condominium_unit_delete`, `trg_validate_condominium_unit_relationship`, `trg_validate_unit_owner_member_refs`, and `trg_validate_unit_workspace_scope`. The catalog confirms several overlapping delete guards; they must be traced to their defining migrations and compared for intentional compatibility before any cleanup. Their live function bodies were retrieved read-only; they depend on unit/member relations, financial allocations/installments, condominium archive state, cadastral transformation tables, and millesimal tables/values. No production changes were made.

**Baseline decision:** the production snapshot is sufficient to recover the table's column/constraint outline and catalog metadata, but not to produce a safe standalone replay migration by itself. The migration history must still establish the prerequisite tables/functions in dependency order and reconcile overlapping constraints, indexes, triggers and RLS policies. Do not synthesize a production repair from the snapshot alone.


### Migration-source trace for unit guards — 2026-10-04

Compared the available branch migrations with the live trigger inventory. The repository explicitly defines `trg_validate_condominium_unit_relationship` in `20260930184500_validate_unit_pertinence_relationship.sql`, `trg_prevent_unsafe_condominium_unit_delete` in `20260930191500_harden_unit_delete_integrity.sql`, `trg_guard_unit_scope_changes` in `20260930211000_guard_unit_scope_changes.sql`, `trg_validate_unit_workspace_scope` in `20260930510000_harden_unit_workspace_scope.sql`, and `trg_ensure_unit_millesimal_values` in `20260930180000_ensure_millesimal_rows_for_units.sql`. The production catalog also reports two separate financial-delete guards and a member-delete guard, as well as a legacy-field cleanup trigger; their defining migrations were not located in the currently listed branch migration directory. This is schema-history drift, not proof those triggers should be dropped: retain them in the compatibility inventory until their provenance and intent are reconciled. The cadastral lifecycle trigger is linked to `20261001095000_add_unit_cadastral_transformations.sql`, while its enforcement function and exact trigger wiring must be verified against the later lifecycle migrations.

The unit migration chain therefore remains **not ready for a clean replay**: the missing base-table migration and unresolved live-only trigger/index artifacts prevent a defensible ordered baseline. Existing branch migrations were inspected, but no SQL was executed against production and no QA reset was performed.


### Unit visibility policy versus archive-state migration — 2026-10-04

Source review of `20260930550000_harden_archived_condominium_visibility.sql` shows that its unit/member/portal visibility predicates use `condominiums.data->>'archivedAt'`. The live production unit-read policy inventory previously captured in this reconciliation uses `condominiums.archived_at`. These are materially different schema contracts: do not replay or copy the migration's policy verbatim into a baseline until the canonical archive field and data backfill are established. The live trigger `trg_prevent_archived_condominium_mutation` also depends on `archived_at`, while the earlier migration comment explicitly describes `data.archivedAt`; this is a concrete archive-state drift to resolve across application reads/writes, policy predicates, and trigger logic.

The available `20260929165000_complete_condominium_units.sql` confirms it is a data-repair/completion migration, not a table-creation baseline: it updates condominium unit counts, normalizes legacy unit codes, inserts missing units, and creates one lookup index while assuming both `condominiums` and `condominium_units` already exist. The later millesimal migration similarly assumes unit and millesimal tables are present. This confirms that a fresh replay needs an earlier canonical base-schema source rather than treating these completion migrations as creators. No schema or data was changed in production.


### Live lifecycle and unit-delete guard reconciliation — 2026-10-04

A read-only comparison of production trigger definitions with the branch migration directory found an additional provenance gap. Production has `require_confirmed_genealogy_for_unit_lifecycle_trg` on `condominium_units`, backed by `require_confirmed_genealogy_for_unit_lifecycle()`. The function rejects reactivation except for the `postgres` execution context, only permits an active unit to become `Storica` or `Soppressa`, and requires a matching `Confermata` source transformation in the same condominium/workspace with an identical effective date. The branch migration `20261001095000_add_unit_cadastral_transformations.sql` adds lifecycle columns and transformation tables, but does not define this enforcement function or attach this trigger; the follow-on `20261001102100_unit_transformation_snapshots.sql` only adds snapshot/count columns. GitHub code search for the exact function name and related delete-guard function names returned no matching branch files. Thus the live lifecycle enforcement is not reproducibly represented in the current migration chain, despite its dependency on those transformation tables.

Production also has three distinct BEFORE DELETE financial/member guards on `condominium_units`: `prevent_condominium_unit_delete_with_financial_data` checks allocations and installments by `unit_id`; `trg_prevent_financial_unit_delete` checks the same records scoped by workspace and condominium; and `trg_prevent_unsafe_condominium_unit_delete` repeats those scoped financial checks while additionally blocking assigned members and child pertinences. A separate `prevent_condominium_unit_delete_with_members` trigger blocks members, and `trg_clear_member_unit_legacy_on_unit_delete` cleans legacy member fields after deletion. The branch contains the broader unsafe guard in `20260930191500_harden_unit_delete_integrity.sql`, but the other live guard definitions were not found in the current migration directory. The guards overlap, but differ in predicates and error behavior; do not remove them solely as duplicates. First establish whether all are intended, whether their checks are valid under RLS, and which single canonical enforcement path should be retained in a clean baseline.

**Reconciliation outcome:** live lifecycle validation and multiple unit-delete guards remain unrepresented or incompletely sourced in the branch history. The branch migration chain is not yet independently replayable for these behaviors. This is a provenance/schema-history finding only: no production DDL or data was changed, and no end-to-end QA was run.


### Forward migration added for lifecycle genealogy guard — 2026-10-04

Added `20261004104000_restore_unit_lifecycle_genealogy_guard.sql` to the reconciliation branch. It restores the production `require_confirmed_genealogy_for_unit_lifecycle()` function and its `BEFORE UPDATE OF lifecycle_status, lifecycle_effective_date` trigger after the cadastral transformation schema has been introduced. The migration uses `CREATE OR REPLACE FUNCTION`, drops the named trigger if present before recreating it, and revokes direct execution from `public`, `anon`, and `authenticated`; this records the observed production guard in forward history without applying it to production.

This closes the identified source-history gap for the lifecycle guard in the branch. It does not establish clean-replay readiness: base-schema provenance, archive-state contract drift, and the remaining live-only/overlapping unit-delete guards still require reconciliation. No production SQL was run and full QA remains deferred until the known migration and application issues are resolved.


### Forward migration added for remaining live unit-delete guards — 2026-10-04

Added `20261004105000_restore_unit_delete_legacy_guards.sql` to recreate the three additional production trigger/function pairs observed in the read-only catalog: `prevent_condominium_unit_delete_with_financial_data`, `prevent_condominium_unit_delete_with_members`, and `trg_clear_member_unit_legacy_on_unit_delete`. The migration deliberately preserves them as separate guards rather than collapsing them into `prevent_unsafe_condominium_unit_delete`, because the production catalog confirms distinct live trigger definitions and the historical rationale for their overlap is not established. The known scoped financial guard `trg_prevent_financial_unit_delete` is defined in `20260929230529_harden_accounting_delete_and_allocation_scope.sql`; the broader scoped member/pertinence/financial guard is defined in `20260930191500_harden_unit_delete_integrity.sql`. This narrows the provenance gap but does not resolve whether all overlapping checks should remain in a future canonical baseline.

The migration was committed to the reconciliation branch and its file presence is verified. It has not been applied to production or validated by a PostgreSQL replay. Its dependencies include `condominium_units`, `condominium_members`, `condominium_expense_allocations`, and `condominium_installments`, so the missing canonical base schema and replay ordering remain blockers to full migration validation.


### Unit-delete guard privilege and archive predicate review — 2026-10-04

A further read-only production catalog check confirmed all five live `BEFORE DELETE` unit guards are enabled and execute as `SECURITY INVOKER`, not `SECURITY DEFINER`. The two legacy financial/member functions have an explicit `PUBLIC` execute ACL in production (inherited by authenticated roles); the broader unsafe guard has execute limited to postgres/service_role. The AFTER DELETE legacy cleanup function is also invoker and has execute limited to postgres/service_role. Trigger execution is distinct from direct function invocation; preserve the trigger bindings and ACLs as observed, and review direct-call exposure separately rather than changing privileges as a side effect of restoring triggers. Manager DELETE policy and manager SELECT policy are dependencies for invoker-side row checks under RLS; verify these together in isolated replay before consolidating guards.

The archive visibility migration itself explicitly documents `condominiums.data.archivedAt` as its then-current application contract and uses that JSON predicate across resident/portal visibility. The live production mutation trigger and current policy inventory use the typed `condominiums.archived_at` column. Branch-wide GitHub search did not provide an authoritative current application source to establish a safe canonical conversion, so no replacement archive policy migration was authored. Next reconciliation must establish application read/write shape and backfill semantics before changing either predicate; otherwise a migration could unintentionally re-expose archived condominiums or hide active ones.

These checks are catalog/source inspection only. No production data/schema was changed, no branch QA reset was performed, and no full replay or end-to-end QA was run.


### ACL parity correction for restored unit-delete guards — 2026-10-04

After comparing the live `proacl` values with the forward migration, corrected `20261004105000_restore_unit_delete_legacy_guards.sql` to preserve observed privilege parity: the two BEFORE DELETE guard functions retain EXECUTE for PUBLIC, authenticated, and service_role (matching production's effective/public ACL), while the AFTER DELETE legacy cleanup function is restricted to service_role and the database owner context. These are SECURITY INVOKER trigger functions; trigger invocation is not a reason to broaden direct execution. The updated migration file was fetched back and verified. This is an ACL/source-alignment correction only, not a production change.


### Duplicate early condominium-delete RPC migration — 2026-10-04

Source review confirms `20260928070000_save_condominium_rpc.sql` also defines `public.delete_condominium(uuid,bigint)`, while the immediately following `20260928081000_delete_condominium_rpc.sql` defines the same signature and materially equivalent authorization/deletion sequence again. Both are `CREATE OR REPLACE` with the same grants, so this is a redundant redefinition rather than two distinct runtime RPCs; the later migration is the effective definition after ordered replay. Keep both historical files immutable to avoid changing checksums/ledger expectations. A future squashed baseline should include one canonical definition only, after the delete semantics are checked against later financial-history and archive protections; the early RPC performs broad child deletion and must not be treated as the safe unit/condominium deletion contract without that review.


### Portal-access policy/function ordering dependency — 2026-10-04

Review of the early migration sequence confirms that `20260928090000_collaborator_module_write_permissions.sql` drops/recreates the policy on `public.portal_access`, and `20260928093000_align_portal_request_access.sql` defines resident-access predicates that query `public.portal_access`. The later `20260928153246_add_portal_access_unique_identity.sql` only creates a unique index on that table; it does not create the table. Thus these early migrations require `portal_access` to have been created by an earlier schema migration or pre-existing baseline. The inspected workflow migration `20260928153242_add_condomino_registration_workflow.sql` is not evidence of that base table merely by its filename. Preserve the historical migrations; reconcile the missing table-creation provenance and replay prerequisite before treating the directory as a clean-install sequence. Source inspection only; no production SQL was executed and no QA replay was run.


## Verifica dei controlli automatici disponibili — 2026-10-04

Esaminati `package.json` e i workflow `.github/workflows/build.yml`, `main.yml` e `deploy.yml` nel branch operativo. Gli script npm dichiarano soltanto `dev`, `build` e `preview`; i workflow eseguono installazione dipendenze e `npm run build`, mentre il workflow di deploy costruisce `dist` e lo pubblica su GitHub Pages al push su `main`. Non risultano step configurati per replay SQL, lint/parse delle migrazioni, pgTAP o test runtime Supabase. Il file `supabase/tests/rls_policies.test.sql` contiene asserzioni catalogo/privilegi, ma non è richiamato dai workflow esaminati. Di conseguenza, il check GitHub `build: success` conferma la compilazione frontend soltanto e non certifica schema, ordine delle migrazioni, RLS effettiva o flussi contabili. Questa è una verifica statica della configurazione CI, non esecuzione QA; il collaudo resta differito al completamento delle correzioni. Nessuna modifica a workflow, database o produzione è stata eseguita.


### Dipendenze anticipate nelle prime migrazioni — 2026-10-04

La lettura diretta dei sorgenti SQL conferma un secondo vincolo di ordine oltre alla disponibilità di `portal_access`:

- `20260928070000_save_condominium_rpc.sql` crea `public.save_condominium(...)` e invoca `private.can_manage_workspace_module(uuid,text)` nel controllo autorizzativo.
- La definizione di `private.can_manage_workspace_module(uuid,text)` compare soltanto in `20260928090000_collaborator_module_write_permissions.sql`, quindi il replay strettamente cronologico da database vuoto può fallire già durante la creazione del RPC di salvataggio, prima ancora di arrivare alla migration che installa l'helper.
- La migration `20260928090000_collaborator_module_write_permissions.sql` applica inoltre una policy a `public.portal_access`; `20260928093000_align_portal_request_access.sql` consulta la stessa tabella nelle funzioni residenti. Entrambi presuppongono che la relazione sia già stata creata, ma la migration `20260928153246_add_portal_access_unique_identity.sql` aggiunge esclusivamente un indice e non soddisfa tale prerequisito.

Queste dipendenze sono difetti strutturali della sequenza storica per un clean replay, non si correggono riordinando solo il ledger già applicato e non autorizzano a inventare una baseline. Le migration storiche restano inalterate per non invalidare checksum o storia applicata. La risoluzione sicura richiede recuperare una definizione base autorevole e il relativo ordine (oppure approvare una nuova baseline separata, esplicitamente ricostruita e provata in un ambiente isolato). Fino ad allora la sequenza non va dichiarata replay-safe da zero. Evidenza da ispezione sorgenti, senza esecuzione SQL in produzione e senza avvio del collaudo finale.


### Confronto delle varianti di baseline portal tra branch — 2026-10-04

La ricognizione dei tree Git conferma che `bethag-migration-repair` contiene sia `20260928043430_create_portal_access_baseline.sql` sia `20260928050000_reconstruct_portal_access_registry.sql`, mentre `bethag-migration-repair-clean` contiene il primo ma non il secondo; il branch operativo, `main` e `backup/pre-rollback-20261001` non contengono il file `20260928043430`. Il file `20260928043430` crea la relazione e alcuni indici/policy, ma richiede già `workspaces`, `condominiums`, `condominium_members` e `profiles`; non è quindi la migrazione di schema iniziale mancante. Il frammento `20260928050000` ricrea la stessa tabella con una forma di vincoli/indici simile e dichiara dipendenze da oggetti fondativi e helper preesistenti: aggiungerli entrambi alla sequenza corrente introdurrebbe una duplicazione della definizione e non risolverebbe il prerequisito del database vuoto. La loro presenza in un branch di riparazione è evidenza di ricostruzione, non prova di corrispondenza con la migration storica `20260928021707_initial_bethag_backend` o con il ledger di produzione. Perciò nessuno dei due file è stato copiato nella sequenza operativa né promosso a baseline canonico. Il recupero deve continuare sugli oggetti fondativi e sui privilegi effettivamente attestati dagli snapshot, con provenienza esplicita per ogni definizione; eventuale baseline nuova resta distinta dalle migration storiche e subordinata a replay isolato autorizzato. Sola verifica dei tree e dei sorgenti GitHub; nessuna modifica al database o avvio QA.


### Grafo FK del catalogo pubblico: strato fondativo e dipendenze — 2026-10-04

È stato estratto staticamente il grafo delle foreign key dal file `docs/recovery/production_public_tables_snapshot.sql` (47 tabelle pubbliche). È una fotografia catalogo, non una sequenza di DDL replay-safe; le dipendenze elencate attestano riferimenti FK, non l'ordine completo richiesto da funzioni, trigger, policy, viste, tipi ed estensioni.

**Nucleo e dipendenze strutturali osservate**

| Oggetto | Riferimenti FK osservati nello snapshot | Implicazione per baseline |
|---|---|---|
| `workspaces` | nessuno nello snapshot | Radice pubblica del tenant; definizione e policy originarie non recuperate da questa fotografia. |
| `profiles` | `auth.users` | Richiede Auth/schema esterno prima delle strutture applicative che lo referenziano. |
| `condominiums` | `profiles`, `workspaces` | Dipende da profili e workspace; va riconciliata prima delle tabelle condominiali figlie. |
| `condominium_units` | `condominiums`, `workspaces` | Entità autonoma d'identità catastale; la sua creazione deve precedere membri, millesimi e oggetti contabili con FK a unità. |
| `condominium_members` | `condominiums`, `condominium_units`, `profiles` | Nodo di collegamento tra identità personale, condominio e unità; attenzione a dipendenze circolari se si ricostruiscono tabelle in blocco. |
| `portal_access` | `condominiums`, `condominium_members`, `profiles`, `workspaces` | Registro dipendente dal nucleo e da una forma coerente di membership. |
| `portal_registration_requests` | `condominium_members`, `profiles`, `workspaces` | Workflow portale successivo alla disponibilità del nucleo d'identità. |

**Dipendenze applicative ricorrenti**

- Contabilità: `condominium_fiscal_years` dipende da condominio/workspace; `condominium_ledger_entries` collega condominio, esercizio, fondi, membri, unità, fornitori, documenti e assemblee; rate, ripartizioni, consumi e riporti dipendono da più nodi dello stesso gruppo.
- Millesimi: `condominium_millesimal_tables` dipende da condominio/workspace; `condominium_millesimal_values` aggiunge la dipendenza da unità e tabelle millesimali.
- Trasformazioni catastali: `condominium_unit_transformations` dipende da condominio/workspace e identità Auth; `condominium_unit_transformation_items` dipende da trasformazione e unità, quindi richiede l'unità base prima dei dettagli.
- Comunicazioni e lavori: destinatari comunicazioni dipendono da comunicazioni, membri, profili, condominio e workspace; documenti/eventi/avanzamento lavori dipendono dalla scheda lavori e, in alcuni casi, da ledger, fondi, fornitori o registro.

**Conseguenza operativa:** il catalogo permette ora di distinguere il nucleo relazionale dai moduli che vi si appoggiano, ma non permette di ricavare automaticamente la migration originale, i grant, le policy RLS, i trigger o le procedure di bootstrap. Il grafo FK evidenzia inoltre che una baseline deve trattare in modo esplicito le dipendenze reciproche e gli oggetti esterni Supabase (Auth/Storage), anziché ordinare soltanto i `CREATE TABLE`. Non è stata generata né applicata una migration di baseline; il prossimo passaggio resta il confronto per oggetto tra questo grafo, le definizioni di funzione/trigger e le migration sorgente, mantenendo il database di produzione in sola lettura.


### Incrocio snapshot funzioni di produzione con grafo FK — 2026-10-04

Sono state lette le quattro parti `docs/recovery/production_functions_definitions_001.sql`–`004.sql` (32 definizioni `CREATE OR REPLACE FUNCTION` estratte dallo snapshot catalogo). L'incrocio statico conferma che la dipendenza delle funzioni è più ampia delle sole FK e che le funzioni di autorizzazione costituiscono prerequisiti condivisi.

| Gruppo di funzioni osservato | Oggetti applicativi referenziati | Dipendenza da risolvere prima di una baseline |
|---|---|---|
| Accesso workspace: `is_workspace_member`, `is_workspace_manager`, `is_workspace_admin`, `can_manage_workspace_module`, `can_access_workspace_module` | `workspace_members`, `workspaces`, `profiles` e funzioni helper correlate | Stabilire l'ordine di creazione delle funzioni e il contratto di ruolo/membership; non applicare policy che le invocano prima degli helper effettivamente richiesti. |
| Accesso residente: `can_access_condominium`, `can_access_resident_condominium`, `can_access_resident_condominium_module` | `condominiums`, `portal_access`, `condominium_members`, helper workspace e contesto JWT/Auth | Richiede schema e collegamenti d'identità coerenti; la sola creazione delle tabelle non certifica isolamento tenant o permessi. |
| Registrazione portale: `admin_approve_portal_registration`, `complete_portal_registration`, `apply_portal_member_permissions` | `portal_registration_requests`, `portal_access`, `condominium_members`, `profiles`, `workspace_members` | Le due tabelle del portale e gli helper di gestione devono esistere con colonne e stati esatti prima del corpo funzione. |
| Ciclo contabile: chiusura esercizio, riporti, compensazioni, generazione rate e registrazione pagamenti | `condominium_fiscal_years`, `condominium_ledger_entries`, `condominium_installments`, `condominium_expense_allocations`, `condominium_payment_movements`, riporti e compensazioni | Richiede tabelle, vincoli, stati e funzioni subordinate coerenti; ordine e sicurezza delle operazioni non si deducono dai nomi dei file. |
| Trasferimento membro e trasformazioni | `condominium_member_transfers`, `condominium_members`, `condominium_units`, rate, ripartizioni e accesso portale | Dipende da unità già materializzate e da snapshot/allocazioni contabili congruenti; verificare coerenza di condominio/workspace e data effettiva. |
| Archivio, comunicazioni e cancellazione | `condominiums`, `condominium_audit_log`, comunicazioni/destinatari e numerose tabelle operative e contabili | L'archivio è un percorso distinto dall'hard delete; la funzione di cancellazione deve essere confrontata con FK, trigger, retention, storage e ACL prima di considerarla completa. |
| Onboarding Auth: `handle_new_user` | `auth.users`, `profiles` e helper workspace | Dipendenza da trigger/evento Auth esterno al solo schema pubblico; va inclusa nel bootstrap e verificata con ruoli sintetici. |

**Risultato dell'incrocio:** lo snapshot conferma riferimenti concreti a oggetti del nucleo e dei moduli, ma non attribuisce le definizioni alle versioni di migrazione che le hanno introdotte. Le funzioni sono quindi evidenza dello stato osservato, non sorgente storica equivalente. I corpi dipendono inoltre da ACL, proprietario, `SECURITY DEFINER/INVOKER`, `search_path` e trigger chiamanti: questi aspetti vanno verificati separatamente e non ricostruiti per supposizione.

**Azione successiva:** continuare il confronto per helper condivisi e per funzioni che mutano dati contabili o identità, associando ogni definizione a una migration soltanto quando la corrispondenza è verificabile. Non è stato eseguito SQL, né modificato il database; nessun replay, QA finale, merge o deploy è stato avviato.


### Riconciliazione puntuale helper RLS residenti e stato archivio — 2026-10-04

Il confronto dei corpi SQL reperibili ha chiarito la sequenza delle regole di accesso residenti nel branch operativo:

| Migrazione | Evidenza statica | Esito confronto |
|---|---|---|
| `20260928183000_harden_resident_portal_access.sql` | L'associazione tra accesso portale e membro attivo è basata sull'email; la funzione modulo limita il ruolo a `resident`. | Variante precedente, più restrittiva sul collegamento esplicito `user_id` e differente per il ruolo ammesso. |
| `20260929201500_fix_resident_portal_rls.sql` | Introduce il collegamento esplicito tramite `pa.user_id/cm.user_id` con fallback email; non interroga la tabella condomini per verificare lo stato archivio. | Corregge la corrispondenza identità, ma non è da sola la definizione finale osservata in produzione. |
| `20260930440000_optimize_portal_authorization_helpers.sql` | Ottimizza la valutazione del contesto Auth e aggiorna l'helper modulo residente usando il collegamento esplicito e i ruoli `resident/council`. | Il corpo è sostanzialmente allineato alla regola di collegamento identità presente nello snapshot; resta da verificare l'eventuale sostituzione successiva. |
| `20260930550000_harden_archived_condominium_visibility.sql` | Blocca la visibilità residente leggendo `condominiums.data->>'archivedAt'`; modifica helper e policy portal/unità. | **Divergenza critica di rappresentazione archivio** rispetto allo snapshot catalogo, che usa `condominiums.archived_at` negli helper residenti osservati. |
| Snapshot `production_functions_definitions_001.sql` | Gli helper `can_access_resident_condominium` e `can_access_resident_condominium_module` verificano `c.archived_at is null`, mantenendo il collegamento esplicito e fallback email. | Definizione osservata attualmente in produzione secondo l'estrazione catalogo; non dimostra quale migration storica l'abbia introdotta. |

**Decisione tecnica:** non riscrivere automaticamente la migration `20260930550000` né aggiungere un override correttivo sulla base del solo snapshot. Prima occorre verificare la fonte canonica dello stato archivio, il contenuto effettivo di `condominiums.data` rispetto a `archived_at`, le policy collegate e gli eventuali trigger/backfill. La divergenza è registrata come blocker di semantica RLS: l'uso del campo errato può lasciare accessibili o nascondere in modo incoerente i condomini archiviati, a seconda della rappresentazione effettiva dei record.

L'helper `can_manage_workspace_module` mostra inoltre una differenza di forma tra migration e snapshot: `auth.uid()` è invocato direttamente nella migration `20260928090000` e come `(select auth.uid())` nello snapshot. È una forma tipica di ottimizzazione initplan e non prova, da sola, una differenza nelle regole di autorizzazione; per dichiarare equivalenza servirebbero il confronto dell'intero corpo e gli attributi catalogo (owner, ACL, configurazione sicurezza/search_path).

Nessuna modifica SQL è stata applicata; questa nota documenta la divergenza e impedisce di trattare le varianti come equivalenti senza verifica. Produzione resta in sola lettura e il collaudo QA complessivo resta rinviato alla chiusura dei blocker.


### Verifica RLS, grant e ACL per accesso portale — 2026-10-04

È stata interrogata in sola lettura la catalogazione PostgreSQL di produzione per `portal_access`, `condominium_units` e `condominium_members`, insieme alle quattro funzioni helper private usate dalle policy.

| Oggetto | Stato RLS | ACL osservata | Valutazione |
|---|---|---|---|
| `portal_access` | abilitato, non FORCE | `authenticated`: SELECT/INSERT/UPDATE/DELETE; `service_role`: privilegi completi; nessun grant esplicito ad `anon` | Coerente con accesso mediato da policy, da confrontare con i grant storici della baseline mancante. |
| `condominium_units` | abilitato, non FORCE | `authenticated`: SELECT/INSERT/UPDATE/DELETE; `service_role`: privilegi completi; nessun grant esplicito ad `anon` | Il ruolo autenticato dispone dei privilegi di tabella, ma la RLS limita le righe e le operazioni. |
| `condominium_members` | abilitato, non FORCE | `authenticated`: SELECT/INSERT/UPDATE/DELETE; `service_role`: privilegi completi; nessun grant esplicito ad `anon` | Come sopra; le policy distinguono lettura residente e gestione amministrativa. |
| Helper in schema `private` (`can_access_resident_condominium`, `can_access_resident_condominium_module`, `can_access_workspace_module`, `can_manage_workspace_module`) | `SECURITY DEFINER`, `search_path=public` | EXECUTE a `authenticated` e proprietario `postgres`; nessun EXECUTE a `PUBLIC` rilevato | ACL ristrette rispetto al default PostgreSQL; resta necessaria la verifica della corrispondenza esatta con le migration sorgente e dei controlli interni ai corpi funzione. |

Le tre tabelle hanno RLS attiva e non forzata. Non risulta un grant esplicito ad `anon`; ciò non sostituisce il controllo delle impostazioni Data API, né rende superflua la RLS. Le policy attive osservate sono tutte destinate ad `authenticated` e applicano predicati di autorizzazione. Gli helper sono `SECURITY DEFINER`, quindi la loro correttezza dipende anche dal corpo, dal proprietario e dal `search_path`; il solo ACL non certifica la sicurezza funzionale.

**Esito:** non emerge, da questi cataloghi, un'esposizione diretta ad `anon` sulle tre tabelle o l'EXECUTE pubblico dei quattro helper. Rimane non dimostrata la parità storica grant/ACL con le migrazioni iniziali non recuperate. La discrepanza `archived_at` / `data->>'archivedAt'` resta il blocker funzionale primario delle policy residenti; nessun grant, policy o funzione è stato modificato in produzione e non è stato avviato il collaudo complessivo.


### ACL delle funzioni trigger esposte nello schema public — 2026-10-04

L'incrocio del catalogo `pg_trigger` con `pg_proc` in produzione ha individuato 21 funzioni associate a trigger con ACL che includono `PUBLIC` e/o `anon`. Tutte le 21 risultano `SECURITY INVOKER`; non sono state individuate in questo insieme funzioni trigger `SECURITY DEFINER` eseguibili pubblicamente. Tra quelle con EXECUTE esplicito a `PUBLIC` e `anon` figurano `guard_confirmed_unit_transformation_immutable`, `guard_confirmed_unit_transformation_items_immutable`, `touch_documents_updated_at`, `validate_communication_recipient_scope`, `validate_condominium_allocation_intake_scope`, `validate_condominium_consumption_reading_scope`, `validate_condominium_request_status`, `validate_document_ai_transition` e `validate_document_metadata`; altre funzioni trigger del gruppo conservano EXECUTE a `PUBLIC` ma non un grant esplicito ad `anon`.

Le migration `20260930212000` e `20260930213000` revocano l'EXECUTE pubblico/ruoli client soltanto a sette funzioni trigger `SECURITY DEFINER` nominate esplicitamente. Il catalogo attuale non mostra un'estensione generalizzata della revoca alle altre funzioni trigger, anche se le migration `20261002113618` e `20261002113631` limitano i privilegi predefiniti per gli oggetti futuri creati dal ruolo `postgres`; tali default ACL non correggono retroattivamente le funzioni già esistenti.

**Valutazione:** è una difformità di hardening/least privilege da risolvere con una migration forward che individui esclusivamente funzioni effettivamente collegate a trigger e revochi i privilegi di invocazione diretta ai ruoli client, preservando proprietario e ruoli operativi necessari. PostgreSQL ammette l'invocazione delle trigger function nel contesto del trigger, non come normali RPC; pertanto l'ACL osservata non dimostra da sola un endpoint RPC sfruttabile. Prima di introdurre la revoca generalizzata occorre verificare gli eventuali usi applicativi diretti e la compatibilità dei ruoli di servizio. Nessuna ACL è stata modificata in produzione e non è stata creata una migration correttiva non ancora verificata.


### Precisazione inventario EXECUTE delle funzioni public — 2026-10-04

Una seconda interrogazione del catalogo ACL ha esteso il controllo a tutte le funzioni nello schema `public`, senza limitarsi all'elenco iniziale dei trigger. Il risultato ha restituito 23 funzioni con EXECUTE a `PUBLIC` secondo ACL esplicita o predefinita; 9 hanno anche un grant esplicito a `anon`. Tutte le 23 risultano `SECURITY INVOKER` e corrispondono a funzioni trigger/di integrità nel catalogo osservato, non a RPC applicative intenzionali. Il gruppo comprende anche `prevent_closed_fiscal_year_payment_delete`, `prevent_closed_fiscal_year_update` e `prevent_closed_fiscal_year_delete`, non riportate nel precedente elenco di 21 funzioni perché quel controllo aveva un perimetro diverso.

Questa precisazione sostituisce l'interpretazione numerica del precedente inventario: il dato da usare per la verifica successiva è 23 funzioni con EXECUTE pubblico e 9 con grant esplicito ad `anon`; il rischio resta di hardening/least privilege, non prova di una RPC invocabile né di un bypass RLS. Le funzioni trigger sono eseguite dal motore nel contesto del trigger, mentre un tentativo di invocazione diretta non equivale a una chiamata RPC valida. La revoca va pertanto preparata come migration forward solo dopo aver confermato l'assenza di invocazioni SQL dirette e i privilegi minimi necessari ai ruoli operativi. Nessuna modifica alle ACL è stata applicata.


### Verifica RPC applicative e ACL pubbliche — 2026-10-04

Il filtro del catalogo di produzione che esclude le funzioni effettivamente collegate a trigger ha individuato soltanto due funzioni con EXECUTE ereditato da `PUBLIC` non associate a un trigger attivo: `prevent_closed_fiscal_year_payment_delete()` e `prevent_closed_fiscal_year_update()`. Entrambe sono `SECURITY INVOKER`; la definizione esaminata di `prevent_closed_fiscal_year_update()` restituisce `trigger` e dipende da `OLD`/ `NEW`, quindi non costituisce una normale RPC applicativa invocabile con una chiamata PostgREST standard. L'EXECUTE via `PUBLIC` include anche `anon` per eredità, pur senza grant esplicito ad `anon`.

Le RPC applicative esaminate nei cataloghi risultano invece senza EXECUTE a `PUBLIC`/ `anon` e con EXECUTE a `authenticated` (oltre al ruolo di servizio dove previsto). Le migration presenti nel ramo revocano esplicitamente `PUBLIC` e `anon` da RPC finanziarie e amministrative selezionate; la sola somiglianza del nome non è stata usata per estendere le revoche ad altre funzioni.

**Esito operativo:** non è emersa una RPC applicativa `SECURITY DEFINER` esposta ad `anon` nell'insieme interrogato. Le due funzioni `RETURNS trigger` non associate a trigger attivi restano una anomalia ACL da approfondire, ma non giustificano una revoca automatica senza confronto con l'intero storico e con gli eventuali usi SQL diretti. Nessuna modifica SQL/ACL è stata eseguita in produzione; nessuna migration correttiva è stata aggiunta sulla base di un'associazione non dimostrata. Il collaudo complessivo resta differito fino alla risoluzione degli altri blocker.


### Verifica catalogo delle RPC SECURITY DEFINER — 2026-10-04

È stato rieseguito il controllo in sola lettura sul catalogo PostgreSQL, esaminando `pg_proc`, ACL effettive (ACL esplicite o default), tipo restituito e collegamento ai trigger.

**Funzioni `SECURITY DEFINER` non associate a trigger con EXECUTE per ruoli applicativi osservate:**

| Funzione | Ruoli con EXECUTE osservati | Valutazione |
|---|---|---|
| `admin_approve_portal_registration(uuid, uuid)` | `authenticated` | RPC applicativa autenticata; non risulta EXECUTE a `PUBLIC` o `anon`. |
| `close_condominium_member_transfer(uuid)` | `authenticated`, `service_role` | RPC applicativa autenticata/servizio; non risulta EXECUTE a `PUBLIC` o `anon`. |
| `confirm_condominium_member_transfer(...)` | `authenticated`, `service_role` | RPC applicativa autenticata/servizio; non risulta EXECUTE a `PUBLIC` o `anon`. |
| `sync_condominium_work_financial_summary(uuid)` | `service_role` | Funzione di servizio, non esposta ai ruoli client osservati. |

Le altre funzioni `SECURITY DEFINER` che compaiono nel catalogo con EXECUTE a `service_role` restituiscono `trigger` e sono collegate a trigger attivi. Non è emersa, nell'insieme interrogato, alcuna RPC applicativa `SECURITY DEFINER` con EXECUTE a `PUBLIC` o `anon`.

Il controllo ha inoltre confermato due routine `RETURNS trigger` non collegate a trigger attivi (`prevent_closed_fiscal_year_payment_delete()` e `prevent_closed_fiscal_year_update()`) con EXECUTE ereditato da `PUBLIC`; il catalogo non mostra un grant esplicito ad `anon`. Il tipo di ritorno e l'uso di `OLD/NEW` impediscono di trattarle come normali RPC PostgREST, ma rimangono residui ACL da ricondurre a una migrazione storica o a una rimozione controllata. Non è stata trovata evidenza sufficiente per revocare i privilegi o eliminare le routine senza prima verificare eventuali invocazioni SQL dirette e l'uso previsto.

Le migration `20261001063800`, `20261001081500` e `20261001081600` revocano `PUBLIC`/`anon` da specifiche RPC finanziarie, amministrative e di ripristino. Il catalogo osservato è compatibile con l'assenza di esposizione anonima per le RPC applicative elencate, ma non prova da solo la corrispondenza integrale tra ogni definizione live e la migration che l'ha introdotta: restano necessari il confronto dei corpi completi e l'inventario di tutti i grant nelle migration non recuperate.

**Esito:** nessuna esposizione `anon` individuata tra le RPC applicative `SECURITY DEFINER` esaminate. La verifica non certifica ancora l'intera superficie RPC (incluse funzioni `SECURITY INVOKER`, overload e oggetti fuori da `public`) né sostituisce il replay isolato. Nessuna modifica al database di produzione, nessuna revoca ACL, nessun merge/deploy e nessun collaudo complessivo sono stati eseguiti.


### Verifica dei corpi RPC e delle routine trigger residue — 2026-10-04

Il controllo read-only dei corpi funzione in produzione ha approfondito le RPC `SECURITY DEFINER` precedentemente individuate. `admin_approve_portal_registration` verifica l'identità Auth confermata, la corrispondenza dell'email, l'appartenenza allo stesso workspace e il permesso di gestione del modulo Portale prima di delegare all'helper privato. `confirm_condominium_member_transfer` rifiuta un'identità entrante non verificata e delega con `user_id` nullo; `close_condominium_member_transfer` è un wrapper verso la funzione privata. Le tre definizioni hanno `search_path` vuoto (`SET search_path TO ''`), riducendo il rischio di risoluzione non qualificata degli oggetti. Le ACL catalogate concedono EXECUTE ad `authenticated` e/o `service_role` secondo funzione, senza EXECUTE a `PUBLIC` o `anon`.

Le due routine `prevent_closed_fiscal_year_payment_delete()` e `prevent_closed_fiscal_year_update()` risultano `RETURNS trigger`, `SECURITY INVOKER` e non associate a trigger attivi nel catalogo attuale, pur mantenendo EXECUTE ereditato da `PUBLIC`. I corpi usano `OLD`/`NEW` e non sono RPC PostgREST utilizzabili come normali funzioni. Restano oggetti orfani con ACL non minimale; la ricerca nel repository non ha restituito occorrenze, ma tale esito non è prova sufficiente dell'assenza di invocazioni dinamiche o SQL esterne.

Il confronto puntuale delle tre migration di hardening conferma revoche `PUBLIC`/`anon` limitate alle firme nominate nei rispettivi file (RPC finanziarie, amministrative/archivio e restore). Non si estende la revoca alle due routine trigger residue: prima va identificata la loro provenienza storica e verificato se siano richiamate da altri processi. La decisione resta quindi di non introdurre una migration ACL speculativa. Produzione non modificata; replay isolato e collaudo complessivo ancora da eseguire dopo la chiusura dei blocker.


### Incrocio chiamate RPC del client con ACL live — 2026-10-04

Sono state censite le chiamate `.rpc()` nei componenti applicativi principali del branch (`src/lib/bethagBackend.ts`, `src/main.tsx`, `src/AccountingPage.tsx`, `src/MemberTransferPanel.tsx`). Le chiamate trovate sono:

| Area client | RPC richiamate | ACL live osservata |
|---|---|---|
| Backend anagrafica | `save_condominium`, `claim_first_workspace_admin`, `delete_condominium` | EXECUTE ad `authenticated` e ruoli di servizio previsti; nessun `PUBLIC/anon` |
| Registrazione/portale | `complete_portal_registration`, `admin_approve_portal_registration` | EXECUTE ad `authenticated` (oltre al proprietario); nessun `PUBLIC/anon` |
| Codice di sicurezza personale | `set_personal_security_code`, `verify_personal_security_code` | EXECUTE ad `authenticated` e ruoli di servizio previsti; nessun `PUBLIC/anon` |
| Contabilità | `compensate_fiscal_carryover`, `close_fiscal_year_and_generate_carryovers`, `generate_fiscal_year_carryovers`, `generate_condominium_expense_allocations`, `generate_installments_from_allocations_schedule`, `confirm_allocation_intake`, `generate_consumption_allocations`, `register_condominium_installment_payment` | EXECUTE ad `authenticated` e ruoli di servizio previsti; nessun `PUBLIC/anon` |
| Trasferimento proprietà | `preview_condominium_member_transfer`, `confirm_condominium_member_transfer`, `get_member_transfer_accounting_snapshot`, `close_condominium_member_transfer` | EXECUTE ad `authenticated` e/o `service_role` secondo la funzione; nessun `PUBLIC/anon` |

L'incrocio con il catalogo live non ha evidenziato chiamate RPC del client prive di corrispondente funzione, né una chiamata client alle due routine residue `prevent_closed_fiscal_year_payment_delete()` e `prevent_closed_fiscal_year_update()`. Queste ultime sono `RETURNS trigger`, non sono collegate a trigger attivi nel catalogo e conservano EXECUTE via `PUBLIC`; l'assenza di riferimenti statici nei file esaminati non esclude invocazioni dinamiche o processi esterni. Poiché i loro corpi dipendono da `OLD/NEW`, non sono normali endpoint RPC PostgREST: si mantengono come anomalia da ricondurre allo storico, senza revoca automatica.

**Esito:** le RPC effettivamente richiamate dal client e presenti nel catalogo live risultano protette dall'EXECUTE pubblico/anonimo. Le tre migration di lockdown esaminate coprono un sottoinsieme mirato di RPC; il loro perimetro non va esteso per sola analogia. Resta da chiudere la riconciliazione storica delle funzioni residue e delle migration iniziali mancanti; il catalogo live non dimostra un replay pulito. Nessuna modifica al database di produzione, alle ACL o al flusso client è stata eseguita; QA complessivo, merge e deploy restano rinviati.


### Verifica runtime delle firme RPC e wrapper pubblici — 2026-10-04

La lettura dei cataloghi pg_proc e delle definizioni live ha confermato una distinzione importante tra le prime migration versionate e lo schema attuale:

| RPC pubblica | Sicurezza live | ACL live | Osservazione |
|---|---|---|---|
| save_condominium(uuid,bigint,text,text,text,text,text,jsonb) | SECURITY INVOKER | authenticated, service_role | Wrapper sottile che delega a private.save_condominium. La migration iniziale 20260928070000 definiva invece direttamente una funzione SECURITY DEFINER; non va usata come descrizione dello stato corrente. |
| claim_first_workspace_admin(uuid) | SECURITY INVOKER | authenticated, service_role | Wrapper verso private.claim_first_workspace_admin; la migration iniziale esponeva un wrapper SECURITY DEFINER e concedeva EXECUTE ad authenticated. |
| complete_portal_registration(text,text,text) | SECURITY INVOKER | authenticated, service_role | Wrapper verso la funzione privata; la migration 20260930390000 conteneva invece il corpo SECURITY DEFINER direttamente in public. |
| delete_condominium(uuid,bigint,text) | SECURITY INVOKER | authenticated, service_role | Wrapper verso private.delete_condominium; la migration iniziale definiva una firma pubblica differente (uuid,bigint) con corpo SECURITY DEFINER. |
| admin_approve_portal_registration(uuid,uuid) | SECURITY DEFINER con search_path vuoto | authenticated | Controlla sessione, workspace, condominio attivo, email Auth verificata e corrispondenza identità prima di delegare alla funzione privata. Nessun EXECUTE a PUBLIC/anon osservato. |

Il catalogo live mostra inoltre due funzioni RETURNS trigger non collegate a trigger attivi (prevent_closed_fiscal_year_payment_delete() e prevent_closed_fiscal_year_update()) con EXECUTE ereditato da PUBLIC. I corpi dipendono da OLD/NEW e non sono normali RPC PostgREST; rimangono residui ACL non minimali da ricondurre allo storico. Nessuna invocazione client statica è stata individuata nelle aree già censite, ma ciò non esclude processi SQL esterni o chiamate dinamiche.

**Esito:** le RPC client elencate nel controllo precedente non risultano esposte a anon o PUBLIC secondo le ACL live. I wrapper SECURITY INVOKER non vanno confusi con le vecchie implementazioni pubbliche SECURITY DEFINER; la sicurezza effettiva dipende anche dalle funzioni private delegate e dai loro controlli interni. La migrazione storica completa di questo passaggio non è ancora dimostrata, quindi non viene introdotta una revoca o riscrittura automatica. Produzione resta invariata; non eseguiti replay, QA complessivo, merge o deploy.


## Application RPC authorization cross-check — 2026-10-04

Read-only catalog inspection of production project `tctcgptrsmvgajqjgnev` cross-checked against the branch's targeted execute-privilege migrations.

- `public.admin_approve_portal_registration(uuid,uuid)` is SECURITY DEFINER but its effective ACL grants EXECUTE only to `authenticated` (and owner `postgres`), not PUBLIC or `anon`. Its wrapper verifies an authenticated caller, workspace module permission, active/unarchived condominium scope, and confirmed account email before delegating to the private implementation.
- `public.close_condominium_member_transfer(uuid)` and `public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)` are SECURITY DEFINER and grant EXECUTE to `authenticated` and `service_role` (plus owner), with no PUBLIC/`anon` grant in the observed catalog. Their bodies require authenticated, permission-checked workflows.
- `public.sync_condominium_work_financial_summary(uuid)` is SECURITY DEFINER and restricted to `service_role` and owner; it is not an authenticated application RPC.
- Two trigger-returning functions, `public.prevent_closed_fiscal_year_payment_delete()` and `public.prevent_closed_fiscal_year_update()`, have broad/default EXECUTE ACLs and did not appear attached to a non-internal trigger in the catalog snapshot. Since they return `trigger`, they are not ordinary PostgREST-callable RPC endpoints; their EXECUTE ACL alone does not establish an exploitable route. Their intended trigger attachment and migration provenance still require reconciliation.
- The inspected hardening migrations `20261001063800_lock_down_financial_rpc_anon_execute.sql`, `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql`, and `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` explicitly revoke PUBLIC and `anon` on their named finance/admin/restore RPCs. This is targeted rather than a blanket policy.

Assessment: no evidence in this pass that an examined application SECURITY DEFINER RPC is executable by `anon` or PUBLIC. The two detached trigger-returning functions are integrity/provenance follow-ups, not grounds for an indiscriminate revoke. Do not modify historical migrations or production ACLs based solely on this snapshot; any correction must be a new forward-only migration after confirming intended trigger bindings and role dependencies. Production remains read-only; no migration, ACL, or data change was applied. This is a focused authorization review, not comprehensive QA/collaudo.


## Applicative RPC authorization cross-check (2026-10-04)

Read-only production catalog inspection compared callable public functions (non-trigger routines) with the available ACL-hardening migrations. The current catalog shows no callable public function with EXECUTE granted to `anon` or `PUBLIC`. The reviewed callable application routines are limited to `authenticated`, `postgres`, and/or `service_role` as appropriate. The anonymous/public revocations in `20261001063800_lock_down_financial_rpc_anon_execute.sql`, `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql`, and `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` match the respective financial, legacy-administration, and restore RPC signatures present in those files.

Two public routines, `prevent_closed_fiscal_year_payment_delete()` and `prevent_closed_fiscal_year_update()`, return `trigger` but have no trigger referencing them in the live catalog. They therefore are not normal PostgREST RPC endpoints, despite inherited EXECUTE for `PUBLIC`; their apparent orphan status should be checked against migration history and any direct SQL consumers before removal or privilege changes. Trigger-only functions with public/anon execute grants remain separately identified as integrity routines, not callable RPC exposure. This distinction is not evidence of an RLS bypass.

This was a read-only catalog and source-file comparison, not a PostgreSQL replay or end-to-end authorization test. No production DDL, grants, or data were changed. No blanket revocation was introduced; any cleanup must be forward-only and must first confirm routine usage and intended service-role access.


### Private helper authorization boundary follow-up — 2026-10-04

A further read-only catalog check found that schema `private` currently has `USAGE` for `authenticated` (and not for `anon` or `service_role`). Among the inspected private `SECURITY DEFINER` routines, `private.claim_first_workspace_admin(uuid)` has EXECUTE for `authenticated`; `private.complete_portal_registration(text,text,text)`, `private.delete_condominium(uuid,bigint,text)`, and `private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)` have EXECUTE for `authenticated` and `service_role`. The private approval and transfer confirmation/closure implementations were catalogued as owner-only (`postgres`) in this pass.

This is an authorization boundary requiring verification: schema USAGE plus function EXECUTE permits SQL-level resolution, but PostgREST RPC reachability also depends on whether `private` is included in the API exposed-schema configuration. That configuration was not established by the catalog query. Public wrappers remain the documented client entry points; however, direct invocation of private helpers must not be assumed impossible solely from the schema name. Verify the project's exposed-schema configuration and migration history before considering a forward-only restriction. Do not revoke schema USAGE or helper EXECUTE blindly, as that may break expected flows or service operations. Production remains unchanged; this was not a runtime authorization test or comprehensive QA.

## Live application RPC authorization cross-check (2026-10-04)

A read-only catalog query against production project `tctcgptrsmvgajqjgnev` enumerated public `SECURITY DEFINER` functions and separated functions attached to non-internal triggers from callable routines. Four public security-definer functions were not attached to active triggers:

| Routine | Observed EXECUTE roles | Reconciliation note |
|---|---|---|
| `admin_approve_portal_registration(uuid, uuid)` | `authenticated`, `postgres` | Checks authenticated identity and delegates workspace/module authorization to `private.can_manage_workspace_module`; not granted to `anon`/PUBLIC. |
| `close_condominium_member_transfer(uuid)` | `authenticated`, `postgres`, `service_role` | Public wrapper delegates to private transfer routine; not granted to `anon`/PUBLIC. |
| `confirm_condominium_member_transfer(uuid, uuid, text, text, uuid, date, text, text, jsonb)` | `authenticated`, `postgres`, `service_role` | Public wrapper rejects an unverified incoming user ID before delegating to the private routine; not granted to `anon`/PUBLIC. |
| `sync_condominium_work_financial_summary(uuid)` | `postgres`, `service_role` | Operational summary routine; no authenticated or anonymous EXECUTE observed. |

The three existing forward migrations `20261001063800_lock_down_financial_rpc_anon_execute.sql`, `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql`, and `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` explicitly revoke `anon` and `PUBLIC` from their listed financial, legacy administrative, and restore RPCs. The catalog result is consistent with the reviewed wrappers' restricted grants; it does not establish full historical migration replay parity or validate every function's internal authorization logic.

No additional blanket ACL migration is justified by this check: the identified callable security-definer routines have no observed `anon`/PUBLIC EXECUTE, while trigger-only routines are not RPC endpoints. This check does not assess every SECURITY INVOKER routine, client-side call path, or role's table-level privileges. Production was queried read-only; no migration was applied, and comprehensive QA remains deferred until known reconciliation work is complete.


### Private helper grants and API reachability — follow-up 2026-10-04

A fresh read-only catalog query enumerated effective EXECUTE grants for functions in both `public` and `private`, including default ACLs. The private schema contains SECURITY DEFINER helpers with EXECUTE for `authenticated`, including authorization predicates (`can_access_condominium`, `can_access_resident_condominium`, `can_access_resident_condominium_module`, `can_access_workspace_module`, `can_manage_workspace_module`, and workspace membership/admin predicates), as well as workflow implementations such as `claim_first_workspace_admin`, `archive_condominium`, `close_condominium_fiscal_year`, `complete_portal_registration`, `delete_condominium`, `generate_fiscal_year_carryovers`, installment/payment routines, `restore_condominium`, and personal security-code routines. Transfer approval/confirmation/closure private implementations observed in this catalog pass are owner-only. A few private integrity routines have default/PUBLIC EXECUTE but are trigger-returning routines rather than ordinary RPCs.

The observed ACLs alone do not prove these private routines are callable through PostgREST: reachability depends on the project's API exposed-schema configuration, which is not returned by the available project metadata or PostgreSQL catalog inspection. Schema `private` has `USAGE` for `authenticated` in the prior catalog check, so direct SQL resolution should not be presumed impossible. Public wrappers remain the client entry points found in static client-code inspection, but static call-site absence is not proof against dynamic or external SQL use.

**Next control required:** obtain and verify the actual Supabase API exposed-schema configuration, then map every exposed private routine to an intended caller and its migration-granted ACL. Until then, do not revoke schema USAGE or EXECUTE on private helpers: doing so could break policy evaluation, wrappers, or service workflows. This remains a configuration/authorization verification item, not a demonstrated anonymous exposure. Production was queried read-only; no DDL, ACL, data, merge, deploy, or comprehensive QA was performed.


### Private schema reachability check — 2026-10-04

A further read-only production privilege query confirmed schema-level access: `private` has USAGE for `authenticated` and `postgres`, but not for `anon` or `service_role`; neither `authenticated` nor `service_role` has CREATE. The `public` schema has USAGE for the API roles, with CREATE limited to `postgres`. This narrows direct SQL name resolution for anonymous clients, but does not establish whether PostgREST exposes `private` through its configured exposed-schema list.

The connected Supabase project metadata does not return the API exposed-schema configuration, and the branch has no `supabase/config.toml` at the expected path. Therefore the private-schema API reachability question remains unverified. Do not infer that `authenticated` private helper grants are necessarily externally callable, nor that they are unreachable; confirm the deployed API configuration before changing schema USAGE or function ACLs. The historical migrations that introduced private-function lockdown are also absent from the operational branch, so no exact source-to-live replay equivalence can be claimed.

No DDL, grants, data, or migration history were changed in production. No speculative ACL migration was added. This remains a targeted authorization/configuration check, not a runtime PostgREST authorization test or comprehensive QA.

## Application RPC and private-wrapper authorization audit (2026-10-04)

Read-only catalog inspection of production project `tctcgptrsmvgajqjgnev` distinguished public functions attached to active triggers from callable application routines. Among non-trigger public functions, the reviewed SECURITY DEFINER routines with an application entry point were `admin_approve_portal_registration(uuid,uuid)`, `close_condominium_member_transfer(uuid)`, and `confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)`; their observed EXECUTE ACLs include `authenticated` (and service/postgres where applicable), not `anon` or `PUBLIC`. Other reviewed public wrappers such as `save_condominium`, `delete_condominium`, and `restore_condominium` are SECURITY INVOKER and similarly lack anon/PUBLIC EXECUTE in the observed catalog.

The approval wrapper checks an authenticated UID, workspace-level Portale management, active member/condominium/workspace consistency, confirmed account email and matching member email before delegating to the private implementation. The transfer confirmation wrapper rejects a supplied incoming user identity and delegates with a null user ID, leaving identity verification to the separate controlled flow. The close-transfer wrapper delegates to the private implementation; its internal authorization remains the decisive control and should be reviewed against the exact private function body before changing grants.

No broad ACL change is justified by this inspection. Existing forward-only revocation migrations for financial, legacy-admin, and restore RPCs target named routines; their ACL state must be checked against the corresponding production function signatures and intended authenticated/service roles. This catalog/function-definition review is not a runtime authorization test, does not prove all call paths safe, and does not authorize production writes. No production DDL or data was changed. Full QA/collaudo remains deferred until reconciliation and corrections are complete.


### Live migration ledger vs branch filenames — 2026-10-04

A fresh read-only comparison of the production Supabase migration ledger with the active GitHub branch `fix/owner-reference-migration-20261003` returned 177 ledger entries and 156 SQL files in `supabase/migrations`. Only 15 ledger versions match a branch filename's 14-digit version exactly; 162 production ledger versions have no filename with that exact version in the branch.

This is a version-identity discrepancy, not proof that 162 migration changes are wholly absent: some branch files may be semantic replacements, timestamp-renamed revisions, or consolidated forward repairs. However, filename/name similarity cannot establish equivalence, ordering, or checksum parity. In particular, the production ledger includes early security/private-helper changes (including `privatize_rls_functions`, `restrict_private_security_definer_functions`, `remove_anon_private_function_execute`, and `remove_client_schema_privileges`) that are not present as exact versioned files in the active branch. The live catalog confirms private SECURITY DEFINER helpers and role grants, but cannot reconstruct their historical migration bodies or prove clean replay.

**Action/decision:** do not attempt to replay the branch against production, delete ledger entries, rename already-applied migrations, or infer equivalence from titles. The next reconciliation unit is a per-version crosswalk: map each production ledger entry to an exact branch file or a verified semantic successor, and mark unrecoverable source SQL separately. Recover original SQL from repository history/PRs/backup where available; otherwise prepare a forward-only convergence migration only after its preconditions and effects are established against the live catalog. This ledger comparison did not mutate production or the migration history. No full replay or comprehensive QA was run.


### Live RPC and private-helper authorization cross-check — 2026-10-04

A read-only catalog inspection compared public functions, their EXECUTE ACLs, trigger attachment, SECURITY DEFINER status, and the matching routines in the `private` schema. The public application RPCs inspected are granted to `authenticated` (and usually `service_role`); the previously identified anonymous/PUBLIC revocation migrations cover the financial, legacy-admin, and restore RPC groups. No anonymous EXECUTE grant was observed on the inspected public application SECURITY DEFINER wrappers. The intentionally anonymous first-workspace/bootstrap path remains a separate exception and must retain its own authentication/claim invariants.

The live schema privilege check returned `USAGE` on `private` for `authenticated`, but not for `anon`; `authenticated` also has EXECUTE on a set of private SECURITY DEFINER helpers, including workspace/module authorization helpers and several mutation helpers. This is a significant authorization boundary to verify: a public SECURITY INVOKER wrapper may need EXECUTE on a private helper, but that grant can also permit a direct SQL call by an authenticated database role if the private schema is reachable through the active API configuration or another SQL interface. The current connection does not expose the project's PostgREST exposed-schema configuration or test an authenticated client call, so direct API reachability and exploitability are **not established** by this catalog result alone.

**Action/decision:** preserve current production ACLs pending call-path validation. Do not revoke authenticated EXECUTE indiscriminately from private helpers: several SECURITY INVOKER public wrappers depend on those grants. Next safe convergence step is to verify configured exposed schemas and map each authenticated-granted private helper to its public wrapper, checking whether the helper repeats the wrapper's authorization, workspace/condominium scoping, and input validation. Where a helper is intended to be wrapper-only, restrict API exposure of `private` (preferred where supported) or redesign the privilege boundary in a forward-only migration after dependency validation. No production DDL/data was changed; no runtime RPC test or comprehensive QA was performed.


## Live database inspection — application RPC and private helper boundaries (2026-10-04)

Read-only catalog inspection of the connected production project compared callable routines, trigger attachment, EXECUTE ACLs, and namespace USAGE:

- Public routines not attached to a trigger were enumerated. The application-facing routines returned EXECUTE for `authenticated`, `postgres`, and/or `service_role`; none of those non-trigger routines showed EXECUTE for `anon` or `PUBLIC` in the effective ACL listing.
- Public SECURITY DEFINER routines in that callable set were `admin_approve_portal_registration`, `close_condominium_member_transfer`, `confirm_condominium_member_transfer`, and `sync_condominium_work_financial_summary`. Their observed EXECUTE grants are respectively authenticated/postgres; authenticated/postgres/service_role; authenticated/postgres/service_role; and postgres/service_role. Their definitions use an empty search_path. The approval routine checks authenticated identity, workspace module authorization, active member/workspace alignment, and verified email before delegating to the private implementation. The transfer confirmation wrapper rejects caller-supplied incoming user IDs and delegates with a null identity. These checks reduce identified exposure but do not replace runtime authorization tests.
- Public `claim_first_workspace_admin` is callable by authenticated and service_role (plus postgres); it is an intentional bootstrap surface candidate and must be checked against its implementation and bootstrap-state guard before any ACL change. `complete_portal_registration` similarly remains authenticated-only at the public wrapper, with its private implementation responsible for the registration workflow.
- The `private` schema currently has USAGE for authenticated and postgres, while public has USAGE for PUBLIC, anon, authenticated, postgres, pg_database_owner, and service_role. Multiple private SECURITY DEFINER helpers grant EXECUTE to authenticated to support policy/RPC delegation. Because private schema USAGE is currently granted to authenticated, lack of public-schema exposure alone is not proof that direct private invocation is impossible; confirm the Supabase/PostgREST exposed-schema configuration and direct call paths before changing these grants. Do not revoke helper EXECUTE broadly: RLS policies and public wrappers depend on helpers such as `private.can_access_condominium`, `private.can_manage_workspace_module`, and `private.is_workspace_manager`.
- Two public trigger-returning routines, `prevent_closed_fiscal_year_payment_delete()` and `prevent_closed_fiscal_year_update()`, appeared with EXECUTE inherited from PUBLIC/authenticated but no non-internal trigger currently references them. PostgreSQL trigger-returning routines cannot be invoked as ordinary functions; treat them as orphaned legacy definitions, not callable application RPCs. Their cleanup or ACL changes should be a separate reviewed forward migration after verifying no dynamic/external invocation dependencies.
- The branch migrations `20261001063800_lock_down_financial_rpc_anon_execute.sql`, `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql`, and `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` revoke anon and PUBLIC on the listed legacy/financial wrappers. The live ACLs inspected are consistent with authenticated-only/service-role access for these callable routines. The default-privilege migration `20261002113618_secure_default_function_and_sequence_privileges.sql` applies only to future objects created by postgres and does not repair existing ACLs.

Conclusion: no non-trigger public routine was observed executable by anon/PUBLIC in the current catalog query. Private schema USAGE for authenticated and the two orphaned trigger-returning public routines remain explicit follow-up items; no speculative ACL migration was added and production was not changed. Catalog inspection is not a substitute for a clean migration replay, PostgREST exposed-schema configuration review, or end-to-end authorization tests.


## Client RPC crosswalk (2026-10-04)

A source scan of `src/lib/bethagBackend.ts` and `src/main.tsx` on the active branch found these direct Supabase RPC calls:

| Public RPC | Client location | Observed production EXECUTE grant | Reconciliation |
|---|---|---|---|
| `save_condominium` | `src/lib/bethagBackend.ts` | authenticated, postgres, service_role | Matches authenticated client use; public wrapper delegates to private implementation. |
| `claim_first_workspace_admin` | `src/lib/bethagBackend.ts` | authenticated, postgres, service_role | Bootstrap call; preserve until first-admin eligibility and replay behavior are verified. |
| `delete_condominium` | `src/lib/bethagBackend.ts` | authenticated, postgres, service_role | Matches authenticated client use; wrapper delegates to private implementation. |
| `complete_portal_registration` | `src/main.tsx` | authenticated, postgres, service_role | Registration flow; public wrapper delegates to private implementation. |
| `admin_approve_portal_registration` | `src/main.tsx` | authenticated, postgres | Administrative approval wrapper performs workspace, member and verified-email checks. |
| `set_personal_security_code` | `src/main.tsx` | authenticated, postgres, service_role | Authenticated security-code setup/disable call. |
| `verify_personal_security_code` | `src/main.tsx` | authenticated, postgres, service_role | Authenticated verification call. |

The source scan found no direct client call to private-schema routines. It is not proof that no other client, Edge Function, scheduled task, or external integration calls a routine. No direct client call to the remaining public RPCs was found in these two source files; retain their grants until all application surfaces and deployment integrations are cross-checked. No ACL changes were made.


## Security-definer application RPC audit (2026-10-04)

A fresh read-only production catalog query filtered public SECURITY DEFINER functions to routines granted EXECUTE to PUBLIC, anon, or authenticated, and separately identified whether each routine is referenced by a non-internal trigger. Exactly three callable public SECURITY DEFINER routines appeared in that filter:

| Public routine | EXECUTE roles observed | Trigger-bound |
|---|---|---|
| `admin_approve_portal_registration(uuid, uuid)` | authenticated, postgres | no |
| `close_condominium_member_transfer(uuid)` | authenticated, postgres, service_role | no |
| `confirm_condominium_member_transfer(uuid, uuid, text, text, uuid, date, text, text, jsonb)` | authenticated, postgres, service_role | no |

No anon or PUBLIC EXECUTE grant was returned for these three. They are intentionally authenticated-facing security-definer entry points rather than trigger routines, so their authorization safety depends on the function bodies enforcing caller identity, workspace/condominium scope, and allowed state transitions. The earlier client crosswalk covers direct calls in `src/lib/bethagBackend.ts` and `src/main.tsx`, but does not establish all external invocation paths. This catalog check did not inspect every function body or the project's PostgREST exposed-schema configuration; therefore it is not a complete authorization certification. Keep production unchanged and defer final permission validation to the later controlled replay and authorization test phase.


## Static migration dependency cross-check — 2026-10-04

The branch source confirms an ordering dependency in the callable RPC layer: `20260928070000_save_condominium_rpc.sql` creates `public.save_condominium` and calls `private.can_manage_workspace_module(uuid,text)`, while the branch creates that helper in the later `20260928090000_collaborator_module_write_permissions.sql`. A clean chronological replay therefore cannot assume the helper exists when the save RPC is created. The latter migration also creates policies on `public.portal_access`, so replay additionally requires the portal registry table to have been established by an earlier foundational migration. The branch's recorded missing-baseline findings mean neither prerequisite can be inferred from the current migration folder alone.

The bootstrap wrapper in `20260928060000_expose_first_admin_bootstrap.sql` delegates to `private.claim_first_workspace_admin(uuid)` and grants its public wrapper to `authenticated`; its private implementation is not created in that file. These wrappers are dependent on the missing historical foundation/private-helper migrations. The later default-privilege migration `20261002113618_secure_default_function_and_sequence_privileges.sql` explicitly affects only future objects created by role `postgres`; it does not repair grants on existing routines.

**Disposition:** retain the current forward-only policy and do not reorder or rewrite applied migration files. The clean-replay blocker is confirmed at source level, but a safe baseline/convergence migration requires recovered definitions for the missing foundation and a dependency-complete schema snapshot. Production remains unchanged; this source review is not a clean PostgreSQL replay or runtime RPC authorization test.


### Function dependency and authorization body review — 2026-10-04

A source-level review of the branch's `20260928070000_save_condominium_rpc.sql` confirms that `public.save_condominium` is SECURITY DEFINER with an empty search path, rejects a null `auth.uid()`, and requires `private.can_manage_workspace_module(p_workspace_id,'condomini')` before writing condominium fields. Its migration revokes EXECUTE from `PUBLIC` and `anon` and grants it to `authenticated`. This is a sound wrapper-level boundary in isolation, but the migration precedes the branch migration that creates the referenced private helper, so it remains dependent on a recovered earlier foundation for clean replay.

The transfer implementation in `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` is a private SECURITY DEFINER routine with an empty search path. Its body checks authenticated identity, a valid transfer date and incoming name, resolves workspace/condominium from the supplied unit, requires `private.can_manage_workspace_module(workspace,'condomini')`, rejects archived condominiums, verifies the outgoing member is active on that exact unit, and blocks duplicate confirmed/closed transfers and an already-active current owner. It then snapshots financial values, closes outgoing portal/workspace access, creates the incoming owner/member and transfer record. These are substantive in-function controls, but do not replace review of every public wrapper, RLS policy, or external invocation route.

**Disposition:** the source reviewed here supports preserving the named authenticated public entry points and their private authorization dependencies; it does not justify revoking authenticated EXECUTE from private helpers indiscriminately. Live catalog SQL attempts in this pass were blocked before returning new results, so this section relies on the existing read-only catalog findings already recorded above plus source files fetched from the active branch. No new live ACL assertion is made. No production DDL, grants, data, or migration history were changed; no migration was added because the missing foundation and API exposed-schema configuration still prevent a defensible convergence change. Comprehensive QA remains deferred.


### Consolidated SECURITY DEFINER ACL filter — 2026-10-04

A further read-only production catalog query filtered SECURITY DEFINER functions in both `public` and `private` for effective EXECUTE grants to `PUBLIC` or `anon`. The query returned no matching rows. This is consistent with the earlier function-specific findings: no anonymous/PUBLIC-executable SECURITY DEFINER routine was identified in the queried schemas at this point in time. This does not certify invoker routines, PostgREST schema exposure, grants outside these schemas, or runtime authorization behavior. Authenticated EXECUTE on private helpers remains a distinct boundary because authenticated has schema USAGE; preserve it until the configured exposed schemas and all dependent call paths are validated. No production changes or migration additions were made; comprehensive QA remains deferred.


### Verifica mirata dei corpi RPC e deleghe private — 2026-10-04

La lettura catalogo dei corpi live ha permesso di verificare i principali wrapper pubblici SECURITY DEFINER e le rispettive routine private:

- `public.admin_approve_portal_registration(uuid,uuid)` controlla identità autenticata, autorizzazione al modulo Portale, corrispondenza tra workspace, condominio e richiesta, stato attivo/non archiviato, email confermata e coerenza dell'email del membro prima di delegare alla routine privata.
- `private.complete_portal_registration(text,text,text)` richiede `auth.uid()` e email confermata. L'auto-associazione avviene solo per un unico membro attivo individuato e con email corrispondente; le incongruenze sono instradate a richiesta di revisione. Il wrapper pubblico resta SECURITY INVOKER e l'ACL osservata è limitata agli utenti autenticati, postgres e service_role.
- `private.claim_first_workspace_admin(uuid)` richiede identità autenticata, serializza la richiesta con advisory lock e rifiuta il claim se il workspace contiene già membri. Il wrapper pubblico è SECURITY INVOKER e non rende anonimo il flusso.
- `private.close_condominium_member_transfer(uuid)` verifica identità, permesso di gestione del workspace, stato del trasferimento e assenza di posizioni contabili aperte prima di archiviare il cedente e chiudere il trasferimento.
- `private.confirm_condominium_member_transfer(...)` controlla identità, data e dati essenziali, permesso di gestione, condominio non archiviato, proprietario cedente attivo sulla specifica unità e assenza di trasferimenti/proprietari correnti duplicati. Il wrapper pubblico rifiuta un `p_incoming_user_id` fornito dal chiamante e delega con identità entrante nulla.

Le routine esaminate utilizzano `SET search_path TO ''` e riferimenti qualificati, riducendo il rischio di risoluzione di oggetti non attendibili. L'ACL live delle RPC applicative osservate non mostra EXECUTE a `anon` o `PUBLIC`; i privilegi per authenticated/service_role sono coerenti con gli entry point individuati, ferma restando la necessità di collaudo runtime per dimostrare il comportamento effettivo.

**Esito operativo:** nessuna revoca ulteriore o modifica SQL è giustificata dai soli corpi esaminati. Rimane aperta la verifica della configurazione degli schemi esposti da PostgREST e l'audit completo di tutti i percorsi esterni (Edge Functions, integrazioni e client diversi dai file già scansionati). Le dipendenze private con EXECUTE a authenticated non vanno revocate in blocco poiché sono utilizzate da wrapper e/o policy. Questa verifica non costituisce replay pulito né collaudo completo. Produzione e cronologia migration sono rimaste invariate.


## Application RPC authorization cross-check (2026-10-04)

Read-only catalog inspection of production project `tctcgptrsmvgajqjgnev` compared with the branch's three targeted EXECUTE-hardening migrations:

- The observed public, non-trigger SECURITY DEFINER wrappers are `admin_approve_portal_registration(uuid,uuid)`, `close_condominium_member_transfer(uuid)`, and `confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)`. Each currently has EXECUTE for `authenticated`, `postgres`, and `service_role`, not `anon` or `PUBLIC`. The approval wrapper requires `auth.uid()`, verifies workspace/module access, active condominium/member association and confirmed email, then delegates to a private routine. The transfer-confirmation wrapper rejects a supplied incoming user ID and delegates to the private implementation with a null user ID. The close-transfer wrapper delegates to its private counterpart.
- `sync_condominium_work_financial_summary(uuid)` is also SECURITY DEFINER and not trigger-attached in the observed catalog; EXECUTE is limited to `postgres` and `service_role`. It updates derived financial/progress summary fields and is not exposed to `anon`/authenticated clients.
- The inspected application RPCs use `authenticated` and `service_role` grants; the three existing lock-down migrations cover selected financial/admin/archive/restore procedures. The catalog check did not establish that every historical migration is replayable or that the live schema exactly matches branch migration contents.
- Trigger functions with PUBLIC/anon EXECUTE remain a separate least-privilege concern. Their privileges do not by themselves establish a callable RPC endpoint; do not revoke in bulk without checking direct SQL invocations and trigger attachment in the target schema. Two trigger-like signatures noted in earlier inventory have no currently attached non-internal trigger and should be investigated separately before ACL changes.

No production DDL or data writes were performed. This inspection is catalog evidence only; it is not a PostgreSQL replay, runtime authorization test, or comprehensive QA result.


### Private SECURITY DEFINER helper grants — 2026-10-04

A fresh read-only production catalog query enumerated SECURITY DEFINER functions in schema `private` and their effective EXECUTE grantees. No such routine was granted EXECUTE to `PUBLIC` or `anon` in the returned inventory. Authenticated EXECUTE is present on authorization helpers (`can_access_condominium`, `can_access_resident_condominium`, `can_access_resident_condominium_module`, `can_access_workspace_module`, `can_manage_workspace_module`, `is_workspace_admin`, `is_workspace_manager`, `is_workspace_member`, `is_workspace_staff`) and on several delegated application routines (including bootstrap, archive/restore, financial operations, registration, and security-code operations). Other implementation-only routines remain postgres-only.

The active branch does not contain `supabase/config.toml`, so the PostgREST exposed-schema list could not be verified from this repository path. Catalog grants plus schema USAGE therefore do not establish whether private functions are addressable over the Data API. Do not revoke authenticated EXECUTE wholesale: these helpers are dependencies of RLS policies and public wrappers. The safe next control is to verify the deployed exposed-schema configuration and trace each authenticated helper's policy/wrapper call sites, then apply only targeted forward-only ACL changes where direct client invocation is demonstrably unintended and supported call paths are preserved.

No production writes, DDL, grant changes, or migration-history changes were performed. This remains catalog/source review, not runtime authorization testing, clean migration replay, or comprehensive QA.
