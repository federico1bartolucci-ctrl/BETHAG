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
| Canonical files absent from QA ledger | 6 | Must not be silently inserted into the existing QA ledger |
| QA-only SQL files archived with exact version/name | 12 | Source recoverable from repository archive |
| QA-only ledger rows without an exact archived source | 5 | Need provenance recovery or catalog-based semantic reconstruction |
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

Catalog postconditions are not substitutes for original migration payloads. Any semantically reconstructed SQL must be labelled as reconstructed, reviewed independently, and tested on an isolated PostgreSQL 17 database; it must never be represented as the original payload.

## Required continuation before this point can close

1. Recover or reconstruct, with explicit provenance labels, the five unarchived QA migration payloads.
2. Determine the purpose and origin of the two orphan archived candidates.
3. Build a deterministic QA replay/reconciliation manifest that distinguishes shared canonical history, QA-only forward history, and files that are merely semantic equivalents.
4. Rehearse the resulting sequence on a disposable PostgreSQL 17 database; do not reset/rebase/delete the live QA branch.
5. Resolve the provider's `MIGRATIONS_FAILED` status only through a supported non-destructive provider procedure. The database's current schema and ledger do not clear provider deployment status.

## Safety decision

**Punto 2 remains OPEN.** No live replay, reset, rebase, merge, deploy, or cutover is authorized by this inventory. Production remains untouched. Existing QA fixtures and migration history must be preserved.
