# QA branch reconciliation record

Target branch: `bethag-launch-qa`
Supabase branch ref: `jhuyhlzzydcgghrzeexn`
Parent Production ref: `tctcgptrsmvgajqjgnev`

This directory records QA-only repairs and audit findings. Files here are **not** part of the normal `supabase/migrations` stream and must not be automatically deployed to Production.

## Current QA state — 2026-11-04

- Supabase branch metadata still reports `MIGRATIONS_FAILED`; the preview database reports `ACTIVE_HEALTHY`.
- PostgreSQL is 17.11 and accepts read-only SQL queries.
- The QA migration registry contained 48 entries before the repair below; it now contains 49.
- QA and Production each expose 47 public tables, and all 47 tables have RLS enabled.
- QA has 613 public columns versus 612 in Production. The sole additional column is `public.workspace_members.data`, introduced by QA migration `20261102054409_add_workspace_member_profile_data`.
- Both environments have 257 public indexes with identical names and definitions.
- Both have 103 public RLS policies with identical definitions.
- Both have 305 public constraints; the only textual difference found was harmless extra parentheses in `condominium_work_progress_financial_consistency_chk`.
- QA has one additional trigger and function: `trg_apply_incoming_transfer_member_metadata` / `private.apply_incoming_transfer_member_metadata()`, created by QA migration `20261103193927_qa_store_incoming_coowner_profile_metadata`.
- QA and Production have zero `MAINTAIN` privileges for `anon`, `authenticated`, and `service_role` on public relations.
- Supabase Security Advisor returned no security lints for QA.

The branch's provider status has not been cleared by these database checks. The available connector can inspect the database and branch status but does not expose the Supabase Branch deployment log needed to identify or clear the provider-side failure state. Do not delete/recreate or reset this branch: it contains QA test data.

## Recovered QA migration sources — 2026-11-04

The QA database registry now has 49 applied entries. Every entry has a repository source recorded in `manifest.json`:

- 16 original Production-ledger migrations point to the unchanged files in `supabase/replay-candidate/`.
- 33 QA baseline / forward-only entries are archived under `supabase/qa-reconciliation/migrations/`.
- All 33 archived SQL files were compared byte-for-byte with the ordered `statements` array stored in the QA migration registry.
- The manifest maps every applied QA version and name to its exact source path.

This is a source-recovery archive only. It does not alter the QA registry, run migrations, or make the QA-only SQL part of the standard Production deployment path. No branch reset, rebase, or recreation was performed.

## Isolated QA baseline replay — 2026-11-04

The five QA baseline snapshots plus 28 QA forward-only migrations (33 files total) were replayed successfully on a disposable Supabase PostgreSQL 17 stack. Workflow: `.github/workflows/replay-qa-baseline-postgres17.yml`.

The final verification passed:
- 33/33 migration versions match the staged SQL files exactly, with no duplicates.
- Schema counts: 47 public tables, 613 table columns, 257 indexes, 103 RLS policies, 305 constraints, 147 triggers, 172 public/private functions.
- RLS is enabled on every public table.
- The complete ordered table-column inventory matches the live QA snapshot byte-for-byte.

An earlier diagnostic counted 627 columns because it included view columns. The corrected inventory counts only physical public table columns; it matches the live QA total of 613. There is no 14-column table-schema drift.

The isolated replay intentionally starts from the five full baseline snapshots and then applies the 28 QA forward-only migrations. The 16 earlier Production-ledger entries remain preserved in the historical archive but are not replayed on top of the baseline. The live QA registry still contains all 49 entries; its metadata reconciliation is a separate remaining task. No live QA or Production schema was reset or replayed by this workflow.

## QA-only repair: Resend webhook private implementation grant

The deployed QA Edge Function `bethag-resend-webhook` invokes the public `apply_resend_communication_event` wrapper. The wrapper is `SECURITY INVOKER` and calls `private.apply_resend_communication_event(...)`. Before repair, `service_role` could execute the public wrapper but could not execute its private implementation, so the webhook call would fail.

