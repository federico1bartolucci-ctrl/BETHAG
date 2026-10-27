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
| Migration reconciliation | Production has 244 rows; continuity QA 17; develop 37 before rebase; member-transfer QA 15; migration-reconciliation QA 17. Legacy aliases remain in QA ledgers | BLOCKED — DIVERGENCE IDENTIFIED |
| Security/ACL parity | Production still has MAINTAIN on 33 tables for authenticated and 47 for service_role, with close-transfer SECURITY DEFINER. Three full-schema QA branches now have zero table MAINTAIN grants and the close-transfer function is SECURITY INVOKER | PARTIAL — PRODUCTION/DEVELOP DIVERGE |
| Application validation | Build and focused smoke tests pass against the restored isolated target; confirm sign-in, role access, condominium data, accounting and portal workflows | PENDING |
| Cutover approval | Named approver accepts backup/restore evidence, migration plan, outage window, rollback criteria, and communication plan | NOT APPROVED |

## Evidence snapshot — 2026-10-27

- Supabase scheduled physical backups are visible for 2026-10-20 through 2026-10-26; latest shown is 2026-10-26 03:10:58 UTC. Storage API objects are excluded from database backups.
- The local Docker restore was already completed in the existing workflow; previous validation recorded 6 condominiums, 65 units, 20 residents, and 11 member transfers. Do not repeat the restore. Existing command/output evidence should be linked here when available.
- Live Production migration ledger contains 244 records and ends at `20261022202747_harden_close_member_transfer_search_path`.
- Live migration ledgers were queried directly for all five environments. Current counts/heads are captured in `supabase/rebuild/live-environment-status-20261027.json`: Production 244 (`20261022202747`); continuity QA 17 (`20261027012138`); develop 37 (`20261001141623`, pre-rebase snapshot); member-transfer QA 15 (`20261027012123`); migration-reconciliation QA 17 (`20261023011435`). These ledgers are not yet identical because `apply_migration` assigned fresh versions to QA hardening steps and the older QA aliases remain.
- The canonical branch has exactly 15 migration files: five baseline migrations, the already-applied Production head migration `20261022202747`, and nine ordered follow-on migrations. The five baseline files are for clean bootstrap and **must not be pushed to existing Production as ordinary pending migrations**. Existing environments require a controlled migration-ledger rebase only after baseline/catalog parity is proven; no tables or application data should be recreated.
- QA ledger differs from the canonical sequence: it contains four alternate identities that may correspond to canonical migrations—`20261022230901_revoke_authenticated_maintain`, `20261022230908_revoke_default_maintain`, `20261023011431_revoke_service_role_maintain_qa_test`, and `20261023011435_define_application_default_table_privileges_qa`—plus two QA-only test rows (`20261023010544`, `20261023010548`). These are **not yet treated as equivalent**: compare the exact SQL effects and live ACL state before normalizing the QA ledger. Do not rerun their SQL merely to rename migration history.
- The automated gate `npm run verify:environment-alignment` now checks the canonical 15-file sequence, the nine Production-pending migrations, and the known QA ledger divergences. A passing inventory check is not a release approval; it reports cutover blocked until restore, live parity, QA equivalence, fresh ledger capture, and approval are attested.
- Live ACL and schema checks after QA hardening: `bethag-continuity-qa`, `bethag-member-transfer-qa`, and `bethag-migration-reconciliation-qa` all report 47 tables, 1 view, 626 columns, 304 constraints, 257 indexes, 171 functions, 103 policies, and 146 triggers. Each now reports zero `MAINTAIN` table grants for both `authenticated` and `service_role`, and `public.close_condominium_member_transfer(uuid)` is `SECURITY INVOKER`.
- `bethag-continuity-qa` required one additional targeted revocation on `public.condominium_legal_cases`; the subsequent live check returned no tables with `MAINTAIN` for `service_role`.
- `bethag-develop` was materially behind before rebase: 20 public tables, 229 columns, 20 tables with `MAINTAIN` for `authenticated`, and 20 for `service_role`; the close-transfer RPC was absent. A Supabase rebase onto Production was requested. At the last check the branch status was `CREATING_PROJECT`, so no post-rebase parity is claimed until it becomes healthy and is re-audited.
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
- Read-only Production inspection found 48 relations in schema `public` (47 table/partition relations plus one view), all owned by `postgres`. Effective privilege checks on the 47 table/partition relations found `MAINTAIN` on 33 tables for `authenticated` and on all 47 for `service_role`. `service_role` also has `TRUNCATE`, `REFERENCES`, and `TRIGGER` on all 47; `anon` has none of these structural privileges. `authenticated` has none of these structural privileges according to `has_table_privilege` checks.
- GitHub Actions run `40430679828` for commit `8d6f05edb4f9b5c7a1ca9ec48b7ac8a94d02f073` completed successfully: `build` and `postgres-bootstrap` both passed. This is CI evidence, not a live Production cutover test.
- Live Supabase Security Advisor at 2026-10-27 01:10 UTC still reports one warning: `public.close_condominium_member_transfer(uuid)` is executable by `authenticated` while marked `SECURITY DEFINER`. Migration `20261023000733_use_invoker_for_close_transfer_rpc.sql` is the planned remediation, but it is not recorded in Production yet.
- Live Performance Advisor reports 62 unused-index notices and 21 multiple-permissive-policy notices. These are recorded for a separate measured performance/policy review; do not drop indexes or rewrite RLS policies as part of this privilege cutover without usage and access-path validation.
- Production has not been modified. Security hardening was applied only to the two isolated QA branches `bethag-continuity-qa` and `bethag-member-transfer-qa`; `bethag-migration-reconciliation-qa` was already hardened. PR #24 remains open/draft. Cutover is blocked until the develop rebase completes, ledger identities are reconciled, Production backup/restore and catalog parity are verified, and the canonical plan is approved.

## Pre-cutover procedure

1. Freeze schema-changing work and identify the exact release commit and migration list.
2. Produce a fresh provider-supported backup or database dump. Record UTC timestamp, source project identifier, artifact checksum, and secure storage location.
3. Restore the backup to an isolated target that cannot write to Production. Never use Production as the restore-test destination.
4. Verify restore integrity: migration ledger, required schemas/tables, extensions, critical row counts, functions/triggers, RLS policies, object ownership, grants, and default privileges.
5. Compare the restored live catalog against the five canonical baseline migrations plus the already-applied Production head migration. Compare tables/columns, constraints, indexes, views, functions and bodies, triggers, RLS policies, grants, ownership, and global/schema default ACLs. Stop on any unexplained difference.
6. Prepare a migration-ledger rebase plan for Production: preserve the live schema and data, replace only the 244 historical tracking rows with the five baseline identities plus the existing head identity, then apply the nine canonical pending migrations in order. This is a metadata operation followed by real DDL; it is not an instruction to execute until the exact preflight output and backup restore are approved.
7. For every QA/development branch, retain the live ledger and catalog snapshot. The three full-schema QA branches now have matching structural counts and least-privilege results, but their migration ledger identities still differ. For migration-reconciliation QA, prove the four alternate migration identities have the same intended effects as the canonical migrations and establish whether the two QA-only test rows introduced any unique state. Normalize tracking only after that proof; do not replay equivalent SQL. Verify the develop rebase completes and then compare its schema/ACL state. Production remains blocked.
8. Run the complete release migrations and application smoke tests on the isolated restored target. Save logs and query outputs.
9. Obtain explicit approval for the exact commit, migration list, outage window, rollback threshold, and responsible operator.

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
