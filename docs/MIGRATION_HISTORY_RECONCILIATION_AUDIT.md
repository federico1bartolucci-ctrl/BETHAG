# BETHAG — audit della cronologia migrazioni

Data inventario: 11 ottobre 2026.

## Regole di lettura

Questo documento confronta soltanto i nomi registrati nella tabella delle migrazioni Supabase con i nomi dei file SQL reperiti nei branch Git elencati. La corrispondenza del nome **non dimostra** che il contenuto SQL sia identico o equivalente. Le proposte basate solo sulla somiglianza del nome non vengono promosse a corrispondenze.

Non eseguire `supabase db push`, `migration repair`, reset, merge o deploy sulla base di questo inventario.

## Conteggi

- Production: 243 record di migrazione.
- QA `bethag-migration-reconciliation-qa`: 159 record dopo le due migrazioni di riconciliazione.
- File SQL distinti reperiti nell'unione dei branch (scan esteso): 341.
- Record Production con una corrispondenza nominale univoca nel primo inventario: 132.
- Record Production senza sorgente nominale recuperata dopo l'Addendum 2: 99.
- Record Production con più file candidati dallo stesso nome normalizzato nel primo inventario: 7.
- File senza corrispondenza nominale nella cronologia Production: 116 (conteggio del primo inventario; da ricalcolare sul corpus esteso).
- Corrispondenze univoche in cui timestamp/versione differisce nel primo inventario: 113.

## Branch consultati

- `main`
- `migration-reconciliation-audit-20261003`
- `bethag-migration-repair`
- `bethag-migration-repair-clean`
- `fix/migration-reconciliation-20261005`
- `fix/migration-timestamp-collisions`
- `fix/owner-reference-migration-20261003`
- `backup/pre-rollback-20261001`
- `backup/recovery-flow-20261005`
- `architecture-functional-alignment-20261003`
- `feat/member-transfer-rpc-client`
- `feature/preserve-member-database-uuid`
- `fix/member-transfer-coowners-20261002`
- `fix/member-transfer-workspace-members-lookup`
- `feature/subentro-rpc-client-20261002`
- `fix/portal-identity-flow-20261003`
- `fix/portal-transfer-reactivation`
- `integration/subentro-portal-identity-20261003`
- `sync/send-email-supabase-v7`

## Record Production senza file con nome corrispondente

| Versione registrata | Nome registrato |
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
| `20261002050057` | `secure_member_transfer_public_wrappers` |
| `20261002050232` | `assign_missing_condominium_member_legacy_id` |
| `20261002050900` | `fix_member_transfer_archived_column_check` |
| `20261002073557` | `tighten_resident_portal_identity_binding` |
| `20261002074541` | `prevent_duplicate_confirmed_member_transfers` |
| `20261003021711` | `fix_deleted_member_owner_references_workspace_scope` |
| `20261003022110` | `block_unverified_transfer_identity` |
| `20261003022133` | `gate_portal_registration_verified_identity` |
| `20261003030800` | `20261003040000_restrict_audit_log_to_workspace_admins` |
| `20261005132158` | `harden_accounting_rpc_grants_v2` |
| `20261005132314` | `finalize_operational_constraint_parity_v2` |
| `20261005132340` | `reconcile_remaining_core_columns_v2` |
| `20261005132458` | `reconcile_fund_availability_view_v2` |
| `20261005165522` | `harden_trigger_function_execute_grants` |
| `20261006011629` | `restore_member_transfer_outgoing_history_state` |
| `20261006011953` | `preserve_closing_member_history_trigger` |
| `20261006143811` | `add_transfer_closure_preflight` |
| `20261006144220` | `fix_transfer_closure_rpc_permissions` |
| `20261006181654` | `support_multiple_incoming_coowners_subentro` |
| `20261006181713` | `preserve_legacy_single_incoming_subentro_payload` |
| `20261007062039` | `fix_zero_ownership_transfer_owner_state` |

## Record Production con più file candidati nominali

