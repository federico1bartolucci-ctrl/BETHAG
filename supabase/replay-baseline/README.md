# Disposable replay baseline

This directory contains schema objects that demonstrably predate the first entry in Production's recovered migration ledger.

## portal_access

The first 16 recovered ledger payloads do not create `public.portal_access`. The 17th payload (`20260928043547_restrict_data_api_table_grants`) revokes/grants privileges on it; subsequent early payloads alter its existing RLS policy and create indexes against it. The table therefore existed before the first recorded migration and must be present when replaying the ledger.

The baseline SQL is intentionally separate from:
- `supabase/recovered-production-ledger/`: verbatim SQL payloads from the live Production ledger;
- `supabase/replay-candidate/`: byte-identical copies of those 247 payloads.

Its table columns, constraints, and indexes were reconstructed from a read-only Production catalog inspection on 2026-11-03. The pre-existing resident SELECT policy is included because migration `20260928043618` alters that named policy rather than creating it.

This is a **test-only prerequisite** for the disposable PostgreSQL 17 replay. It is not a new Production migration, must not be deployed to QA or Production, and must not be added to the recovered 247-entry archive. If additional pre-ledger objects are discovered by subsequent replay failures, document and isolate them here rather than editing historical payloads.

## Resident access helper

The recovered `20260928043823_restrict_private_security_definer_functions` payload also revokes and grants EXECUTE on `private.can_access_resident_condominium(uuid)`. Its first definition in the recorded ledger is later, at `20260930185324_optimize_private_auth_rls_helpers`. The earlier ACL operation therefore proves that this helper was present in Production before that ledger entry, but its original out-of-ledger definition is not preserved in the 247 payloads.

For replay only, the baseline seeds the earliest recoverable implementation from the later recorded migration. That later migration still executes in chronological order and replaces the helper with its exact ledger definition. This is an explicit reconstruction assumption, not a claim that the 20260930185324 SQL was the original pre-ledger source.

## Expense allocation relation

Production's first recorded reference to `public.condominium_expense_allocations` is migration `20260929065325_add_allocation_table_reference`, which immediately alters the table to add `allocation_table_id`. No `CREATE TABLE public.condominium_expense_allocations` payload exists in the 247-row ledger. The disposable replay therefore requires this relation as another pre-ledger object.

The baseline reconstructs only the core pre-reference columns and foreign keys from the live Production catalog and the chronological requirements of the recovered migrations. It deliberately leaves `allocation_table_id`, later indexes/check constraints, RLS policies, and triggers to the historical payloads that add or reconcile them. This is a documented reconstruction assumption, not a recovered original DDL statement. It is test-only and must never be deployed to QA or Production.

## Accounting ledger entries relation

The recovered Production ledger also contains no `CREATE TABLE` payload for `public.condominium_ledger_entries`, although the early recorded allocation RPCs and accounting trigger migrations reference it. The relation is therefore another pre-ledger object required for a chronological replay. Its columns were reconstructed from the read-only Production catalog. The baseline creates only the table and primary key; later ledger payloads remain responsible for the indexes, RLS policies, constraints and trigger definitions they introduce or reconcile. This is a test-only reconstruction and not an original historical DDL payload.

## Chronological unit foreign key bridge

The pre-ledger `condominium_expense_allocations` relation has a `unit_id` foreign key in the live Production catalog, but the referenced `public.condominium_units` table is created later by recovered migration `20260928154553_add_condominium_units_and_member_unit_link_v2`. The first replay attempt exposed this ordering dependency: defining the foreign key in the initial pre-ledger baseline fails because the units relation does not exist yet.

The baseline therefore creates `unit_id` as a UUID column without that foreign key. A second replay-only prerequisite, timestamped `20260928154554`, restores the exact foreign key immediately after the historical migration creates `condominium_units`. The replay workflow stages both prerequisites and the 247 untouched historical payloads together; Supabase CLI applies them in filename/version order. This preserves chronology and avoids inventing a pre-ledger unit table or modifying historical SQL.

## Millesimal tables relation

Production's first recorded reference to `public.condominium_millesimal_tables` is migration `20260929065325_add_allocation_table_reference`, which immediately adds a foreign key from expense allocations to this relation. The recovered 247-row ledger contains later function, trigger, and allocation-rule references, but no `CREATE TABLE public.condominium_millesimal_tables` statement. The live Production catalog confirms that the relation already exists. It is therefore a further pre-ledger dependency required before replay reaches version `20260929065325`.

