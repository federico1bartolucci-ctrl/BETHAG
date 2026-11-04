# QA migration lineage and recovery assessment — 2026-11-04

## Scope and safety

This is a read-only reconstruction of the Supabase branch `bethag-launch-qa` (project `jhuyhlzzydcgghrzeexn`) against the recovered Production ledger, the clean-install baseline branch, and the canonical release candidate.

No SQL, migration, reset, rebase, deploy, or migration-history repair was executed against QA or Production. Do not run a generic `supabase migration repair --linked` command. The QA branch contains test data and must not be reset or rebuilt in place without an explicit approved recovery plan and verified restore.

## Current evidence

- Supabase branch status: `MIGRATIONS_FAILED`; preview project status: `ACTIVE_HEALTHY`.
- QA migration registry: 49 rows.
- Recovery archive: 247 byte-preserved Production ledger SQL payloads in `supabase/replay-candidate/`.
- Clean-install canonical migration chain on `release/reconcile-production-247-20261103`: 23 SQL files.
- Isolated PostgreSQL 17 replay and guarded 14-migration cutover rehearsal: CI run 41819086300 succeeded (commit `6c0af4a77124cdc8eee7e709856065271598e8bd`). These checks do not repair or certify the existing QA branch.

## Reconstructed QA ledger composition — corrected live count

A fresh direct query of `supabase_migrations.schema_migrations` and a fresh Supabase migration-list call both return **34 rows**, not 49. The earlier 49-row figure in a preliminary inventory was stale/incorrect and is superseded by this direct database evidence.

The 34 rows divide into:

1. **17 exact version matches** with the current 23-file canonical clean-install chain: five 20261017 baseline migrations, nine 20261022–20261023 hardening migrations, and three 20261027–20261028 fixes.
2. **17 QA-only / differently-versioned rows** listed below. Their actual SQL text is retained in `supabase_migrations.schema_migrations.statements` (one statement per row); their names alone are not sufficient evidence of equivalence.

### Recovered baseline files

The five original SQL files were recovered from PR #20 head `rebuild/bethag-clean-aligned-20261022`. Their exact Git blob SHAs are:

- `20261017000001_bethag_baseline_schema.sql` — `74fa7a583e9cc4025676b79d183b466b1b923e8e`
- `20261017000002_bethag_baseline_indexes_views.sql` — `d0863d0ab0adc2ccaa011fc9e332abd5d34099dd`
- `20261017000003_bethag_baseline_functions.sql` — `84233dbed77af90eaeea2c221c76de27734cd9eb`
- `20261017000004_bethag_baseline_security.sql` — `0988cd5cbddaa2a41bbffc69aa148f25c2e44600`
- `20261017000005_bethag_baseline_grants.sql` — `4707784459260e557c576b8a7a08c130dc54fb43`

### All 17 rows without an exact version match