| Versione registrata | Nome registrato | File candidati |
|---|---|---|
| `20261001083704` | `harden_current_owner_installment_generation` | `20261001110000_harden_current_owner_installment_generation.sql`, `20261001110500_harden_current_owner_installment_generation.sql`, `20261001110100_harden_current_owner_installment_generation.sql`, `20261001110001_harden_current_owner_installment_generation.sql` |
| `20261005132246` | `reconcile_operational_trigger_chain` | `20261005170000_reconcile_operational_trigger_chain.sql`, `20261005170100_reconcile_operational_trigger_chain.sql` |
| `20261005132441` | `remove_obsolete_function_overload` | `20261005190000_remove_obsolete_function_overload.sql`, `20261005190100_remove_obsolete_function_overload.sql` |
| `20261005132509` | `reconcile_public_function_security_parity` | `20261005191000_reconcile_public_function_security_parity.sql`, `20261005191100_reconcile_public_function_security_parity.sql` |
| `20261005132518` | `remove_obsolete_schedule_overload_final` | `20261005192000_remove_obsolete_schedule_overload_final.sql`, `20261005192100_remove_obsolete_schedule_overload_final.sql` |
| `20261005132529` | `reconcile_public_indexes` | `20261005193000_reconcile_public_indexes.sql`, `20261005193100_reconcile_public_indexes.sql` |
| `20261006020802` | `20261006040000_repair_deleted_member_owner_references` | `20261006040000_repair_deleted_member_owner_references.sql`, `20261003070000_repair_deleted_member_owner_references.sql` |

## File SQL senza corrispondenza nominale in Production

Questi file possono essere nuovi, sostitutivi, rinominati o già rappresentati da una migrazione con un nome diverso. Il nome da solo non consente di scegliere quale ipotesi sia corretta.