The equivalent Production migration is already present in the recovered historical ledger as `20261103070901_grant_service_role_private_resend_event_rpc.sql`. QA did not have that version in its own migration registry.

On 2026-11-04, the following forward-only grants repair was applied to QA using the Supabase migration API and recorded as `20261104122833_grant_service_role_private_resend_event_rpc`:

```sql
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
```

Post-repair verification confirms:
- QA migration registry: 49 entries, latest `20261104122833`.
- `service_role` can execute both the public wrapper and private implementation.
- `authenticated` and `anon` cannot execute the private implementation.
- Production was not modified.

The exact QA-only SQL is archived under `migrations/` and mapped in `manifest.json`. Do not copy it into the standard Production migration stream: Production already has the equivalent historical migration under version `20261103070901`.

## Synthetic authorization probes — 2026-11-04

The QA collaborator helper `private.can_manage_workspace_module(uuid,text)` was exercised in rollback-only transactions against the active collaborator membership. The permission JSON was temporarily set to each test value and rolled back after each call:

| Permission payload | Result |
| --- | --- |
| `{"condomini":false}` | `false` |
| `{"condomini":true}` | `true` |
| `{}` (key absent) | `false` |

All three expected outcomes passed. No membership or permission change persisted.

The Resend webhook privilege path was also exercised in a rollback-only transaction with `SET LOCAL ROLE service_role`. Calling the public invoker wrapper with a deliberately nonexistent provider message ID returned `{"status":"ignored","reason":"recipient_not_found"}`, confirming that the service role can traverse the wrapper to its private implementation. The probe did not update any recipient or communication row.

## Rollback-only RLS visibility checks — 2026-11-04

RLS was exercised under `SET LOCAL ROLE authenticated` with simulated JWT subject claims derived from the QA fixture memberships. Every test ran inside a transaction and ended with `ROLLBACK`:

| Fixture role / permission | Visible condominiums | Visible condominium members | Visible portal access |
| --- | ---: | ---: | ---: |
| Admin | 64 | 13 | 2 |
| Resident | 1 | 1 | 1 |
| Collaborator, current permissions | 0 | 0 | 0 |
| Collaborator, `condomini=false` | 0 | 0 | — |
| Collaborator, `condomini=true` | 64 | 13 | — |
| Collaborator, key absent | 0 | 0 | — |

This confirms that the resident fixture is restricted to one condominium/member/portal record, while collaborator module access follows the JSON boolean correctly. The temporary collaborator permission changes were rolled back; QA fixture data remains unchanged.

## Remaining QA certification blockers

1. Supabase branch metadata still says `MIGRATIONS_FAILED`. The branch's database is queryable and has a populated migration registry, but the provider-side deployment log must be inspected before this status can be called stale or cleared. No branch reset/recreation is authorized because it would discard QA data.
2. The QA source history is now archived and its 5-baseline + 28-forward replay is reproducible. The live QA registry still records 16 earlier Production-ledger versions alongside those 33 entries (49 total). Determine, from the Supabase branch deployment log and the supported migration-repair procedure, whether those 16 superseded versions should be marked reverted. Do not delete registry rows manually or rebase/reset the live branch before that decision.
3. Function ACL comparison still shows additional `authenticated` EXECUTE grants on private-schema functions in QA compared with Production. These need a signature-by-signature authorization review; do not revoke them wholesale because some invoker wrappers may rely on them.
4. QA and Production have different private implementations for `archive_condominium`, `restore_condominium`, `save_condominium`, `can_access_workspace_module`, and `can_manage_workspace_module`. Confirm each difference against the intended QA feature set and the recovered migration source before attempting to align them.
5. A historical QA log entry recorded SQLSTATE `42P10` for a direct `portal_access` upsert using conflict target `(workspace_id, condominium_id, email)`, while the current unique index is expression-based on `lower(email)`. The current repository Edge Function uses `(workspace_id, legacy_id)`; identify the older caller before changing the index or data path.

No APP-01..APP-15 collaudo has been run as part of this read-only audit. QA data was preserved; no reset, rebase, branch deletion, or Production change was performed.
