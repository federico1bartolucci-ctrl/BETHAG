# BETHAG Production Cutover Plan

**Status:** DRAFT — NOT APPROVED  
**Scope:** Controlled database migration release  
**Production changes:** Prohibited until every gate below is evidenced and approved.

## Release gates

| Gate | Required evidence | Status |
|---|---|---|
| Backup identified | Supabase scheduled physical backups visible; latest shown 2026-10-27 03:04:50 UTC (visible in Supabase Dashboard screenshot supplied 2026-10-27). Exact artifact metadata still to record | PARTIALLY VERIFIED |
| Restore test | Local logical-dump restore verified: 6 condominiums, 65 units, 20 members, 11 transfers. The scheduled provider-managed physical backup has not been physically restored in isolation | NOT TESTED — documented residual risk; named release approver must explicitly accept it |
| Restore integrity | Local logical-dump restore and critical counts were verified; full owner/default-ACL/RLS/function parity and application smoke evidence still need consolidation. Provider physical restore remains untested | PARTIAL — PHYSICAL RESTORE RISK OPEN |
| Migration reconciliation | Production has 244 rows; continuity QA 18 (`20261027093117`); recovered develop 16 (`20261027093101`); member-transfer QA 16 (`20261027093126`); migration-reconciliation QA 18 (`20261027093119`). Current post-remediation evidence is in `supabase/rebuild/live-qa-execute-hardening-20261027.json`. Six divergent QA ledger rows are dispositioned and preserved | QA DISPOSITION COMPLETE; PRODUCTION CUTOVER BLOCKED |
| Security/ACL parity | Production still has MAINTAIN on 33 tables for authenticated and 47 for service_role, default MAINTAIN for anon/authenticated/service_role, and close-transfer SECURITY DEFINER. Three full-schema QA branches and recovered develop have zero table MAINTAIN grants for app roles and close-transfer SECURITY INVOKER | NOT MET IN PRODUCTION |
| Application validation | GitHub Actions run `40483919350` passed on commit `a91f51a62a89a92acb6cb9d1ea6c6493dc0ee370`; it validates the build, migration reconciliation, and the complete ten-migration sequence on isolated PostgreSQL 17. Database-level transfer tests passed for authorization denial, successful close, outgoing-owner archive, incoming-owner retention, unpaid-installment rejection, and rollback. Browser-level sign-in, role navigation, resident portal, and accounting UI smoke tests on an isolated target remain unverified | NOT VERIFIED |
| Cutover approval | Named approver accepts backup/restore evidence, migration plan, outage window, rollback criteria, and communication plan | NOT APPROVED |

## Evidence snapshot — 2026-10-27