The replay baseline `20260929065324_legacy_condominium_millesimal_tables.sql` reconstructs its 14 columns, primary key, two foreign keys, and three check constraints from the read-only Production catalog. It intentionally does not pre-create its policies, secondary indexes, or triggers: the later recorded migrations reconcile those objects in chronological order. This remains a test-only reconstruction, not an original historical payload, and must never be deployed to QA or Production.

## Fiscal years relation

Production contains `public.condominium_fiscal_years`, but the recovered 247-entry ledger has no `CREATE TABLE` payload for it. Migration `20260929070002_add_condominium_budget` immediately creates a foreign key to this relation, so it must exist before that historical entry is replayed.

The replay-only baseline `20260929065620_legacy_condominium_fiscal_years.sql` reconstructs the 11 columns, primary key, workspace/condominium foreign keys, and core date/balance checks from the read-only Production catalog. It intentionally does not pre-create secondary indexes, RLS policies, or triggers; later historical payloads remain responsible for reconciling those objects. The exclusion constraint/index for overlapping fiscal periods is likewise not synthesized here: replay must establish it only through its recorded chronological migration, if present. This file is a test-only prerequisite and must never be deployed to QA or Production.

## Installments relation

Production contains `public.condominium_installments`, but the recovered 247-entry ledger has no historical `CREATE TABLE` payload for it. Its first recorded use is migration `20260929065622_add_installments_from_allocations_rpc`, which inserts into the relation; the next accounting-guard migration also attaches triggers to it. The table must therefore predate those recorded entries.

The replay-only baseline `20260929065621_legacy_condominium_installments.sql` reconstructs the 15 columns, primary key, and core foreign keys from the read-only Production catalog. The fiscal-years prerequisite is deliberately ordered immediately before it because `fiscal_year_id` references `condominium_fiscal_years`; unit/member/ledger references are also present at that point in the replay chronology. Secondary indexes, validation checks, RLS policies, and triggers are left to later historical payloads. This is a documented reconstruction assumption, not an original SQL payload, and must never be deployed to QA or Production.

## Payment movements relation

Production contains `public.condominium_payment_movements`, but the recovered 247-entry ledger has no `CREATE TABLE` payload for it. The first recorded closed-accounting migration creates a trigger on this relation, and subsequent payment RPCs read and write it; it therefore predates those recorded operations.

The replay-only baseline `20260929070814_legacy_condominium_payment_movements.sql` reconstructs its 10 columns, primary key, workspace/condominium/installment foreign keys, and positive-amount check from the read-only Production catalog. The prerequisite is ordered after installments and immediately before the first migration that attaches its accounting trigger. Secondary indexes, RLS policies, and triggers are left to later historical payloads. This is a test-only reconstruction, not recovered historical SQL, and must never be deployed to QA or Production.

## Special funds relation

Production contains `public.condominium_funds`, but no `CREATE TABLE` for it appears in the recovered 247-entry ledger. The first recorded dependency is `20260929072255_link_works_special_funds`, which adds a foreign key from condominium works to this relation. It must therefore predate that migration.

The replay-only baseline `20260929072254_legacy_condominium_funds.sql` reconstructs the 12 columns, primary key, workspace/condominium foreign keys, and amount checks from a read-only Production catalog inspection on 2026-11-04. Secondary indexes, RLS policies, and triggers are intentionally left to the later historical payloads that reconcile them. This is a test-only reconstruction, not recovered historical SQL, and must never be deployed to QA or Production.



## Additional pre-ledger relations reconstructed — 2026-11-04

A read-only Production catalog inventory identified five more public relations present in Production but absent as CREATE TABLE payloads from the 247 recovered ledger statements. Timestamped replay-only prerequisites now place them immediately before their earliest recorded use: `20260929065323` condominium_accounting_settings; `20260929080143` condominium_millesimal_values; `20260930104149` condominium_fiscal_carryovers; `20261001063434` communication_recipients; `20261001081846` condominium_member_transfers. The Production-only `condominiums.archived_at` column is restored by a replay-only bridge at `20261001083703`, immediately before its first recorded reference at `20261001083704`.

The original 247 payloads remain byte-for-byte unchanged. The replay workflow asserts 13 prerequisite SQL files plus 247 historical payloads (260 staged SQL files total). These files are synthetic test scaffolding reconstructed from the read-only Production catalog and chronological references, not recovered historical SQL. They must never be deployed to QA or Production. Full PostgreSQL 17 replay and final schema parity remain mandatory closure gates.


## Pre-ledger authorization helper seed — 2026-11-04