| QA version | QA ledger name | SQL effect / disposition |
|---|---|---|
| 20261102041805 | repair_authenticated_communication_rpc_private_execute | Replaces `private.reset_stale_communication_recipients`; its initial SQL does not scope the queued-recipient UPDATE to `p_communication_id`. Later canonical fix 20261102200855 adds the specific communication filter and grant. Treat this first implementation as superseded, not replayable as-is. |
| 20261102043152 | repair_authenticated_condominium_delete_rpc_private_execute | Grants authenticated EXECUTE on private delete implementation after revoking PUBLIC/anon. No exact canonical counterpart yet; review wrapper path and authorization checks before deciding whether to carry forward. |
| 20261102043315 | persist_condominium_archive_columns | Replaces private `save_condominium` with archive-aware behavior. The later canonical archive-preservation migration 20261102100200 carries the server-owned archive state behavior. |
| 20261102044002 | repair_condominium_archive_rpc_and_json | Replaces private `archive_condominium`; writes archive metadata to dedicated columns and JSON data. Canonical archive functions require semantic comparison; do not discard JSON synchronization without confirming frontend dependency. |
| 20261102044102 | repair_authenticated_condominium_archive_rpc_private_execute | Grants authenticated EXECUTE to private archive/restore implementations. Needed only with the public SECURITY INVOKER wrapper call path; reconcile with the exact canonical wrapper/grant model. |
| 20261102044224 | repair_authenticated_invoker_private_rpc_grants | Grants authenticated EXECUTE to multiple private registration, archive and payment implementations. Review function-by-function; broad migration is not to be copied blindly. |
| 20261102044603 | revoke_public_execute_from_public_trigger_functions | Revokes direct EXECUTE on two public trigger functions from PUBLIC/anon/authenticated. Security hardening; compare against the 23-file chain's trigger-function ACL policy. |
| 20261102050437 | backfill_condominium_archive_metadata | Data backfill from legacy JSON `archivedAt/archivedBy/archiveReason` fields into structured columns. Data migration; must be rehearsed on a disposable copy with row counts and before/after checksums. |
| 20261102050957 | revoke_service_role_maintain_from_fund_availability_view | Revokes MAINTAIN from service_role on the fund-availability view. Superseded by the broader canonical MAINTAIN revocation, provided the clean-install chain's postconditions are confirmed. |
| 20261102054253 | preserve_server_owned_condominium_archive_state | Later canonical counterpart by purpose: 20261102100200. Compare exact SQL and keep only the canonical forward implementation in clean installs. |
| 20261102054409 | add_workspace_member_profile_data | Later canonical counterpart by purpose: 20261102100100. QA has the `workspace_members.data` column; retain this capability in the canonical clean-install chain. |
| 20261102100000 | repair_authenticated_accounting_rpc_private_execute | Grants authenticated EXECUTE to seven private accounting implementations. Not present in the 23-file chain; must be reconciled against public wrapper calls and least-privilege requirements. |
| 20261102200820 | restore_secure_communication_recipient_rpc_execute | Grants authenticated recipient RPC access and replaces stale-recipient recovery. Later canonical counterpart 20261102200855 is the corrected implementation; use only the latter in new installs. |
| 20261103072843 | qa_align_transfer_wrapper_empty_search_path | QA-only `ALTER FUNCTION public.close_condominium_member_transfer(uuid) SET search_path = ''`. PR #48 documents it as a QA-only alignment; verify canonical baseline/cutover already enforces the same setting. |
| 20261103193927 | qa_store_incoming_coowner_profile_metadata | Adds `private.apply_incoming_transfer_member_metadata()` and its trigger on condominium_members. QA-only feature migration; must be promoted into the canonical chain if the application depends on the metadata persistence path. |
| 20261104122833 | grant_service_role_private_resend_event_rpc | Grants service_role EXECUTE to the private Resend event handler. Canonical Production-forward migration 20261103070901 carries this grant under the Production ledger version; compare SQL before deduplicating. |
| 20261104125614 | revoke_authenticated_execute_on_unused_private_workspace_staff | Revokes authenticated EXECUTE on `private.is_workspace_staff(uuid)`. New QA-only least-privilege cleanup; verify no browser/RPC call depends on it before promoting. |

The above SQL classifications are based on the live QA migration statements, not merely migration names. Full SQL is not reproduced in this report; the original statements remain preserved in the QA migration registry. No statement was executed or altered during this inspection.

## Verified initialization failure

PostgreSQL logs for branch initialization on 2026-11-02 record SQLSTATE `42P01` during a `REVOKE` statement that included `public.portal_access`:

```sql
REVOKE ALL ON TABLE ... public.portal_access ... FROM anon;
```

At that point `public.portal_access` did not exist. The canonical repository migration `20260928043410_create_portal_access_baseline.sql` creates it, but that version is absent from the QA migration registry. The error establishes a real ordering/dependency defect in the attempted initialization script. It is not, by itself, proof that it is the only cause of the branch-level `MIGRATIONS_FAILED` status.

## Recovery decision

Do not reset, rebase, or repair the current QA migration registry by guessing. The QA registry is a mixed history: legacy historical rows, a clean baseline/incremental chain, and QA-specific or differently versioned patches. Replacing it with the 23-file clean-install chain would erase the historical record and would not prove that the current database objects match the intended chain.

The safe next step is a deterministic, read-only object/effect reconciliation for the 16 unmatched rows, followed by a disposable PostgreSQL 17 rehearsal of the exact proposed QA recovery procedure. Any eventual QA repair must be a separate, explicitly approved operation with a verified backup/restore path and a post-repair catalog + application acceptance check.

Production remains untouched. Existing QA remains untouched.


## Live QA-versus-Production catalog comparison — 2026-11-04

