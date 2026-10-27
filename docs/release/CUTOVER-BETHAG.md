# BETHAG Production Cutover Plan

**Status:** DRAFT — NOT APPROVED  
**Scope:** Controlled database migration release  
**Production changes:** Prohibited until every gate below is evidenced and approved.

## Release gates

| Gate | Required evidence | Status |
|---|---|---|
| Backup identified | Supabase scheduled physical backups visible; latest shown 2026-10-26 03:10:58 UTC. Exact artifact metadata still to record | PARTIALLY VERIFIED |
| Restore test | Local Docker restore already performed; prior checks recorded 6 condominiums, 65 units, 20 residents, 11 transfers. Preserve the existing logs; do not repeat the restore | COMPLETED — EXISTING EVIDENCE |
| Restore integrity | Data-count checks and local ACL checks were performed; full owner/default-ACL/RLS/function parity evidence still needs consolidation | PARTIAL |
| Migration reconciliation | Production ledger currently ends at 20261022202747; nine later repository migrations are not recorded in Production. Ordered reconciliation required before release | BLOCKED — DIVERGENCE IDENTIFIED |
| Security/ACL parity | CI run 40429495150 passed both jobs; live Production shows structural grants still present and MAINTAIN grants remain on existing tables. Owner summary: 48 public relations owned by postgres; full default-ACL/RLS/function parity still required | BLOCKED — LIVE DIFFERENCES |
| Application validation | Build and focused smoke tests pass against the restored isolated target; confirm sign-in, role access, condominium data, accounting and portal workflows | PENDING |
| Cutover approval | Named approver accepts backup/restore evidence, migration plan, outage window, rollback criteria, and communication plan | NOT APPROVED |

## Evidence snapshot — 2026-10-27

- Supabase scheduled physical backups are visible for 2026-10-20 through 2026-10-26; latest shown is 2026-10-26 03:10:58 UTC. Storage API objects are excluded from database backups.
- The local Docker restore was already completed in the existing workflow; previous validation recorded 6 condominiums, 65 units, 20 residents, and 11 member transfers. Do not repeat the restore. Existing command/output evidence should be linked here when available.
- Live Production migration ledger contains 244 records and ends at `20261022202747_harden_close_member_transfer_search_path`.
- The clean branch has 15 migration files: five rebuild-baseline files dated 20261017 plus ten incremental migrations. The five baseline files are for clean bootstrap and **must not be pushed to existing Production as ordinary pending migrations**, because the objects already exist there and the live ledger is historical, not the clean-baseline ledger.
- Nine incremental migrations after the current Production head are not registered in Production and need semantic/order reconciliation before execution:
  1. `20261022210629_restrict_private_function_public_execute.sql`
  2. `20261022210630_harden_default_privileges_and_private_execute.sql`
  3. `20261022213544_restrict_close_member_transfer_execute.sql`
  4. `20261022233440_align_public_function_execute.sql`
  5. `20261023000001_revoke_authenticated_maintain.sql`
  6. `20261023000002_revoke_default_maintain.sql`
  7. `20261023000003_revoke_service_role_maintain.sql`
  8. `20261023000004_application_default_table_privileges.sql`
  9. `20261023000733_use_invoker_for_close_transfer_rpc.sql`
- Read-only Production inspection found 48 relations in schema `public`, all owned by `postgres`. Structural privileges remain on 48 tables for `service_role`; one table has `TRUNCATE`, `REFERENCES`, and `TRIGGER` granted to `authenticated`. Catalog inspection also found `MAINTAIN` privileges on existing tables for `authenticated` and `service_role`.
- GitHub Actions run `40430679828` for commit `8d6f05edb4f9b5c7a1ca9ec48b7ac8a94d02f073` completed successfully: `build` and `postgres-bootstrap` both passed. This is CI evidence, not a live Production cutover test.
- Production has not been modified by this evidence collection. PR #24 remains open/draft. Cutover is blocked until the nine incremental migrations are reviewed against live schema and ACL state, object/default ACL/RLS/function parity is documented, and the release plan is approved.

## Pre-cutover procedure

1. Freeze schema-changing work and identify the exact release commit and migration list.
2. Produce a fresh provider-supported backup or database dump. Record UTC timestamp, source project identifier, artifact checksum, and secure storage location.
3. Restore the backup to an isolated target that cannot write to Production. Never use Production as the restore-test destination.
4. Verify restore integrity: migration ledger, required schemas/tables, extensions, critical row counts, functions/triggers, RLS policies, object ownership, grants, and default privileges.
5. Reconcile the live Production migration ledger with repository migration files. Produce an ordered list of migrations to apply and a list of any drift; do not infer that a successful CI run proves Production parity.
6. Run the release migrations and application smoke tests on the isolated restored target. Save logs and query outputs.
7. Obtain explicit approval for the exact commit, migration list, outage window, rollback threshold, and responsible operator.

## Cutover runbook (only after approval)

1. Announce the maintenance window and pause schema/data changes.
2. Take and verify a final pre-cutover backup; record its identifier and timestamp.
3. Re-check the Production project identifier and current migration ledger against the approved plan.
4. Apply only the approved migrations in order; stop immediately on any error or unexpected ledger state.
5. Run post-migration ACL/RLS/function checks and application smoke tests.
6. Record outcomes and release decision. Do not claim success until verification completes.

## Rollback and stop conditions

- Stop on any failed migration, unexpected migration-history divergence, ACL/owner mismatch, restore-integrity failure, failed smoke test, or inability to verify the target project.
- Do not attempt an improvised reverse migration for privilege or schema changes.
- Restore from the verified pre-cutover backup using the approved recovery procedure if rollback is required; confirm data-loss window and recovery point with the approver.
- If no verified backup and successful isolated restore exist, do not cut over.

## Evidence log

Record for each gate: operator, UTC timestamp, target identifier, command/procedure, output or log link, result, and reviewer. Never place database passwords, service-role keys, or other secrets in this file or in Git history.
