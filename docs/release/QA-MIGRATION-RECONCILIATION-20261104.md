# QA migration ledger reconciliation — 2026-11-04

## Current live snapshot

Read-only inspection of Supabase project `jhuyhlzzydcgghrzeexn`, branch `bethag-launch-qa`, returned **34 migration rows**, not the 47 rows recorded in the 2026-11-03 snapshot.

- Branch ID: `bb7388ab-3007-4de0-9ff6-437a9c53690e`
- Provider status: `MIGRATIONS_FAILED`
- Latest row: `20261104125614_revoke_authenticated_execute_on_unused_private_workspace_staff`
- Canonical clean-install chain on the release branch: 23 SQL files.
- No migration was applied, no ledger row was changed, and no QA or Production data/schema was modified during this inspection.

The 2026-11-03 files `qa-ledger-20261103.json`, `migration-history-reconciliation-20261103.json`, and the QA failure narrative describe a 47-row snapshot ending at `20261103072843`. They are historical evidence, not the current live ledger. The current live ledger contains 34 rows and includes three later entries dated 2026-11-03/04.

## Comparison with the canonical 23-file chain

| Classification | Count | Meaning |
|---|---:|---|
| Exact version/name pairs shared with canonical chain | 17 | Baseline and canonical hardening history |
| QA-only ledger rows | 17 | QA-specific forward repairs; not part of the clean-install chain |
| QA-only SQL files archived with exact version/name | 12 | Source recoverable from repository archive |
| QA-only ledger rows without an exact archived source | 5 | Exact original payloads recovered from the live migration ledger and staged separately |
| Additional archived candidate files not matching a live QA row | 2 | Must remain unassigned until provenance is established |

The exact QA-only rows without a matching archived file are:

1. `20261102050957_revoke_service_role_maintain_from_fund_availability_view`
2. `20261102200820_restore_secure_communication_recipient_rpc_execute`
3. `20261103193927_qa_store_incoming_coowner_profile_metadata`
4. `20261104122833_grant_service_role_private_resend_event_rpc`
5. `20261104125614_revoke_authenticated_execute_on_unused_private_workspace_staff`

Two nearby archived files are not exact substitutes:
- `20261102110000_revoke_service_role_maintain_from_fund_availability_view.sql` has the same intent/name but a different version.
- `20261102120000_backfill_condominium_archive_metadata.sql` has no matching live QA ledger row.

The canonical file `20261102200855_restore_secure_communication_recipient_rpc_execute.sql` is also not an exact substitute for QA row `20261102200820`; the version differs. Do not rewrite historical ledger versions to make the files appear aligned.

## Catalog evidence collected read-only

- The QA view `public.condominium_fund_availability` no longer grants `MAINTAIN` to `service_role`; this is consistent with the intent of the 20261102050957 row, but does not recover its exact original SQL payload.
- `private.apply_resend_communication_event(text,text,text,text,timestamptz)` exists as SECURITY DEFINER with an empty search_path; its ACL includes `service_role` EXECUTE. This is consistent with the 20261104122833 grant intent, but does not prove the exact SQL text.
- `private.is_workspace_staff(uuid)` exists; `authenticated` does not have EXECUTE and `service_role` does. This is consistent with the 20261104125614 revoke intent, but does not recover the original SQL text.
- JSONB `data` columns exist on `workspace_members`, `condominium_members`, and `condominium_units`. This alone does not establish the exact effect of the co-owner profile metadata migration.

The five missing Git files have now been recovered byte-for-byte from the authoritative `statements` array in the live QA `supabase_migrations.schema_migrations` ledger. They are stored under `supabase/rebuild/qa-recovered-migrations/`; they are no longer reconstructed candidates. This also corrected a material error in the first co-owner candidate: the authoritative SQL specifies `SECURITY INVOKER` and revokes all direct EXECUTE privileges on the trigger function. The recovered payload preserves that security boundary.

## Required continuation before this point can close

1. Confirm the exact recovered-payload replay passes on disposable PostgreSQL 17 after the latest source correction.
2. Complete the live QA real-authentication and session-persistence browser certification for admin, collaborator and resident accounts.
3. Determine the provider's original failed branch action from its Supabase branch workflow log; the connector exposes branch status but not the branch action-run detail log.
4. Only after the failure is identified, choose a supported non-destructive provider repair. Do not reset/rebase/delete the live QA branch until the exact failure and migration ordering implications are known.

## Safety decision

**Punto 2 remains OPEN.** No live replay, reset, rebase, merge, deploy, or cutover is authorized by this inventory. Production remains untouched. Existing QA fixtures and migration history must be preserved.


## Reconstruction work staged — 2026-11-04

- Added five catalog-derived SQL candidates under `supabase/rebuild/qa-reconstructed-migrations/`, each explicitly marked as reconstructed and not original.
- Added `scripts/test-qa-ledger-replay-reconstruction.mjs` and `.github/workflows/qa-ledger-replay-reconstruction.yml` for a disposable PostgreSQL 17 replay.
- The replay script requires an exact one-to-one match for all 34 live QA version/name pairs and expects source counts of 17 canonical, 12 archived QA, and 5 reconstructed.
- The existing BETHAG build workflow run `41841810296` is in progress, but it exercises the canonical 23-file/14-increment rehearsal, not yet the new 34-row QA replay. The dedicated replay has therefore **not yet passed**.
- No live QA or Production SQL was applied.


## Canonical-to-QA chronology mapping

The 34-row QA ledger is not simply a shorter or corrupt copy of the 23-file canonical chain. It is a branch-specific sequence with equivalent operations under different timestamps and additional QA repairs:

- Canonical `20261022202747_harden_close_member_transfer_search_path` is represented by QA `20261103072843_qa_align_transfer_wrapper_empty_search_path`; the SQL operation is identical.
- Canonical `20261102100100_add_workspace_member_profile_data` is represented by QA `20261102054409_add_workspace_member_profile_data`; both add the same JSONB column.
- Canonical `20261102100200_preserve_server_owned_condominium_archive_state` is represented by QA `20261102054253_preserve_server_owned_condominium_archive_state`; the function definition is equivalent.
- Canonical `20261102151610_harden_live_production_acl_and_transfer_invoker` consolidates hardening already present in the QA chain's earlier shared migrations: `20261023000001`–`20261023000004`, `20261023000733`, `20261027100000`, and `20261027110000`.
- Canonical `20261102200855_restore_secure_communication_recipient_rpc_execute` is represented by QA `20261102041805` followed by `20261102200820`; the latter's exact SQL was recovered from the live ledger.
- Canonical `20261103070901_grant_service_role_private_resend_event_rpc` is represented by QA `20261104122833`; its exact SQL was recovered from the live ledger.

The two archived files with no exact live-ledger version remain unassigned. The alternate archive `20261102110000_revoke_service_role_maintain_from_fund_availability_view` contains the same operation as live QA row `20261102050957`, but has a different timestamp. The alternate archive `20261102120000_backfill_condominium_archive_metadata` has a corrected regex compared with the live archived row `20261102050437`; the current QA data has zero legacy JSON archive markers and zero missing structured archive timestamps, so no corrective DML is currently indicated. Do not replay either orphan file as an additional migration.