A read-only catalog comparison was run directly against QA (`jhuyhlzzydcgghrzeexn`) and Production (`tctcgptrsmvgajqjgnev`). This compares schema/catalog metadata only; it does not compare or copy resident/accounting data.

| Object category | QA | Production | Result |
|---|---:|---:|---|
| Public relations (tables/views/materialized views) | 48 | 48 | Same count |
| Public columns | 627 | 626 | QA has one extra column |
| Constraints | 305 | 305 | Same definitions and names |
| Indexes | 257 | 257 | Same definitions and names |
| RLS policies | 103 | 103 | Same definitions and names |
| User triggers | 147 | 146 | QA has one extra trigger |
| Public/private functions | 172 | 171 | QA has one extra function |
| RLS-enabled public tables | 47 | 47 | Same count |
| Public views | 1 | 1 | Definition identical |

### Exact structural differences

- QA-only column: `public.workspace_members.data jsonb NOT NULL DEFAULT '{}'::jsonb`.
- QA-only trigger: `trg_apply_incoming_transfer_member_metadata` on `public.condominium_members`, invoking `private.apply_incoming_transfer_member_metadata()`.
- QA-only function: `private.apply_incoming_transfer_member_metadata()` (trigger function).
- Five function bodies differ despite matching signatures and security/search_path settings: `private.restore_condominium`, `private.archive_condominium`, `private.save_condominium`, `private.can_manage_workspace_module`, and `private.can_access_workspace_module`. These need semantic comparison; matching signatures do not prove equivalent behavior.

### Effective privilege differences

- Effective `MAINTAIN` on public relations: zero for `anon`, `authenticated`, and `service_role` in both environments.
- Relation privileges: Production has three additional effective grants to `authenticated` on `public.condominium_fund_availability` (`REFERENCES`, `TRIGGER`, `TRUNCATE`); QA does not. All other relation privilege counts for these application roles match.
- Function EXECUTE: 28 role/function effective privilege differences were detected. The main pattern is additional direct EXECUTE access for `authenticated` to private routines in QA, while Production retains EXECUTE exposure to `anon`/authenticated on a small set of public transfer/trigger routines. The exact per-function list was captured during the read-only comparison; do not bulk-revoke or bulk-grant without reviewing each wrapper/implementation pair.

### Consequence

QA is not schema-identical to Production, even though table/constraint/index/policy counts are very close. The additional workspace-member metadata column and incoming-co-owner trigger/function are consistent with QA-specific feature work; the five changed function bodies and 28 EXECUTE differences are material and must be classified as intended QA-only changes, canonical forward fixes, or unintended drift.

The catalog comparison does **not** justify resetting QA or copying Production objects into it. Before recovery, reconcile the five function bodies and every EXECUTE difference against the canonical source, then rehearse the exact changes in a disposable PostgreSQL 17 environment. The data-bearing QA branch remains untouched.


### Semantic review of the five differing function bodies

The live definitions were retrieved read-only from both databases. The differences are functional, not formatting-only:

- `private.can_manage_workspace_module`: QA handles JSON permission arrays and objects and requires an object value to be the JSON boolean `true`. Production uses key-presence (`?`) for object permissions; a stored `false` value can therefore be treated as enabled. This is a confirmed authorization logic defect in the Production definition relative to the corrected QA implementation.
- `private.can_access_workspace_module`: QA likewise handles both array/object formats and checks the object value is boolean `true`; Production uses array-key membership only. This is a compatibility/authorization semantic difference.
- `private.save_condominium`: QA preserves archive metadata as server-owned state during conflict updates and explicitly handles archive metadata on inserts. Production's older body does not preserve the three archive columns in the same way. The QA definition aligns with the intent of canonical migration `20261102100200_preserve_server_owned_condominium_archive_state.sql`.
- `private.archive_condominium`: QA also synchronizes archive metadata into the JSON `data` payload; Production updates the dedicated columns and audit log but not those JSON fields.
- `private.restore_condominium`: QA removes `archivedAt`, `archivedBy`, and `archiveReason` from JSON `data` when restoring; Production clears only the dedicated columns.

These changes show that the existing QA database contains forward fixes/features not yet present in Production. They must be retained and reconciled into the canonical release chain; they must not be overwritten by blindly restoring a Production snapshot. The permission fix also needs an explicit release decision because the live Production implementation still has the key-presence defect.