| File | Branch disponibile |
|---|---|
| `20260928043410_create_portal_access_baseline.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20260928070000_save_condominium_rpc.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260928081000_delete_condominium_rpc.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260928090000_collaborator_module_write_permissions.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260928093000_align_portal_request_access.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260928094000_restore_workspace_module_management_helper.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20260928160001_include_regolamento_inquilino.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260928183000_harden_resident_portal_access.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929201500_fix_resident_portal_rls.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929232000_harden_fiscal_year_closure.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930110000_accounting_consumption_and_installment_percentages.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930110000_allocation_criteria_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005` |
| `20260930195000_atomic_fiscal_year_transition.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930197000_guard_linked_ledger_entries.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930200000_harden_payment_movements_access.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/owner-reference-migration-20261003` |
| `20260930201000_guard_installment_paid_amount.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930202000_guard_millesimal_integrity.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930203000_harden_fiscal_carryover_access.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930204000_protect_fiscal_year_deletion.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930205000_guard_accounting_cascade_deletes.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930206000_guard_expense_allocation_integrity.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930207000_allow_payment_rpc_allocation_update.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930208000_guard_consumption_and_opening_balance.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930209000_guard_fund_integrity.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930210000_validate_allocation_rule_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005` |
| `20260930230000_fiscal_year_carryovers.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930231000_correct_carryover_payment_basis.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930232000_installment_schedules.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930233000_link_funds_to_ledger.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930234000_multiyear_installment_schedules.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930235000_accounting_settings.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930235500_classify_expense_type.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930290000_fix_installment_rounding_and_unification.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930300000_harden_accounting_rls_permissions.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930310000_harden_remaining_module_rls.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930320000_harden_portal_approval_rpc.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930340000_add_missing_fk_indexes.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930350000_harden_document_storage_rls.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930360000_harden_resident_document_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930370000_harden_portal_insurance_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930380000_harden_resident_unit_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930390000_harden_portal_registration_response.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930400000_harden_portal_access_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930410000_portal_publication_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930420000_harden_document_storage_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930430000_optimize_portal_rls_auth_initplan.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930440000_optimize_portal_authorization_helpers.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930450000_harden_resident_request_member_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930520000_harden_portal_email_uniqueness.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930550000_harden_archived_condominium_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001081700_protect_profile_privilege_fields.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001082000_fix_fiscal_carryover_regeneration.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001083000_payment_reversal_audit_and_reconciliation.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001083500_lock_concurrent_installment_generation.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001094100_protect_member_financial_history.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001100000_protect_member_delete_financial_history.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001103000_add_expense_deliberation_metadata.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001104500_add_condominium_member_transfer.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001110000_add_member_transfer_accounting_snapshot.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001111000_enrich_unit_transformation_preview.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001111500_capture_transfer_accounting_snapshot.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001113000_add_member_transfer_preview.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001114500_index_member_transfer_foreign_keys.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261002110000_serialize_member_transfer_by_unit.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261002120000_preserve_closed_fiscal_year_accounting.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261005151000_reconcile_condominium_archive_fk.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005161000_harden_accounting_rpc_grants.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005164000_restore_communication_recipients_audit_log.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005171000_harden_fund_availability_rls.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005172000_finalize_operational_constraint_parity.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005174000_reconcile_remaining_core_columns.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005180000_reconcile_accounting_constraint_and_rls_parity.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005191000_reconcile_fund_availability_view.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005194000_finalize_public_constraint_parity.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261006032500_reconcile_existing_transfer_outgoing_history.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20261006034000_preserve_closing_member_history.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20260928043430_create_portal_access_baseline.sql` | `bethag-migration-repair`, `bethag-migration-repair-clean` |
| `20260928050000_reconstruct_portal_access_registry.sql` | `bethag-migration-repair` |
| `20260930110100_allocation_criteria_scope.sql` | `bethag-migration-repair`, `fix/migration-timestamp-collisions` |
| `20260930200500_harden_payment_movements_access.sql` | `bethag-migration-repair` |
| `20260930210500_validate_allocation_rule_scope.sql` | `bethag-migration-repair` |
| `20261001145000_create_portal_access_registry.sql` | `bethag-migration-repair` |
| `20261001180000_restore_condominium_units_base.sql` | `bethag-migration-repair` |
| `20261002113700_restore_portal_access_runtime_guards.sql` | `bethag-migration-repair`, `bethag-migration-repair-clean` |
| `20261003150000_block_unverified_member_transfer_identity.sql` | `bethag-migration-repair` |
| `20261003170000_gate_portal_registration_identity_approval.sql` | `bethag-migration-repair` |
| `20260930200100_harden_payment_movements_access.sql` | `fix/migration-timestamp-collisions` |
| `20260930210100_validate_allocation_rule_scope.sql` | `fix/migration-timestamp-collisions` |
| `20261011110000_reconcile_launch_schema_parity.sql` | `fix/migration-timestamp-collisions` |
| `20261011120000_reconcile_function_body_and_acl_parity.sql` | `fix/migration-timestamp-collisions` |
| `20260930110001_allocation_criteria_scope.sql` | `fix/owner-reference-migration-20261003` |
| `20260930210001_validate_allocation_rule_scope.sql` | `fix/owner-reference-migration-20261003` |
| `20261003071000_block_transfer_close_with_unassigned_installments.sql` | `fix/owner-reference-migration-20261003` |
| `20261003072000_capture_transfer_unit_expenses.sql` | `fix/owner-reference-migration-20261003` |
| `20261003073000_scope_transfer_unit_expenses.sql` | `fix/owner-reference-migration-20261003` |
| `20261003074000_scope_extraordinary_transfer_allocations.sql` | `fix/owner-reference-migration-20261003` |
| `20261003075000_scope_transfer_installment_queries.sql` | `fix/owner-reference-migration-20261003` |
| `20261003076000_scope_transfer_allocation_totals.sql` | `fix/owner-reference-migration-20261003` |
| `20261003077000_scope_preview_extraordinary_allocations.sql` | `fix/owner-reference-migration-20261003` |
| `20261003078000_scope_snapshot_installment_totals.sql` | `fix/owner-reference-migration-20261003` |
| `20261003079000_scope_transfer_close_financial_positions.sql` | `fix/owner-reference-migration-20261003` |
| `20261003080000_harden_member_delete_financial_history.sql` | `fix/owner-reference-migration-20261003` |
| `20261003080100_scope_transfer_confirmation_snapshot.sql` | `fix/owner-reference-migration-20261003` |
| `20261004091000_preserve_outgoing_current_owner_flag.sql` | `fix/owner-reference-migration-20261003` |
| `20261004092000_reject_empty_installment_percentages.sql` | `fix/owner-reference-migration-20261003` |
| `20261004100000_allow_installment_overpayment_movements.sql` | `fix/owner-reference-migration-20261003` |
| `20261004101000_route_public_carryovers_to_hardened_function.sql` | `fix/owner-reference-migration-20261003` |
| `20261004102000_sync_unit_owner_refs_on_member_change.sql` | `fix/owner-reference-migration-20261003` |
| `20261004103000_validate_unit_owner_refs_same_unit.sql` | `fix/owner-reference-migration-20261003` |
| `20261004104000_restore_unit_lifecycle_genealogy_guard.sql` | `fix/owner-reference-migration-20261003` |
| `20261004105000_restore_unit_delete_legacy_guards.sql` | `fix/owner-reference-migration-20261003` |
| `20261004110000_restore_member_transfer_security_definer_wrappers.sql` | `fix/owner-reference-migration-20261003` |
| `20261004200000_revoke_public_execute_orphaned_trigger_functions.sql` | `fix/owner-reference-migration-20261003` |

