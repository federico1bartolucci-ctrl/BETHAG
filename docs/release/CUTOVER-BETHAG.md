# BETHAG Production Cutover Plan

**Status:** DRAFT — NOT APPROVED  
**Scope:** Controlled database migration release  
**Production changes:** Prohibited until every gate below is evidenced and approved.

## Release gates

| Gate | Required evidence | Status |
|---|---|---|
| Backup identified | Supabase scheduled physical backups visible; latest shown 2026-10-27 03:04:50 UTC (visible in Supabase Dashboard screenshot supplied 2026-10-27). Exact artifact metadata still to record | PARTIALLY VERIFIED |
| Restore test | Local dump restore verified: 6 condominiums, 65 units, 20 members, 11 transfers. This is not proof that the scheduled Supabase physical backup was restored | PARTIAL — PHYSICAL BACKUP RESTORE NOT PROVEN |
| Restore integrity | Data-count checks and local ACL checks were performed; full owner/default-ACL/RLS/function parity evidence still needs consolidation | PARTIAL |
| Migration reconciliation | Production has 244 rows; continuity QA 17; develop reset to 15 rows at 20260928043406 and awaiting successful rebase; member-transfer QA 15; migration-reconciliation QA 17. Legacy aliases remain in QA ledgers | BLOCKED — DIVERGENCE IDENTIFIED |
| Security/ACL parity | Production still has MAINTAIN on 33 tables for authenticated and 47 for service_role, with close-transfer SECURITY DEFINER. Three full-schema QA branches now have zero table MAINTAIN grants and the close-transfer function is SECURITY INVOKER | PARTIAL — PRODUCTION/DEVELOP DIVERGE |
| Application validation | Build and focused smoke tests pass against the restored isolated target; confirm sign-in, role access, condominium data, accounting and portal workflows | PENDING |
| Cutover approval | Named approver accepts backup/restore evidence, migration plan, outage window, rollback criteria, and communication plan | NOT APPROVED |

## Evidence snapshot — 2026-10-27