The first chronological replay after the table reconstruction passed the earlier accounting, millesimal, fiscal carryover, communication recipient and member-transfer prerequisites, then reached `20260929093700_align_condominium_manager_authorization.sql`. That payload creates a policy which calls `private.can_manage_workspace_module(uuid,text)`, while the first definition preserved in the recovered ledger is later, at `20260930185301_optimize_workspace_manager_rls_auth_check.sql`. The early call proves the helper already existed before its first recorded definition. A replay-only seed at `20260929093659` now installs the earliest recoverable implementation; the later historical payload still replaces it in chronological order. This is an explicit reconstruction assumption, not an assertion that the seeded SQL is the original pre-ledger text.

The replay workflow now asserts 14 prerequisite SQL files plus 247 exact historical payloads (261 staged SQL files total). The helper seed is not part of the recovered archive and must never be deployed to QA or Production.


## Additional pre-ledger accounting and communication relations

A full catalog inventory on 2026-11-04 identified five more relations referenced by the 247 recorded payloads but never created by any of them. Their table definitions were reconstructed from the read-only Production catalog and added as replay-only prerequisites:

- `condominium_accounting_settings` (before first recorded accounting setup references);
- `condominium_millesimal_values` (immediately before the first FK/index migration at `20260929080144`);
- `condominium_fiscal_carryovers` (immediately before the first recorded carryover generator at `20260930104150`);
- `communication_recipients` (immediately before its first recorded indexes at `20261001063435`);
- `condominium_member_transfers` (immediately before its first recorded RPC/lifecycle migration at `20261001081847`).

The same inventory confirmed `condominiums.archived_at` exists in Production but is not added by any of the 247 recovered SQL payloads. The replay-only bridge adds that column immediately before its first recorded use in `20261001083704`.

These additions raise the disposable replay prerequisite count from 9 to 15. The workflow must stage 15 baseline files plus the 247 byte-identical historical payloads (262 SQL files total). The synthetic prerequisites are not historical ledger entries, are not part of the 247-file archive, and must never be deployed to QA or Production.


## Pre-ledger millesimal trigger helper seeds — 2026-11-04

The chronological static audit found two more pre-ledger function dependencies: `public.ensure_unit_millesimal_values()` and `public.ensure_table_millesimal_values()`. The recovered ledger revokes EXECUTE on both at `20260929232302_harden_millesimal_trigger_function_execute.sql`, but first records their definitions at `20260930080309_ensure_millesimal_rows_for_units.sql`. The ACL operations prove the functions already existed before the revocation. A replay-only seed at `20260929232301` now installs the exact recoverable function bodies; the later historical migration replaces them and attaches its triggers as recorded. No historical payload was modified.

The workflow now asserts 15 replay-only prerequisite files plus 247 historical payloads (262 staged SQL files total). These two helper seeds are test-only and must never be deployed to QA or Production.


## Pre-ledger private transfer-close implementation — 2026-11-04

The first recorded operation on `private.close_condominium_member_transfer(uuid)` is `ALTER FUNCTION` in `20261001081847`, but none of the 247 recovered payloads creates this private function. A read-only `pg_get_functiondef` from Production confirms the live implementation. The implementation is therefore included after the `condominium_member_transfers` table in the same replay-only prerequisite file at `20261001081846`. It includes the current financial closure checks and the unit-carryover guard. The later historical migration `20261003050722` explicitly exits when that guard is already present, so it remains compatible and idempotent. This is a replay reconstruction from current Production state, not recovered original pre-ledger SQL; it must never be deployed to QA or Production.


## Pre-ledger public RPC implementations — 2026-11-04

Static inspection of `20260930235538_harden_public_rpc_security_definer_boundaries.sql` found six `ALTER FUNCTION public.* SET SCHEMA private` operations for which no earlier CREATE exists in the recovered 247 payloads: `archive_condominium`, `close_condominium_fiscal_year`, `close_fiscal_year_and_generate_carryovers`, `confirm_condominium_creation_intake`, `list_archived_condominiums`, and `restore_condominium`. The `ALTER` statements prove that these public functions existed before that migration. Their current Production definitions were retrieved read-only with `pg_get_functiondef` and seeded under the public schema at `20260930235537`; the following historical migration then moves them into `private`, and later ledger payloads reconcile their implementations and wrappers. This is a replay reconstruction from current Production definitions, not recovered original SQL. The file is synthetic test scaffolding and must never be deployed to QA or Production.

The workflow now asserts 16 replay-only prerequisite files plus 247 exact historical payloads (263 staged SQL files total).


## Pre-ledger trigger functions — 2026-11-04