## Corrispondenze nominali univoche con timestamp diversi

Queste righe sono solo una pista d'indagine; non sono autorizzazione a segnare migrazioni come applicate.

| Versione Production | Nome Production | File candidato | Branch |
|---|---|---|---|
| `20260928045907` | `expose_first_admin_bootstrap` | `20260928060000_expose_first_admin_bootstrap.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260928154019` | `handle_registration_email_mismatch` | `20260928154000_handle_registration_email_mismatch.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929081735` | `add_condominium_insurance_policies` | `20260929110000_add_condominium_insurance_policies.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929144737` | `complete_condominium_units` | `20260929165000_complete_condominium_units.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929150453` | `remove_member_millesimi` | `20260929170500_remove_member_millesimi.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929171530` | `optimize_insurance_rls_auth_calls` | `20260930194500_optimize_insurance_rls_auth_calls.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929232302` | `harden_millesimal_trigger_function_execute` | `20260930183000_harden_millesimal_trigger_function_execute.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929232531` | `validate_unit_pertinence_relationship` | `20260930184500_validate_unit_pertinence_relationship.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929233045` | `remove_duplicate_unit_relationship_trigger` | `20260930190000_remove_duplicate_unit_relationship_trigger.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260929233222` | `harden_unit_delete_integrity` | `20260930191500_harden_unit_delete_integrity.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080253` | `optional_account_security` | `20260930090000_optional_account_security.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080309` | `ensure_millesimal_rows_for_units` | `20260930180000_ensure_millesimal_rows_for_units.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080312` | `harden_millesimal_trigger_function_execute` | `20260930183000_harden_millesimal_trigger_function_execute.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080317` | `validate_unit_pertinence_relationship` | `20260930184500_validate_unit_pertinence_relationship.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080320` | `remove_duplicate_unit_relationship_trigger` | `20260930190000_remove_duplicate_unit_relationship_trigger.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080323` | `harden_unit_delete_integrity` | `20260930191500_harden_unit_delete_integrity.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080325` | `allow_authorized_unit_delete` | `20260930193000_allow_authorized_unit_delete.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080328` | `optimize_insurance_rls_auth_calls` | `20260930194500_optimize_insurance_rls_auth_calls.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930080331` | `clean_deleted_member_owner_references` | `20260930200000_clean_deleted_member_owner_references.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20260930080838` | `complete_condominium_hard_delete` | `20260930210000_complete_condominium_hard_delete.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930100924` | `installment_percentages` | `20260930240000_installment_percentages.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930100945` | `allocation_rules_and_consumption` | `20260930241000_allocation_rules_and_consumption.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930103120` | `20260930250000_manual_ai_allocation_intake` | `20260930250000_manual_ai_allocation_intake.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930103124` | `20260930260000_harden_allocation_intake_validation` | `20260930260000_harden_allocation_intake_validation.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930103128` | `20260930270000_validate_allocation_table_scope` | `20260930270000_validate_allocation_table_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930103254` | `20260930240000_installment_percentages` | `20260930240000_installment_percentages.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930103432` | `20260930120000_fix_building_scope_allocation_rpc` | `20260930120000_fix_building_scope_allocation_rpc.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930103819` | `20260930130000_harden_installment_payment` | `20260930130000_harden_installment_payment.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930104150` | `20260930150000_harden_fiscal_carryover_member_scope` | `20260930150000_harden_fiscal_carryover_member_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930104416` | `20260930160000_fiscal_carryover_compensation` | `20260930160000_fiscal_carryover_compensation.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930104518` | `20260930161000_harden_carryover_compensation_semantics` | `20260930161000_harden_carryover_compensation_semantics.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930114719` | `guard_unit_scope_changes` | `20260930211000_guard_unit_scope_changes.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930114808` | `revoke_trigger_security_definer_execute` | `20260930212000_revoke_trigger_security_definer_execute.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930114835` | `revoke_trigger_security_definer_execute_explicit_roles` | `20260930213000_revoke_trigger_security_definer_execute_explicit_roles.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930115502` | `repair_unit_owner_references` | `20260930214000_repair_unit_owner_references.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930115644` | `validate_unit_owner_member_refs` | `20260930215000_validate_unit_owner_member_refs.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930162854` | `work_accounting_integrity_indexes` | `20260930280000_work_accounting_integrity_indexes.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930174121` | `20260930460000_harden_condominium_member_visibility` | `20260930460000_harden_condominium_member_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930175443` | `20260930470000_harden_portal_approval_workspace_scope` | `20260930470000_harden_portal_approval_workspace_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930175759` | `20260930480000_scope_condominium_delete_portal_requests` | `20260930480000_scope_condominium_delete_portal_requests.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930180022` | `20260930490000_harden_profile_column_permissions` | `20260930490000_harden_profile_column_permissions.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930180302` | `20260930500000_harden_condominium_visibility` | `20260930500000_harden_condominium_visibility.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930181023` | `harden_unit_workspace_scope` | `20260930510000_harden_unit_workspace_scope.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930183113` | `fix_portal_registration_case_insensitive_upsert` | `20260930530000_fix_portal_registration_case_insensitive_upsert.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20260930183408` | `harden_condominium_delete_carryover_compensations` | `20260930540000_harden_condominium_delete_carryover_compensations.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001063530` | `lock_down_financial_rpc_anon_execute` | `20261001063800_lock_down_financial_rpc_anon_execute.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001081847` | `20261001093000_transfer_current_owner_and_portal_lifecycle` | `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001081917` | `20261001094000_index_transfer_closed_by` | `20261001094000_index_transfer_closed_by.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001082509` | `20261001095000_add_unit_cadastral_transformations` | `20261001095000_add_unit_cadastral_transformations.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001082537` | `20261001095700_index_unit_transformation_audit_fks` | `20261001095700_index_unit_transformation_audit_fks.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001082731` | `20261001102100_unit_transformation_snapshots` | `20261001102100_unit_transformation_snapshots.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261001090203` | `validate_unit_transformation_preview_inputs` | `20261001130000_validate_unit_transformation_preview_inputs.sql` | `bethag-migration-repair` |
| `20261001090447` | `guard_confirmed_unit_transformation_integrity` | `20261001133000_guard_confirmed_unit_transformation_integrity.sql` | `bethag-migration-repair` |
| `20261001090613` | `lock_confirmed_unit_transformation_audit` | `20261001140000_lock_confirmed_unit_transformation_audit.sql` | `bethag-migration-repair` |
| `20261001090904` | `require_trusted_unit_transformation_confirmation` | `20261001150000_require_trusted_unit_transformation_confirmation.sql` | `bethag-migration-repair` |
| `20261001091036` | `require_confirmed_genealogy_for_unit_lifecycle` | `20261001153000_require_confirmed_genealogy_for_unit_lifecycle.sql` | `bethag-migration-repair` |
| `20261001091151` | `validate_confirmed_unit_transformation_genealogy` | `20261001160000_validate_confirmed_unit_transformation_genealogy.sql` | `bethag-migration-repair` |
| `20261001091322` | `require_active_units_for_transformation_confirmation` | `20261001170000_require_active_units_for_transformation_confirmation.sql` | `bethag-migration-repair` |
| `20261001091431` | `require_resolved_reviews_for_confirmed_unit_transformations` | `20261001173000_require_resolved_reviews_for_confirmed_unit_transformations.sql` | `bethag-migration-repair` |
| `20261002045022` | `fix_member_portal_workspace_transfer` | `20261001101500_fix_member_portal_workspace_transfer.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261002045430` | `fix_member_transfer_workspace_members_lookup` | `20261002060000_fix_member_transfer_workspace_members_lookup.sql` | `main`, `migration-reconciliation-audit-20261003`, `bethag-migration-repair-clean`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261002074251` | `fix_member_transfer_status_constraint` | `20261004090000_fix_member_transfer_status_constraint.sql` | `fix/owner-reference-migration-20261003` |
| `20261003043520` | `preserve_transfer_extraordinary_allocations` | `20261003050000_preserve_transfer_extraordinary_allocations.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261003043706` | `expose_captured_transfer_snapshot` | `20261003052000_expose_captured_transfer_snapshot.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261003045727` | `expand_member_transfer_preview_installments` | `20261003060000_expand_member_transfer_preview_installments.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261003045905` | `preserve_future_installments_transfer_snapshot` | `20261003061000_preserve_future_installments_transfer_snapshot.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261003050209` | `include_unit_unassigned_installments_in_transfer` | `20261003062000_include_unit_unassigned_installments_in_transfer.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261003050443` | `include_unit_unassigned_carryovers_in_transfer` | `20261003063000_include_unit_unassigned_carryovers_in_transfer.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261003050722` | `block_transfer_close_with_unresolved_unit_carryovers` | `20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql` | `main`, `migration-reconciliation-audit-20261003`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions`, `fix/owner-reference-migration-20261003` |
| `20261005131809` | `harden_portal_approval_workspace_scope_reconciled` | `20261005080000_harden_portal_approval_workspace_scope_reconciled.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131827` | `reconcile_portal_member_link_and_transfer_archive_state` | `20261005090000_reconcile_portal_member_link_and_transfer_archive_state.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131836` | `reconcile_complete_member_transfer_chain` | `20261005100000_reconcile_complete_member_transfer_chain.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131842` | `reconcile_member_transfer_preview_chain` | `20261005103000_reconcile_member_transfer_preview_chain.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131847` | `reconcile_portal_rpc_grants` | `20261005110000_reconcile_portal_rpc_grants.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131856` | `reconcile_member_transfer_rpc_grants` | `20261005111000_reconcile_member_transfer_rpc_grants.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131902` | `reconcile_portal_approval_rpc_security` | `20261005112000_reconcile_portal_approval_rpc_security.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131907` | `finalize_public_transfer_and_approval_invoker_wrappers` | `20261005124000_finalize_public_transfer_and_approval_invoker_wrappers.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131913` | `harden_private_portal_registration_execute` | `20261005125000_harden_private_portal_registration_execute.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131922` | `reconcile_private_portal_rpc_implementations` | `20261005130000_reconcile_private_portal_rpc_implementations.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131932` | `revoke_direct_private_portal_rpc_execute` | `20261005131000_revoke_direct_private_portal_rpc_execute.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131938` | `reconcile_resident_archive_visibility` | `20261005132000_reconcile_resident_archive_visibility.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131943` | `harden_resident_condominium_archive_access` | `20261005133000_harden_resident_condominium_archive_access.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131948` | `revoke_direct_portal_trigger_execute` | `20261005140000_revoke_direct_portal_trigger_execute.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005131958` | `reconcile_member_portal_sync_trigger` | `20261005141000_reconcile_member_portal_sync_trigger.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132005` | `reconcile_member_portal_integrity_triggers` | `20261005142000_reconcile_member_portal_integrity_triggers.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132012` | `reconcile_member_transfer_constraints` | `20261005143000_reconcile_member_transfer_constraints.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132016` | `reconcile_member_transfer_portal_indexes` | `20261005144000_reconcile_member_transfer_portal_indexes.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132021` | `reconcile_member_indexes` | `20261005145000_reconcile_member_indexes.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132026` | `reconcile_core_lookup_indexes` | `20261005150000_reconcile_core_lookup_indexes.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132053` | `finalize_public_portal_transfer_wrappers` | `20261005152000_finalize_public_portal_transfer_wrappers.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132058` | `reconcile_core_rls_policies` | `20261005153000_reconcile_core_rls_policies.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132103` | `reconcile_member_transfer_rls` | `20261005154000_reconcile_member_transfer_rls.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132108` | `reconcile_accounting_rls_policies` | `20261005155000_reconcile_accounting_rls_policies.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132116` | `reconcile_accounting_table_grants` | `20261005160000_reconcile_accounting_table_grants.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132208` | `harden_core_public_rpc_grants` | `20261005162000_harden_core_public_rpc_grants.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132213` | `reconcile_budget_funds_millesimal_rls` | `20261005163000_reconcile_budget_funds_millesimal_rls.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132235` | `restore_operational_work_register_and_transform_tables` | `20261005165000_restore_operational_work_register_and_transform_tables.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132241` | `reconcile_operational_table_grants` | `20261005170000_reconcile_operational_table_grants.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132321` | `reconcile_private_registration_grant` | `20261005173000_reconcile_private_registration_grant.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132407` | `reconcile_public_table_privileges` | `20261005183000_reconcile_public_table_privileges.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132415` | `restore_missing_private_function_parity` | `20261005184000_restore_missing_private_function_parity.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132420` | `restore_missing_public_function_parity` | `20261005185000_restore_missing_public_function_parity.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132430` | `reconcile_public_function_acl` | `20261005190000_reconcile_public_function_acl.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132514` | `reconcile_public_relation_acl` | `20261005192000_reconcile_public_relation_acl.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132524` | `harden_guard_installment_parent_delete_grant` | `20261005193000_harden_guard_installment_parent_delete_grant.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132555` | `normalize_remaining_rls_policy_definitions` | `20261005195000_normalize_remaining_rls_policy_definitions.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005132605` | `reconcile_public_triggers` | `20261005200000_reconcile_public_triggers.sql` | `main`, `fix/migration-reconciliation-20261005`, `fix/migration-timestamp-collisions` |
| `20261005134740` | `reconcile_login_workspace_access_rpc` | `20261005201000_reconcile_login_workspace_access_rpc.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20261005135425` | `expose_login_workspace_access_rpc` | `20261005203000_expose_login_workspace_access_rpc.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20261005185327` | `20261005205500_restore_save_condominium_rpc_execute` | `20261005205500_restore_save_condominium_rpc_execute.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20261005190825` | `20261005191000_restore_member_transfer_private_execute_grant` | `20261005211000_restore_member_transfer_private_execute_grant.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20261005190940` | `20261005192000_fix_member_transfer_workspace_members_update` | `20261005212000_fix_member_transfer_workspace_members_update.sql` | `main`, `fix/migration-timestamp-collisions` |
| `20261006011620` | `restore_closing_member_history` | `20261006032000_restore_closing_member_history.sql` | `main`, `fix/migration-timestamp-collisions` |