- Supabase scheduled physical backups are visible for 2026-10-20 through 2026-10-26; latest shown is 2026-10-27 03:04:50 UTC, confirmed visually in Supabase Dashboard on 2026-10-27. Storage API objects are excluded from database backups.
- The local Docker restore was completed from a logical database dump; its audit recorded 6 condominiums, 65 units, 20 members, and 11 member transfers. It does **not** prove recoverability of the provider-managed physical backup. The Dashboard showed an additional monthly cost of $9.68 for “Restore to a New Project”; that paid route was declined. No physical restore or support response is recorded. Keep recoverability marked **NOT TESTED — RESIDUAL RISK**; no further PC action is required for the preparation task. Before cutover, the named release approver must either accept this risk explicitly in writing or require provider-backed restore evidence. Never test restore in place on Production.
- Live Production migration ledger contains 244 records and ends at `20261022202747_harden_close_member_transfer_search_path`.
- Live migration ledgers were queried directly for all five environments. Current counts/heads are in `supabase/rebuild/live-qa-execute-hardening-20261027.json`: Production 244 (`20261022202747`); continuity QA 18 (`20261027093117`); develop 16 (`20261027093101`); member-transfer QA 16 (`20261027093126`); migration-reconciliation QA 18 (`20261027093119`). The older `live-environment-status-20261027.json` remains a historical 01:48 UTC snapshot, before the helper-ACL remediation. The ledgers are not identical because QA hardening steps have alternate recorded versions and older aliases remain.
- The canonical branch now has 16 migration files: five baseline migrations, the already-applied Production head migration `20261022202747`, and ten ordered incremental migrations including the new helper-ACL correction `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql`. The five baseline files are for clean bootstrap and **must not be pushed to existing Production as ordinary pending migrations**. Existing environments require a controlled migration-ledger rebase only after baseline/catalog parity is proven; no tables or application data should be recreated.
- QA ledger reconciliation is now dispositioned in `supabase/rebuild/migration-history-reconciliation-20261026.json`: the four alternate identities were reviewed against canonical SQL effects and live ACL evidence. Two aliases are materially narrower than canonical revocations; the service-role alias differs in object/default scope; the application-default alias is effect-aligned but not identical. The two QA-only test rows are idempotent repeat revocations with no distinct schema/data effect established. **Preserve all six applied ledger identities** as truthful execution history; do not rename, delete, or replay them merely to make the QA ledger look canonical. Fresh environments use the canonical migration sequence. The QA effective security state is verified separately from migration identity.
- The automated gate `npm run verify:environment-alignment` checks the canonical 16-file sequence, the ten Production-pending migrations, and known QA ledger divergences. The six QA ledger rows have now been dispositioned: preserve all six without rewriting identities. A passing inventory check is not a release approval; cutover remains blocked until live ACL/ownership/default-privilege parity, migration-history classification, isolated application smoke tests, and explicit approval are attested. The physical-restore risk must either be proven resolved or accepted in writing by the named release approver.
- Live ACL and schema checks after QA hardening: `bethag-continuity-qa`, `bethag-member-transfer-qa`, and `bethag-migration-reconciliation-qa` all report 47 tables, 1 view, 626 columns, 304 constraints, 257 indexes, 171 functions, 103 policies, and 146 triggers. Each now reports zero `MAINTAIN` table grants for both `authenticated` and `service_role`, and `public.close_condominium_member_transfer(uuid)` is `SECURITY INVOKER`.
- `bethag-continuity-qa` required one additional targeted revocation on `public.condominium_legal_cases`; the subsequent live check returned no tables with `MAINTAIN` for `service_role`.
- Read-only catalog fingerprinting confirms exact equality between Production and all three full-schema QA environments for columns, constraints, indexes, RLS policies, triggers, and RLS flags. Function-definition fingerprints differ as expected because the hardened QA function uses `SECURITY INVOKER`; table-grant fingerprints differ where QA has had `MAINTAIN` removed. Fingerprints and counts are recorded in `supabase/rebuild/live-environment-status-20261027.json`.
- Effective current-table CRUD check: Production and the three full-schema QA environments match for `authenticated` (SELECT 47, INSERT 41, UPDATE 41, DELETE 42); recovered develop is broader with authenticated CRUD on all 47 relations. Do not use develop alone as Production ACL parity evidence or overwrite Production current-table CRUD grants blindly.
- Default-privilege audit now confirms Production still grants default `MAINTAIN` to `anon`, `authenticated`, and `service_role` in `public`; the `postgres`-owned `public` defaults for app roles are removed in QA; Supabase-managed `supabase_admin` defaults remain visible under their actual owner and must not be changed by application migrations. Production also still has current-table `MAINTAIN` on 33 tables for `authenticated` and 47 for `service_role`. This is the remaining live security drift.
- `bethag-migration-reconciliation-qa` has the desired effective privilege state, but its four alias migrations do not contain byte-identical SQL to the canonical migrations and two QA-only test rows remain. The alias SQL hashes and contents were inspected; do not rename or delete those ledger rows until the intended effects and future default-privilege behavior are explicitly reconciled.
- `bethag-develop` rebase failure evidence: Supabase workflow logs report `policy "residents read own portal access" for table "portal_access" does not exist` during `ALTER POLICY`. The current branch had only `authorized managers manage portal access`; the canonical resident policy was restored from the repository's `20260928043410_create_portal_access_baseline.sql` definition before retrying the rebase. Do not reset or delete the branch; verify its health and migration ledger before any further repair.
- `bethag-develop` recovery: the historical rebase failed on out-of-order RLS-policy dependencies. All 12 existing public tables were counted exactly and each contained zero rows; the branch is `with_data=false`. The empty development schema was rebuilt from the five canonical baseline migrations, the existing Production head, and nine pending migrations. Its catalog now matches the canonical fingerprints: 47 tables, 1 view, 626 columns, 304 constraints, 257 indexes, 171 functions, 103 policies, 146 triggers; both roles have zero `MAINTAIN` table grants and the close-transfer RPC is `SECURITY INVOKER`. The original recovery ledger had 15 canonical identities; a subsequent helper-ACL remediation is recorded as entry 16. Supabase reports `FUNCTIONS_DEPLOYED` and `ACTIVE_HEALTHY`. Fresh Security Advisor queries returned zero lints in all four non-Production environments after the helper ACL remediation.
- Ten incremental migrations after the current Production head are not registered in Production and need semantic/order reconciliation before execution:
  1. `20261022210629_restrict_private_function_public_execute.sql`
  2. `20261022210630_harden_default_privileges_and_private_execute.sql`
  3. `20261022213544_restrict_close_member_transfer_execute.sql`
  4. `20261022233440_align_public_function_execute.sql`
  5. `20261023000001_revoke_authenticated_maintain.sql`
  6. `20261023000002_revoke_default_maintain.sql`
  7. `20261023000003_revoke_service_role_maintain.sql`
  8. `20261023000004_application_default_table_privileges.sql`
  9. `20261023000733_use_invoker_for_close_transfer_rpc.sql`
  10. `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql`
