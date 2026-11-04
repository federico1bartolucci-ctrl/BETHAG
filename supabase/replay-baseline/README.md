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