The replay next reached `20260930114808_revoke_trigger_security_definer_execute.sql`, which revokes privileges from six trigger functions that have no CREATE statement in the 247 recovered payloads: `guard_consumption_reading_integrity`, `guard_expense_allocation_integrity`, `guard_fiscal_year_opening_balance`, `guard_fund_integrity`, `prevent_fiscal_year_delete`, and `validate_allocation_rule_scope`. The seventh function in that revoke list, `guard_unit_scope_changes`, is created by the immediately preceding recorded migration and needs no seed. The six missing functions were recovered read-only from Production using `pg_get_functiondef` and added at `20260930100944`, before the first recorded revoke. They are synthetic pre-ledger compatibility seeds; the historical payloads still perform their recorded ACL operations. Never deploy this file to QA or Production.

The replay workflow now asserts 17 replay-only prerequisite files plus 247 historical payloads (264 staged SQL files total).


## Additional pre-ledger accounting trigger functions — 2026-11-04

The public ACL reconciliation at `20261005132430` grants EXECUTE to 12 more trigger functions for which no earlier CREATE appears in the 247 payloads. They were retrieved read-only from Production with `pg_get_functiondef` and seeded at `20260930190447`, before the earliest recorded use of `guard_installment_paid_amount_update` in `20260930190448`. The remaining 11 are required by the ACL reconciliation before later migrations redefine some of them. All 12 are PL/pgSQL trigger functions and are test-only compatibility seeds; no historical SQL payload is altered.

The workflow now asserts 18 replay-only prerequisite files plus 247 historical payloads (265 staged SQL files total).


## Additional pre-ledger condominium metadata columns — 2026-11-04

A full column inventory compared the 612 columns on Production base tables with all recovered CREATE TABLE and ALTER TABLE ADD COLUMN statements. It identified three further columns absent from the 247-payload history and not added by any later historical migration: `condominium_units.building_code`, `condominiums.archived_by`, and `condominiums.archive_reason`. `building_code` is restored immediately after `condominium_units` is created at `20260928154555`, before its first SQL-function reference. The three condominium archive metadata columns (`archived_at`, `archived_by`, `archive_reason`) are restored together at `20261001083703`; this is before the later archive-by index and RPC reconciliation. The `archived_by` FK to `public.profiles(id)` and all types/nullability/defaults match the read-only Production catalog.

The same inventory found `condominium_creation_intakes.created_condominium_id` and `documents.file_size_bytes` missing at that point in the replay, but both are added by the recorded historical migration `20261005132340_reconcile_remaining_core_columns_v2.sql`; no baseline copy was added for them.

The replay workflow now asserts 19 replay-only prerequisite files plus 247 exact historical payloads (266 staged SQL files total).


## Pre-ledger audit-log read policy — 2026-11-04

A static audit of every `ALTER POLICY` in the recovered sequence found one policy altered without an earlier CREATE: `public.condominium_audit_log_read_manager`, first altered by `20261003030800`. The preceding table migration creates a separate all-operations manager policy, but not this named SELECT policy. The missing policy is seeded at `20260929075202` with the prior workspace-manager predicate; the later historical migration tightens it to `private.is_workspace_admin(workspace_id)`. This replay-only policy seed is not part of the recovered archive and must never be deployed to QA or Production.

The replay workflow now asserts 20 replay-only prerequisite files plus 247 exact historical payloads (267 staged SQL files total).


## Pre-ledger transfer accounting snapshot RPC — 2026-11-04

The recovered migration `20261003043706_expose_captured_transfer_snapshot.sql` patches `public.get_member_transfer_accounting_snapshot(uuid)` through `pg_get_functiondef`, but the first CREATE statement for that RPC in the ledger appears later at `20261005132420`. The current Production definition was retrieved read-only and seeded at `20261003043705`. It already includes the captured snapshot property, so the historical patch's explicit idempotency guard exits without modifying it. This is a replay-only compatibility seed, not recovered original SQL; never deploy it to QA or Production.

The workflow now asserts 21 replay-only prerequisite files plus 247 exact historical payloads (268 staged SQL files total).


## Pre-ledger transfer preview RPC — 2026-11-04

The historical migration `20261003045727` patches `public.preview_condominium_member_transfer(uuid,uuid,date)` by inspecting its current function definition, but the recovered ledger does not create the RPC until later. Its live Production definition, result type, security mode, search path and ACL were inspected read-only. The function is seeded immediately before the patch at `20261003045726`, preserving the historical migration's own chronological modification. This is a test-only reconstruction and must never be deployed to QA or Production.

The workflow now asserts 22 replay-only prerequisite SQL files plus 247 exact historical payloads (269 staged SQL files total).