- Read-only Production inspection found 48 relations in schema `public` (47 table/partition relations plus one view), all owned by `postgres`. Effective privilege checks on the 47 table/partition relations found `MAINTAIN` on 33 tables for `authenticated` and on all 47 for `service_role`. `service_role` also has `TRUNCATE`, `REFERENCES`, and `TRIGGER` on all 47; `anon` has none of these structural privileges. `authenticated` has none of these structural privileges according to `has_table_privilege` checks.
- GitHub Actions run `40473549315` for commit `0f8a70f767b226c6cf9adbac9cc3bb8fe49b60a4` completed successfully on 2026-10-27: `build` and `postgres-bootstrap` both passed. The build job also completed migration-history reconciliation, Production function-security/ACL parity checks, fresh PostgreSQL bootstrap, and application build. This is CI evidence, not a live Production cutover test.
- Live Supabase Security Advisor at 2026-10-27 01:10 UTC still reports one warning: `public.close_condominium_member_transfer(uuid)` is executable by `authenticated` while marked `SECURITY DEFINER`. Migration `20261023000733_use_invoker_for_close_transfer_rpc.sql` is the planned remediation, but it is not recorded in Production yet.
- Live Performance Advisor reports 62 unused-index notices and 21 multiple-permissive-policy notices. These are recorded for a separate measured performance/policy review; do not drop indexes or rewrite RLS policies as part of this privilege cutover without usage and access-path validation.
- Production has not been modified. Security hardening was applied only to the two isolated QA branches `bethag-continuity-qa` and `bethag-member-transfer-qa`; `bethag-migration-reconciliation-qa` was already hardened. PR #24 remains open/draft. Cutover is blocked until the develop rebase completes, ledger identities are reconciled, Production backup/restore and catalog parity are verified, and the canonical plan is approved.

## Pre-cutover procedure

