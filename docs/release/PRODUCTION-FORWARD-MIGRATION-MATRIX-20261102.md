# Production forward migration addendum — 2026-11-02

## Status

**Prepared only. Not applied to Production.** These two forward migrations are required before deploying the matching frontend changes. They must be included in the reviewed cutover sequence and rehearsed on an isolated target first.

## Superseding cutover artifacts

- Manifest: `supabase/rebuild/production-migration-cutover-freeze-20261102.json`
- Read-only preflight: `supabase/rebuild/production-cutover-preflight-20261102.sql`
- Read-only postflight: `supabase/rebuild/production-cutover-postflight-20261102.sql`
- Guarded runner: `scripts/apply-reviewed-production-migrations.mjs`

The candidate contains fourteen forward migrations: the twelve previously frozen migrations plus the two below. The 2026-10-27 twelve-migration freeze remains historical and is not the current candidate.

## New canonical migrations

| Version | File | Purpose | Expected effect |
|---|---|---|---|
| 20261102100100 | `20261102100100_add_workspace_member_profile_data.sql` | Add the JSONB metadata field used by collaborator synchronization. | Adds `workspace_members.data` with a non-null empty-object default. No RLS policy or role grant changes. |
| 20261102100200 | `20261102100200_preserve_server_owned_condominium_archive_state.sql` | Prevent ordinary condominium synchronization from clearing archive lifecycle fields. | Replaces `private.save_condominium`; preserves `archived_at`, `archived_by`, and `archive_reason` on conflict updates. Keeps the existing SECURITY DEFINER/search_path and authorization checks. |

## QA evidence

The matching changes were applied only to the ephemeral QA branch `bethag-launch-qa` (project ref `jhuyhlzzydcgghrzeexn`) through QA-only migrations:

- `20261102054409_add_workspace_member_profile_data.sql`
- `20261102054253_preserve_server_owned_condominium_archive_state.sql`

A transaction-scoped SQL regression probe confirmed that `archived_at`, `archived_by`, and `archive_reason` survive an ordinary `save_condominium` upsert. No test row was committed.

The browser acceptance run is separately exercising the archive/restore UI against a workspace containing more than 1,000 condominiums. That test also exposed and now covers explicit PostgREST pagination in the application data loader.

## Cutover controls

1. Keep both migrations in the canonical ordered migration inventory.
2. Verify the QA branch has both equivalent effects and no duplicate or conflicting migration-ledger entries.
3. Run the clean PostgreSQL bootstrap and incremental-hardening tests.
4. Capture fresh Production and QA migration ledgers and verify exact forward order.
5. Run the read-only Production preflight immediately before the approved window.
6. Apply only the reviewed migrations during the separately approved cutover, then run the read-only postflight and authenticated smoke tests.

**Production was not modified while preparing this addendum.** A successful build or QA test is not authorization to deploy these migrations.


## Rehearsal result

<badge>PASS — isolated PostgreSQL 17</badge>

The guarded cutover runner completed all fourteen canonical migrations in CI run [41398202209](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41398202209). The same job verified the 244 historical version/name pairs, the final 258-row ledger, incremental ACL/security postconditions, collaborator permission enforcement under RLS, and the canonical ledger transaction.

The separate application QA run still has an unresolved edit-form acceptance failure. APP-01–APP-15 are therefore not signed off, and this successful database rehearsal is **not** Production authorization.