- Supabase scheduled physical backups are visible for 2026-10-20 through 2026-10-26; latest shown is 2026-10-27 03:04:50 UTC, confirmed visually in Supabase Dashboard on 2026-10-27. Storage API objects are excluded from database backups.
- The local Docker restore was completed from a database dump; its audit recorded 6 condominiums, 65 units, 20 members, and 11 member transfers. It does **not** satisfy the provider-managed physical-backup restore gate. The gate is now explicitly tracked in `supabase/rebuild/live-environment-status-20261027.json` and remains BLOCKED. The Dashboard's “Restore to a New Project” confirmation showed an additional monthly compute cost of $9.68; this paid route was declined in favor of the agreed free alternative. The available Supabase connector does not expose a verified action to restore a selected scheduled physical backup into a new isolated project; its generic `restore_project` action is not safe to assume equivalent and was not invoked. Required next operation: from the BETHAG source project, use Supabase Dashboard → Database → Backups → Restore to a New Project, select a scheduled physical backup, complete the restore into an isolated target, then save the target ref, selected backup timestamp, completion timestamp, provider result, and schema/data/owner/grant/default-ACL parity results. Do not use an in-place Production restore for this test. Production has not been modified.
- Live Production migration ledger contains 244 records and ends at `20261022202747_harden_close_member_transfer_search_path`.
- Live migration ledgers were queried directly for all five environments. Current counts/heads and read-only catalog fingerprints are captured in `supabase/rebuild/live-environment-status-20261027.json`: Production 244 (`20261022202747`); continuity QA 17 (`20261027012138`); develop recovered with 15 canonical entries (`20261023000733`); member-transfer QA 15 (`20261027012123`); migration-reconciliation QA 17 (`20261023011435`). The ledgers are not identical because QA hardening steps have alternate recorded versions and older aliases remain.
- The canonical branch has exactly 15 migration files: five baseline migrations, the already-applied Production head migration `20261022202747`, and nine ordered follow-on migrations. The five baseline files are for clean bootstrap and **must not be pushed to existing Production as ordinary pending migrations**. Existing environments require a controlled migration-ledger rebase only after baseline/catalog parity is proven; no tables or application data should be recreated.
- QA ledger reconciliation is now dispositioned in `supabase/rebuild/migration-history-reconciliation-20261026.json`: the four alternate identities were reviewed against canonical SQL effects and live ACL evidence. Two aliases are materially narrower than canonical revocations; the service-role alias differs in object/default scope; the application-default alias is effect-aligned but not identical. The two QA-only test rows are idempotent repeat revocations with no distinct schema/data effect established. **Preserve all six applied ledger identities** as truthful execution history; do not rename, delete, or replay them merely to make the QA ledger look canonical. Fresh environments use the canonical migration sequence. The QA effective security state is verified separately from migration identity.
- The automated gate `npm run verify:environment-alignment` now checks the canonical 15-file sequence, the nine Production-pending migrations, and the known QA ledger divergences. A passing inventory check is not a release approval; it reports cutover blocked until restore, live parity, QA equivalence, fresh ledger capture, and approval are attested.
- Live ACL and schema checks after QA hardening: `bethag-continuity-qa`, `bethag-member-transfer-qa`, and `bethag-migration-reconciliation-qa` all report 47 tables, 1 view, 626 columns, 304 constraints, 257 indexes, 171 functions, 103 policies, and 146 triggers. Each now reports zero `MAINTAIN` table grants for both `authenticated` and `service_role`, and `public.close_condominium_member_transfer(uuid)` is `SECURITY INVOKER`.
- `bethag-continuity-qa` required one additional targeted revocation on `public.condominium_legal_cases`; the subsequent live check returned no tables with `MAINTAIN` for `service_role`.
- Read-only catalog fingerprinting confirms exact equality between Production and all three full-schema QA environments for columns, constraints, indexes, RLS policies, triggers, and RLS flags. Function-definition fingerprints differ as expected because the hardened QA function uses `SECURITY INVOKER`; table-grant fingerprints differ where QA has had `MAINTAIN` removed. Fingerprints and counts are recorded in `supabase/rebuild/live-environment-status-20261027.json`.
- Default-privilege audit now confirms Production still grants default `MAINTAIN` to `anon`, `authenticated`, and `service_role` in `public`; all four non-production environments report zero such default grants. Production also still has current-table `MAINTAIN` on 33 tables for `authenticated` and 47 for `service_role`. This is the remaining live security drift.
- `bethag-migration-reconciliation-qa` has the desired effective privilege state, but its four alias migrations do not contain byte-identical SQL to the canonical migrations and two QA-only test rows remain. The alias SQL hashes and contents were inspected; do not rename or delete those ledger rows until the intended effects and future default-privilege behavior are explicitly reconciled.
- `bethag-develop` rebase failure evidence: Supabase workflow logs report `policy "residents read own portal access" for table "portal_access" does not exist` during `ALTER POLICY`. The current branch had only `authorized managers manage portal access`; the canonical resident policy was restored from the repository's `20260928043410_create_portal_access_baseline.sql` definition before retrying the rebase. Do not reset or delete the branch; verify its health and migration ledger before any further repair.
- `bethag-develop` recovery: the historical rebase failed on out-of-order RLS-policy dependencies. All 12 existing public tables were counted exactly and each contained zero rows; the branch is `with_data=false`. The empty development schema was rebuilt from the five canonical baseline migrations, the existing Production head, and nine pending migrations. Its catalog now matches the canonical fingerprints: 47 tables, 1 view, 626 columns, 304 constraints, 257 indexes, 171 functions, 103 policies, 146 triggers; both roles have zero `MAINTAIN` table grants and the close-transfer RPC is `SECURITY INVOKER`. The ledger has 15 canonical identities. Supabase now reports `FUNCTIONS_DEPLOYED` and `ACTIVE_HEALTHY`; the live ledger contains exactly the 15 canonical entries and Security Advisor returns no lints.
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
3. Restore the actual Supabase scheduled physical backup through Dashboard → Database → Backups → Restore to a New Project, to an isolated target that cannot write to Production. Record the source ref, exact selected backup timestamp/identifier, target ref, UTC completion time, and provider success result. A local `db dump` restore is useful supplemental evidence but does not satisfy this provider-backup gate. Do not create the paid restore project merely to clear the checklist; continue with free local recovery validation and keep this provider-specific gate explicitly blocked until a zero-cost valid method is available. Never use Production as the restore-test destination.
4. Verify restore integrity: migration ledger, required schemas/tables, extensions, critical row counts, functions/triggers, RLS policies, object ownership, grants, and default privileges.
5. Compare the restored live catalog against the five canonical baseline migrations plus the already-applied Production head migration. Compare tables/columns, constraints, indexes, views, functions and bodies, triggers, RLS policies, grants, ownership, and global/schema default ACLs. Stop on any unexplained difference.
6. **Do not delete, replace, or rewrite Production's 244 historical migration rows.** The Production schema and ledger are live evidence. Prepare a forward-only migration plan by matching each applied Production migration to its source SQL or a documented equivalent, marking unmatched entries for manual classification, and selecting only migrations that are proven not to have been applied. Never re-run the five baseline creation migrations on Production. Apply no DDL until the exact preflight output, backup restore evidence, and cutover approval are available.
7. For every QA/development branch, retain the live ledger and catalog snapshot. The three full-schema QA branches now have matching structural counts and least-privilege results, but their migration ledger identities still differ. For migration-reconciliation QA, prove the four alternate migration identities have the same intended effects as the canonical migrations and establish whether the two QA-only test rows introduced any unique state. Normalize tracking only after that proof; do not replay equivalent SQL. Verify the develop rebase completes and then compare its schema/ACL state. Production remains blocked.
8. Run the complete release migrations and application smoke tests on the isolated restored target. Save logs and query outputs.
9. Obtain explicit approval for the exact commit, migration list, outage window, rollback threshold, and responsible operator.