1. Freeze schema-changing work and identify the exact release commit and migration list.
2. Produce a fresh provider-supported backup or database dump. Record UTC timestamp, source project identifier, artifact checksum, and secure storage location.
3. **Physical-backup restore disposition:** Supabase's official documentation states that “Restore to a New Project” is limited to paid-plan users with physical backups enabled, and physical backups are not directly downloadable for local restore. Sources: https://supabase.com/docs/guides/platform/clone-project and https://supabase.com/kb/troubleshooting/download-logical-backups. The Dashboard displayed an additional monthly compute charge of $9.68; the paid route is excluded. Do not create a paid project or restore over Production. Keep the fact “physical restore not tested” explicit as a residual risk, and require the named release approver to accept or reject that risk in writing. This gate is not represented as a successful physical restore. If the approver requires physical-restore proof, release remains blocked until Supabase provides a zero-cost provider-supported method or equivalent evidence. Never use Production as the restore-test destination.
4. Verify restore integrity: migration ledger, required schemas/tables, extensions, critical row counts, functions/triggers, RLS policies, object ownership, grants, and default privileges.
5. Compare the restored live catalog against the five canonical baseline migrations plus the already-applied Production head migration. Compare tables/columns, constraints, indexes, views, functions and bodies, triggers, RLS policies, grants, ownership, and global/schema default ACLs. Stop on any unexplained difference.
6. **Do not delete, replace, or rewrite Production's 244 historical migration rows.** The Production schema and ledger are live evidence. Prepare a forward-only migration plan by matching each applied Production migration to its source SQL or a documented equivalent, marking unmatched entries for manual classification, and selecting only migrations that are proven not to have been applied. Never re-run the five baseline creation migrations on Production. Apply no DDL until the exact preflight output, either verified isolated-restore evidence or explicit written acceptance of the documented physical-restore risk, and cutover approval are available.
7. For every QA/development branch, retain the live ledger and catalog snapshot. The three full-schema QA branches plus recovered develop now have matching structural counts and least-privilege results, but their migration ledger identities still differ. For migration-reconciliation QA, prove the four alternate migration identities have the same intended effects as the canonical migrations and establish whether the two QA-only test rows introduced any unique state. Normalize tracking only after that proof; do not replay equivalent SQL. Verify the develop rebase completes and then compare its schema/ACL state. Production remains blocked.
8. Run the complete release migrations and application smoke tests on the isolated restored target. Save logs and query outputs.
9. Obtain explicit approval for the exact commit, migration list, outage window, rollback threshold, and responsible operator.


## Migration identity reconciliation — 2026-10-27

**Update after the first cutover-plan draft:** the continuity-only SQL recovery is complete and documented above; the historical QA row remains preserved. Production remains unchanged.

The live ledgers show that QA variants must be treated as environment-specific execution history. A filename with a similar name is not sufficient proof of equivalent effects.

### Migration-reconciliation QA (`mxhciszzpqzvsaqcnwhg`)

| Recorded QA identity | Canonical candidate | Disposition |
|---|---|---|
| `20261022213544_restrict_close_member_transfer_execute` | `20261022213544_restrict_close_member_transfer_execute.sql` | Exact identity; inspect as applied history, do not replay |
| `20261022230901_revoke_authenticated_maintain` | `20261023000001_revoke_authenticated_maintain.sql` | Different timestamp and narrower SQL scope; not interchangeable without a forward correction |
| `20261022230908_revoke_default_maintain` | `20261023000002_revoke_default_maintain.sql` | Different timestamp/scope; keep the row and validate effective defaults separately |
| `20261022233440_align_public_function_execute` | `20261022233440_align_public_function_execute.sql` | Exact identity |
| `20261023000733_use_invoker_for_close_transfer_rpc` | `20261023000733_use_invoker_for_close_transfer_rpc.sql` | Exact identity |
| `20261023010544_qa_test_revoke_authenticated_maintain_20261023` | QA-only test | Preserve as history; do not replay or delete |
| `20261023010548_qa_test_revoke_default_maintain_20261023` | QA-only test | Preserve as history; do not replay or delete |
| `20261023011431_revoke_service_role_maintain_qa_test` | `20261023000003_revoke_service_role_maintain.sql` | QA-specific scope/name; preserve identity and validate resulting grants |
| `20261023011435_define_application_default_table_privileges_qa` | `20261023000004_application_default_table_privileges.sql` | QA-specific identity; preserve history and validate defaults |

