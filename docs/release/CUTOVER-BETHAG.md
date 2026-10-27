# BETHAG Production Cutover Plan

**Status:** DRAFT — NOT APPROVED  
**Scope:** Controlled database migration release  
**Production changes:** Prohibited until every gate below is evidenced and approved.

## Release gates

| Gate | Required evidence | Status |
|---|---|---|
| Backup identified | Backup artifact, source project, creation timestamp, format, and size recorded | BLOCKED |
| Restore test | Restore backup into an isolated disposable PostgreSQL/Supabase target; record commands, completion result, schema/data checks, and any warnings | BLOCKED |
| Restore integrity | Compare critical table row counts, migration history, extensions, roles/ACLs, functions, and RLS policies against the backup/source evidence | BLOCKED |
| Migration reconciliation | Compare production migration history with repository migrations; explain every missing, duplicated, or divergent version; agree on exact ordered migration set | PENDING EVIDENCE |
| Security/ACL parity | Capture and compare object owners, grants, default privileges, RLS policies, and function security settings; document intentional Supabase-managed differences | CI PASSED; LIVE EVIDENCE REQUIRED |
| Application validation | Build and focused smoke tests pass against the restored isolated target; confirm sign-in, role access, condominium data, accounting and portal workflows | PENDING |
| Cutover approval | Named approver accepts backup/restore evidence, migration plan, outage window, rollback criteria, and communication plan | NOT APPROVED |

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