## Migration identity reconciliation — 2026-10-27

The three migration ledgers must be reconciled by identity and effect, not made artificially identical by deleting history. The continuity QA ledger records the following version/name identities that differ from the repository's canonical SQL filenames:

| QA ledger identity | Canonical repository SQL file | Required treatment |
|---|---|---|
| `20261027012027_restrict_close_member_transfer_execute_canonical` | `20261022213544_restrict_close_member_transfer_execute.sql` (same purpose; verify exact SQL/effect before treating as equivalent) | Alias candidate; do not replay automatically |
| `20261027012025_align_public_function_execute` | `20261022233440_align_public_function_execute.sql` | Alias candidate; verify SQL/effect |
| `20261027012027_revoke_authenticated_maintain` | `20261023000001_revoke_authenticated_maintain.sql` | Alias candidate; verify SQL/effect |
| `20261027012029_revoke_default_maintain` | `20261023000002_revoke_default_maintain.sql` | Alias candidate; verify SQL/effect |
| `20261027012032_revoke_service_role_maintain` | `20261023000003_revoke_service_role_maintain.sql` | Alias candidate; verify SQL/effect |
| `20261027012034_application_default_table_privileges` | `20261023000004_application_default_table_privileges.sql` | Alias candidate; verify SQL/effect |
| `20261027012037_use_invoker_for_close_transfer_rpc` | `20261023000733_use_invoker_for_close_transfer_rpc.sql` | Alias candidate; verify SQL/effect |
| `20261027012138_revoke_remaining_service_role_maintain_legal_cases` | No canonical file identified in the current 15-file branch inventory | Missing source; inspect exact SQL/effect before any release |

**Important:** these are identity candidates, not authorization to alter a ledger. The observed QA ledgers also contain environment-specific timestamps and test-only entries. Before release, capture each environment's exact `version`, `name`, and migration SQL where available; compare function bodies, grants, default ACLs and resulting catalog state. Keep all 244 Production records unchanged and apply only a reviewed forward migration set.

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


## Free local restore validation (no new Supabase project)

The local dump restore is supplemental evidence, not proof of restoring a provider-managed physical backup. To continue the free validation path, run the read-only audit from the repository root against the already restored local PostgreSQL database:

```powershell
$env:DATABASE_URL = "postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/YOUR_LOCAL_DATABASE"
psql -X -v ON_ERROR_STOP=1 -d $env:DATABASE_URL -f scripts/audit-local-restore.sql > bethag-local-restore-audit.txt
```

Use the actual local database name/port/password; do not paste credentials into GitHub or chat. The SQL script makes no changes. It reports row counts, relation inventory, constraint validation, invalid indexes, owners, direct ACL entries, default ACLs, RLS/policy coverage, and sequence owners/ACLs. In the direct-ACL section, distinguish explicit grants from effective privilege functions; do not treat a previous has_table_privilege report alone as proof that the ACL entries are directly granted.

Review the output for:
- invalid or not-ready indexes: none expected;
- unvalidated constraints: none expected unless explicitly documented;
- every public/private application object owner recorded;
- direct grants to PUBLIC / anon limited to intentional entries;
- anon, authenticated, and service_role default privileges consistent with the approved migration set;
- RLS enabled and policy counts consistent with the baseline.

This does not modify Production. Keep the provider physical-restore release gate blocked until a valid no-cost provider restore route or other formally accepted evidence exists.