### Continuity and member-transfer QA

- Continuity QA (`srkucrdcoswlozifvztr`) has 17 rows, including `20261027012022_restrict_close_member_transfer_execute_canonical`, `20261027012025_align_public_function_execute`, `20261027012027_revoke_authenticated_maintain`, `20261027012029_revoke_default_maintain`, `20261027012032_revoke_service_role_maintain`, `20261027012034_application_default_table_privileges`, `20261027012037_use_invoker_for_close_transfer_rpc`, and `20261027012138_revoke_remaining_service_role_maintain_legal_cases`.
- Member-transfer QA (`gcorwfvnslnehcxmtixn`) has 15 rows with alternate versions for function ACL alignment and privilege changes; its close-transfer restriction is recorded as `20261022213542_restrict_close_member_transfer_execute`.
- The continuity-only `20261027012138_revoke_remaining_service_role_maintain_legal_cases` entry was recovered from the live continuity-QA migration ledger. Its exact statement is `REVOKE MAINTAIN ON TABLE public.condominium_legal_cases FROM service_role;`. A read-only post-check confirms zero public tables with `MAINTAIN` for `service_role` in continuity QA. It is a QA-only historical execution record, not a new canonical Production migration; preserve its ledger identity and do not replay it on Production.

**Decision:** preserve every existing QA and Production ledger row as evidence. Do not normalize ledger metadata, delete test rows, or replay alias SQL merely to make names match. The effective QA security state (zero application-table `MAINTAIN`, public close-transfer wrapper `SECURITY INVOKER`) is a separate verification from migration identity. The Production release list must be derived from its live schema and ledger and must exclude any effect already present. The new helper-ACL correction has been applied only to QA/develop; it remains pending in Production.

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
- If neither a verified isolated restore nor explicit written acceptance of the documented physical-restore risk exists, do not cut over. Independently require a fresh pre-cutover backup/dump and a reviewed rollback/recovery procedure.

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

This does not modify Production. Keep physical-backup recoverability explicitly marked NOT TESTED; do not claim a physical restore succeeded. The residual risk can be closed only by provider-backed restore evidence or explicit written acceptance from the named release approver.


## Decision update — backup evidence and release work (2026-10-27)

The team accepts the Supabase Dashboard confirmation of scheduled physical backups as evidence that scheduled backups exist. A paid “Restore to a New Project” test is explicitly **not required** and must not be purchased solely to satisfy this checklist. This does not prove physical restore recoverability. Record the untested restore as a residual risk and require a named release approver to accept it explicitly in writing; if the approver does not accept it, the release remains blocked.

Accordingly, the former provider physical-backup restore gate is replaced by:
- **Backup existence:** VERIFIED by the Supabase Dashboard evidence recorded above.
- **Backup recoverability:** no restore-test claim is made; retain as a documented residual risk, not an automatic blocker requiring a paid project.
- **Release still blocked** until live ACL/default-privilege remediation is prepared and validated, the exact Production migration sequence/history is reconciled without replaying baseline migrations, application smoke tests pass, and the cutover is explicitly approved.

### Concrete current Production security baseline (read-only live queries, 2026-10-27)

- 47 public table/partition relations checked.
- Effective MAINTAIN: anon 0/47, authenticated 33/47, service_role 47/47.
- public.close_condominium_member_transfer(uuid) is still SECURITY DEFINER; explicit EXECUTE ACL currently includes postgres, authenticated, and service_role.
- The live public schema default-ACL catalog includes MAINTAIN entries associated with both postgres and supabase_admin. Do not modify platform-managed supabase_admin defaults; classify the postgres entries by grantee and ACL before applying the planned defaults migration.