## Esito e criterio di sicurezza

La cronologia non è ancora riproducibile in modo dimostrato. Per ogni voce non corrispondente serve recuperare il contenuto originale o dimostrare l'equivalenza tramite il diff SQL e lo stato degli oggetti risultanti. In particolare, non si deve trattare la parità attuale di tabelle/funzioni come prova che il replay storico sia sicuro.

La Production è stata consultata in sola lettura. Questo audit non modifica dati, schema o cronologia di Production.


## Addendum 2 — recupero di sorgenti SQL con versione e nome esatti (11 ottobre 2026)

La ricerca estesa ha recuperato quattro file che corrispondono esattamente a versione e nome di record Production precedentemente elencati come privi di sorgente. Sono stati letti dal branch indicato e ne è stato registrato il blob SHA Git. Questo prova la reperibilità del file in quel branch, ma non certifica da solo che il contenuto sia byte-per-byte identico al file eseguito storicamente in Production; prima di un replay occorre comunque verificarne dipendenze e comportamento sul database isolato.

| Versione | Migrazione | Branch sorgente | Blob SHA | File |
|---|---|---|---|---|
| `20261002050900` | `fix_member_transfer_archived_column_check` | `feat/member-transfer-rpc-client` | `4272f9af58c27c93e3e3f2b3ea08404256c12956` | [SQL](https://github.com/federico1bartolucci-ctrl/BETHAG/blob/feat/member-transfer-rpc-client/supabase/migrations/20261002050900_fix_member_transfer_archived_column_check.sql) |
| `20261003021711` | `fix_deleted_member_owner_references_workspace_scope` | `fix/portal-identity-flow-20261003` | `f670135456bfb5e588439c5c16e514a8bbd13d93` | [SQL](https://github.com/federico1bartolucci-ctrl/BETHAG/blob/fix/portal-identity-flow-20261003/supabase/migrations/20261003021711_fix_deleted_member_owner_references_workspace_scope.sql) |
| `20261003022110` | `block_unverified_transfer_identity` | `fix/portal-identity-flow-20261003` | `e8061e7c3028ede9fccb550b3e5b91cbc315923c` | [SQL](https://github.com/federico1bartolucci-ctrl/BETHAG/blob/fix/portal-identity-flow-20261003/supabase/migrations/20261003022110_block_unverified_transfer_identity.sql) |
| `20261003022133` | `gate_portal_registration_verified_identity` | `fix/portal-identity-flow-20261003` | `81b9cff06f4a6b3b05789fd086c16fa35c7debdc` | [SQL](https://github.com/federico1bartolucci-ctrl/BETHAG/blob/fix/portal-identity-flow-20261003/supabase/migrations/20261003022133_gate_portal_registration_verified_identity.sql) |
| `20261003030800` | `20261003040000_restrict_audit_log_to_workspace_admins` (il nome registrato contiene un timestamp ulteriore) | `fix/portal-identity-flow-20261003` | `7e755f3107d3e2e0dfdeb4c5f794991eb3b464a3` | [SQL](https://github.com/federico1bartolucci-ctrl/BETHAG/blob/fix/portal-identity-flow-20261003/supabase/migrations/20261003030800_restrict_audit_log_to_workspace_admins.sql) |

Queste cinque sorgenti sono recuperate. Il conteggio nominale dei record Production senza sorgente scende da 104 a 99; i restanti record non vanno ricostruiti per supposizione. Nessun replay, repair della cronologia o modifica a Production è stato eseguito.


## Addendum 3 — controllo della cronologia Git per sorgenti mancanti (11 ottobre 2026)

È stata interrogata anche la cronologia dei commit del repository per i percorsi SQL esatti delle seguenti voci Production. L'API GitHub non restituisce commit per questi percorsi nel branch predefinito; la ricerca per nome nei file dei branch già inventariati non ha individuato le sorgenti esatte:

- `supabase/migrations/20260928021707_initial_bethag_backend.sql`
- `supabase/migrations/20260928021935_sync_auth_profiles.sql`
- `supabase/migrations/20260929071513_add_condominium_works.sql`

Per `add_condominium_works` è stato individuato un commit funzionale del 30 settembre 2026 che aggiunge il modulo lavori all'applicazione, ma il diff disponibile riguarda il codice applicativo e non fornisce il file SQL originario. Analogamente, commit applicativi sul bootstrap dell'amministratore e sui documenti non costituiscono sorgenti delle rispettive migrazioni.

**Conclusione:** questi riscontri non dimostrano che le migrazioni non siano mai esistite; dimostrano soltanto che i percorsi SQL esatti non sono recuperabili dalla cronologia consultata. Non ricostruire il contenuto originario a intuito e non usare gli attuali oggetti del database come sostituto automatico di una migrazione storica. Prima di definire un replay pulito serve una baseline esplicita, derivata da uno schema documentato e validata in un ambiente isolato.


## Addendum 4 — distinzione tra sorgenti storiche e ricostruzioni temporanee (11 ottobre 2026)

La cronologia della PR #14 contiene commit che aggiungevano migrazioni di ricostruzione per allineare il precedente ambiente QA, seguiti da commit che le rimuovevano esplicitamente. Esempio verificato: `20261005113000_reconcile_qa_unit_and_archive_baseline.sql`, aggiunta nel commit `699d763259fe78b3d7c11ce027d2e1ee9780cf34` e rimossa nel commit `ab63e894518412745e05a02cf781d2e4a6a6309f`, con lo stesso blob SHA `a14ed83559b0cc64aaef90db4359241b77ba73e7`.

Questi file documentano tentativi di ricostruzione dello stato QA, non sono automaticamente le migrazioni originali eseguite in Production e non possono colmare i record storici mancanti. La PR #14 è stata integrata, ma le migrazioni temporanee rimosse non fanno parte del suo diff finale. Non reintrodurle nel flusso canonico senza una revisione separata di dipendenze, ordine, idempotenza e comportamento su un ambiente isolato.

La migrazione `20260928043410_create_portal_access_baseline.sql` è invece presente nel repository, ma il suo scopo documentato è il baseline della tabella di accesso al portale: non è sostitutiva di `initial_bethag_backend` né dimostra la ricostruzione del blocco iniziale di schema.
