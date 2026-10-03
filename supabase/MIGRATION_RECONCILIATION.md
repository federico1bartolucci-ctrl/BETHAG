# Supabase migration reconciliation — BETHAG

Branch: `fix/owner-reference-migration-20261003`

## Purpose and safety

This is a working reconciliation ledger, not a deployment plan. A filename/name match is only a candidate association; it does **not** prove that the SQL contents are identical or that a migration is safe to replay. No production migration should be run from this ledger alone. Verify SQL content, dependencies, and actual schema state before proposing any history repair or deployment.

Snapshot: 177 remote migration-history records and 138 SQL files in the branch. The 14-digit filename version prefixes are unique (no duplicates detected in this snapshot).

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