These are read-only observations; no Production database changes were made.


## Post-remediation QA function ACL check — 2026-10-27

A read-only ACL query found that the two closure-check helper functions were still executable by PUBLIC in all four QA/development environments, even though an earlier identity for the broad function-ACL migration was already recorded. Added the idempotent forward migration `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql` and applied it to the four non-Production projects only. Fresh read-only queries confirmed on all four that both helpers are no longer PUBLIC-executable and remain executable by `authenticated` and `service_role`; the two intentional trigger exceptions `public.normalize_zero_ownership_owner()` and `public.preserve_closing_condominium_member_history()` remain PUBLIC-executable. The four QA ledgers gained one truthful execution row each; no historical row was changed. Evidence: `supabase/rebuild/live-qa-execute-hardening-20261027.json`. Production remains unchanged.


## Current release evidence and remaining execution gates

- Live read-only migration ledger comparison: `supabase/rebuild/live-migration-ledger-reconciliation-20261027.json`. Production remains at 244 ledger entries/head `20261022202747`; eleven canonical incremental migrations remain pending. QA ledgers use environment-specific version identities for several equivalent effects; reconcile source/effect before the cutover and never rewrite Production history.
- Application acceptance checklist: `docs/release/APP-SMOKE-TEST-AND-CUTOVER-APPROVAL.md`. It defines 15 role, accounting, transfer, portal, isolation and rollback checks. A narrow real-auth login/landing/session smoke passed for the three configured roles on QA Pages (CI run `40629723826`); the full APP-01–APP-15 acceptance suite remains NOT RUN.
- Latest CI is required on the exact PR head. Passing build and PostgreSQL 17 bootstrap are necessary but do not substitute for the application smoke tests or named cutover approval.
- Production remains unchanged. Do not apply any migration until the exact ordered list, live ACL/default-ACL comparison, application results, rollback plan and explicit named approval are recorded. The physical-backup restore remains untested and documented as a residual risk.


## Live migration effect review — 2026-10-27

The detailed, source-hash-backed review is `docs/release/PRODUCTION-MIGRATION-EFFECT-RECONCILIATION-20261027.md`; the live catalog evidence is `supabase/rebuild/production-migration-effect-observations-20261027.json`. The original ten pending migrations are now **eleven** because a real effective-privilege check found that the `SECURITY INVOKER` wrapper's service-role call path is incomplete: Production has no `service_role` USAGE on `private` and no EXECUTE on `private.close_condominium_member_transfer(uuid)`. This mismatch also exists in the queried QA function ACLs despite migration 9 being recorded there. A new forward-only correction, `20261027110000_repair_service_role_transfer_invoker_path.sql`, has been added; no historical migration was edited or replayed.

Fail-closed read-only assertions are prepared in `supabase/rebuild/production-cutover-preflight-20261027.sql` and `supabase/rebuild/production-cutover-postflight-20261027.sql`. They have not been run as a release rehearsal and do not authorize execution. Candidate total is 11 new canonical records after the 244-row historical Production ledger (expected count 255 only after all eleven are approved/applied). Production remains unchanged.


### QA-only validation of the additional correction

The new forward correction was applied only to the four non-Production environments. Supabase generated environment-specific ledger versions: develop `20261027101109` (17 rows), continuity QA `20261027101123` (19), member-transfer QA `20261027101130` (17), and migration-reconciliation QA `20261027100507` (19). Preserve these exact rows; do not rewrite them to the repository version. Read-only postchecks passed in all four for service_role private-schema USAGE and private function EXECUTE, authenticated EXECUTE retained, anon denied, and the public wrapper remaining SECURITY INVOKER. This is a permission-path test only; transfer business-path and rollback tests remain outstanding. Production was not changed.
