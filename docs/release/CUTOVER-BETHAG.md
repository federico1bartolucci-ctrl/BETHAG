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
| Application validation | GitHub Actions run `40483919350` passed on commit `a91f51a62a89a92acb6cb9d1ea6c6493dc0ee370`; it validates the build, migration reconciliation, and the complete twelve-migration sequence on isolated PostgreSQL 17. Database-level transfer tests passed for authorization denial, successful close, outgoing-owner archive, incoming-owner retention, unpaid-installment rejection, and rollback. Browser-level sign-in, role navigation, resident portal, and accounting UI smoke tests on an isolated target remain unverified | NOT VERIFIED |
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
- Twelve incremental migrations after the current Production head are not registered in Production and need semantic/order reconciliation before execution:
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
  11. `20261027110000_repair_service_role_transfer_invoker_path.sql`
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

- Live read-only migration ledger comparison: `supabase/rebuild/live-migration-ledger-reconciliation-20261027.json`. Production remains at 244 ledger entries/head `20261022202747`; twelve canonical incremental migrations remain pending. QA ledgers use environment-specific version identities for several equivalent effects; reconcile source/effect before the cutover and never rewrite Production history.
- Application acceptance checklist: `docs/release/APP-SMOKE-TEST-AND-CUTOVER-APPROVAL.md`. It defines 15 role, accounting, transfer, portal, isolation and rollback checks. A narrow real-auth login/landing/session smoke passed for the three configured roles on QA Pages (CI run `40629723826`); the full APP-01–APP-15 acceptance suite remains NOT RUN.
- Latest CI is required on the exact PR head. Passing build and PostgreSQL 17 bootstrap are necessary but do not substitute for the application smoke tests or named cutover approval.
- Production remains unchanged. Do not apply any migration until the exact ordered list, live ACL/default-ACL comparison, application results, rollback plan and explicit named approval are recorded. The physical-backup restore remains untested and documented as a residual risk.


## Live migration effect review — 2026-10-27

The detailed, source-hash-backed review is `docs/release/PRODUCTION-MIGRATION-EFFECT-RECONCILIATION-20261027.md`; the live catalog evidence is `supabase/rebuild/production-migration-effect-observations-20261027.json`. The original ten pending migrations were expanded to eleven, and the 2026-10-28 collaborator-permission correction makes the current candidate **twelve** because a real effective-privilege check found that the `SECURITY INVOKER` wrapper's service-role call path is incomplete: Production has no `service_role` USAGE on `private` and no EXECUTE on `private.close_condominium_member_transfer(uuid)`. This mismatch also exists in the queried QA function ACLs despite migration 9 being recorded there. A new forward-only correction, `20261027110000_repair_service_role_transfer_invoker_path.sql`, has been added; no historical migration was edited or replayed.

Fail-closed read-only assertions are prepared in `supabase/rebuild/production-cutover-preflight-20261027.sql` and `supabase/rebuild/production-cutover-postflight-20261027.sql`. They have not been run as a release rehearsal and do not authorize execution. Candidate total is 12 new canonical records after the 244-row historical Production ledger (expected count 256 only after all twelve are approved/applied). Production remains unchanged.


### QA-only validation of the additional correction

The new forward correction was applied only to the four non-Production environments. Supabase generated environment-specific ledger versions: develop `20261027101109` (17 rows), continuity QA `20261027101123` (19), member-transfer QA `20261027101130` (17), and migration-reconciliation QA `20261027100507` (19). Preserve these exact rows; do not rewrite them to the repository version. Read-only postchecks passed in all four for service_role private-schema USAGE and private function EXECUTE, authenticated EXECUTE retained, anon denied, and the public wrapper remaining SECURITY INVOKER. This is a permission-path test only; transfer business-path and rollback tests remain outstanding. Production was not changed.


## Addendum 2026-11-05 — stato attuale del cutover

- Production live ledger: 248 righe, head `20261104222229_reconcile_production_acl_least_privilege`; QA esistente: 283 righe.
- Sequenza congelata: 19 incrementi canonici, senza inserire baseline e senza riscrivere le 248 righe storiche.
- Rehearsal PostgreSQL 17 isolato [run 42017349811](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42017349811): **PASS**. Clean install 28 migrazioni; guarded runner 19 incrementi; ledger finale isolato 267; draft ACL, colonna workspace_members.data, rollback subentro e permessi collaboratore PASS.
- Final QA [run 42017349896](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42017349896): **SUCCESS**, ma APP-12 provider delivery resta PARTIAL per configurazione Edge Function QA mancante; APP-14 resta gate post-cutover.
- La precedente registrazione che attribuiva all'utente un'autorizzazione generale al rilascio è stata rettificata il 2026-11-06: **l'approvazione finale del cutover Production non è stata ricevuta**. L'istruzione «tu lavori io approvo» individua il proprietario come approvatore, ma non autorizza merge, deploy o apply.
- Il restore logico locale è stato verificato; il restore fisico provider-managed non è stato eseguito. La precedente opzione Supabase “Restore to a New Project” da 9,68 USD/mese era stata esclusa. Non creare un progetto di recupero a pagamento; il rischio residuo è stato disposto come accettato dall'utente il 2026-10-27 sulla base della visibilità dei backup e del restore logico locale; il restore fisico resta non verificato e non va dichiarato superato.
- La configurazione Data API Production per lo schema provider-managed `supabase_functions` non è ancora verificata manualmente.
- Il runner richiede un `DATABASE_URL` PostgreSQL diretto e il set completo dei gate; `supabase migration apply_migration` non è un sostituto perché non preserva la sequenza di versioni canoniche.
- Nessuna migrazione Production applicata, nessuna scrittura ledger, nessun merge/deploy/cutover. Il gate Production resta **NO-GO** fino alla chiusura dei residui.


## Addendum operativo — sblocco APP-14 (2026-11-05)

Questo addendum supersede le note storiche non più attuali del documento e del freeze. Il JSON `production-migration-cutover-freeze-20261105.json` resta immutato come reperto congelato; non correggere le sue note storiche APP-12. Per lo stato corrente fanno fede le evidenze qui riportate e i report QA/Production aggiornati.

### Stato tecnico corrente verificato

- Branch: `fix/qa-view-acl-parity-20261105`.
- Commit con collaudo QA completo: `93f23d95108cba8b4c791fc7a3c99b21cb27799e`; Final QA [42043452669](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452669), Build [42043452826](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452826), Baseline Safety [42043452653](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452653): tutti SUCCESS.
- La successiva documentazione ha attivato CI sul commit `bddbf5660a1c33850133f65879f1ae1a6c5d41cd`: Baseline Safety [42044367059](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42044367059) SUCCESS; Final QA [42044367044](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42044367044) SUCCESS. Build [42044367075](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42044367075) era ancora in coda al momento dell'aggiornamento.
- APP-01–APP-15: PASS sul solo progetto QA esistente; APP-12 provider Resend e webhook firmato verificati verso QA. Non usare più le vecchie note del freeze che descrivono APP-12 come non verificato.
- Backup: restore logico locale verificato; restore fisico provider-managed NON ESEGUITO. Il rischio residuo è stato accettato dal proprietario il 2026-10-27, come registrato nel freeze. Non dichiarare un physical restore superato e non creare un progetto a pagamento.
- Ledger Production: 248 righe, head `20261104222229_reconcile_production_acl_least_privilege`; preservare tutte le 248 righe esattamente.
- Sequenza approvata per rehearsal: 19 migrazioni forward-only; ledger finale atteso 267. Rehearsal PostgreSQL 17 isolato PASS, run [42017349811](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42017349811). Clean install 28 SQL e runner guarded verificati in CI.
- Divergenze live Production confermate read-only: manca `public.workspace_members.data`; manca il trigger `trg_apply_incoming_transfer_member_metadata`; le funzioni `private.can_access_workspace_module` e `private.can_manage_workspace_module` non rispettano il valore booleano false dei permessi collaboratore. Restano inoltre le altre divergenze applicative/ACL del report `QA-PRODUCTION-PARITY-20261105.md`.
- Nessun DDL, grant/revoke, scrittura ledger, deploy, merge o cutover Production è stato eseguito.

### Gate APP-14 residui — ordine obbligatorio

1. **Dashboard Data API Production — attestazione manuale, sola lettura.** Aprire il progetto BETHAG Production (`tctcgptrsmvgajqjgnev`) in Supabase Dashboard, quindi `Integrations → Data API → Settings`. Registrare screenshot/data e verificare:
   - `public` presente negli Exposed schemas;
   - `supabase_functions` assente dagli Exposed schemas;
   - `Automatically expose new tables` disattivato.
   Non cambiare alcuna impostazione durante questa verifica. Se lo schema `supabase_functions` risulta esposto o il toggle è attivo, fermarsi e riportare il dato: non tentare di correggerlo automaticamente. La documentazione Supabase colloca queste opzioni nella sezione Data API Settings e chiarisce che l'esposizione degli schemi e i grant PostgreSQL sono livelli distinti.
2. **Connessione PostgreSQL diretta.** Recuperare dal pulsante `Connect` del progetto Production una URI PostgreSQL diretta o Session Pooler, con ruolo `postgres` e privilegi DDL. La password deve provenire dal password manager o dalla fonte sicura già in uso: non incollarla in chat, issue, PR o file. Non resettare la password per sbloccare il gate. Il runner richiede la variabile locale `DATABASE_URL`; il connettore Supabase MCP non restituisce la password e `apply_migration` non è un sostituto valido.
3. **Pin finale e piano operativo.** Dopo CI verde sul commit documentale definitivo, congelare SHA commit e hash dei 19 SQL. Il piano deve indicare operatore responsabile, finestra di manutenzione Europe/Rome, avviso agli utenti, verifica preventiva backup, durata attesa, criteri di stop, contatti e procedura di ripristino. Il rischio residuo del physical restore resta non verificato. L'accettazione storica del 2026-10-27 non sostituisce la riconferma esplicita per questa specifica finestra di cutover.
4. **Esecuzione controllata, solo dopo tutti i gate.** Da checkout pulito del commit approvato, impostare localmente le variabili richieste dal runner guarded. Eseguire prima il preflight read-only `production-cutover-preflight-20261105.sql`; solo se PASS e dopo approvazione formale eseguire `scripts/apply-reviewed-production-migrations.mjs`. Il runner deve usare esclusivamente la URI Production fornita dall'operatore, confrontare le 248 righe live con lo snapshot e aggiungere una migrazione per transazione, fermandosi al primo errore. Non eseguire `supabase db push`, `apply_migration` o replay della baseline.
5. **Postflight e smoke autenticato.** Eseguire `production-cutover-postflight-20261105.sql`; verificare 267 righe, tutte le 248 righe storiche intatte, 19 coppie canoniche esatte, ACL/default ACL, funzioni, trigger, profili e portale. Poi eseguire il test autenticato Production previsto dal piano senza creare o alterare dati reali. Qualunque mismatch = STOP e decisione di rollback secondo il piano approvato.

### Informazioni non ottenibili dagli strumenti collegati

- La Dashboard Data API è un'impostazione di progetto non esposta dal connettore Supabase: serve una verifica visiva dell'operatore.
- Il connettore restituisce host e stato del progetto, non la password PostgreSQL né una URI autenticata. La connessione va fornita in locale dall'operatore.
- Non è disponibile un'azione GitHub per scrivere secrets o lanciare un workflow dispatch; non inserire segreti nel repository per aggirare questo limite.

**Decisione corrente: APP-14 PARTIAL / NO-GO.** La preparazione tecnica e la rehearsal sono completate; nessuna modifica Production è autorizzata finché i gate 1–3 non sono documentati e il preflight non passa.


### Evidenza manuale Dashboard Data API — 2026-11-05

Screenshot forniti dall'operatore durante la verifica Production (ore locali mostrate: 15:30–15:33):

- Exposed schemas: 2 of 3. L'elenco mostra `graphql_public` selezionato, `private` non selezionato e `public` selezionato.
- Di conseguenza `public` è esposto, `private` non è esposto e `graphql_public` è esposto.
- `supabase_functions` non compare nell'elenco dei tre schemi mostrati; in questa schermata non risulta esposto.
- Exposed tables: 0 of 48; exposed functions: 0 of 171.
- Il toggle `Automatically expose new tables` è visibilmente ATTIVO (verde). Il requisito di release richiede OFF.
- Nessuna impostazione è stata modificata durante la verifica.

**Esito gate Dashboard:** PARTIAL / BLOCKED. Il requisito relativo a `public` e `supabase_functions` risulta conforme sulla base delle schermate; resta da disattivare `Automatically expose new tables` e salvare la modifica, quindi acquisire una nuova schermata che provi lo stato OFF. La presenza di `graphql_public` è registrata come esposizione aggiuntiva, non è di per sé uno dei criteri di blocco definiti nel gate corrente.

La modifica del toggle è una configurazione di progetto nella Dashboard e non è disponibile tramite le azioni Supabase collegate. Deve essere eseguita dall'operatore autorizzato nella Dashboard Production. Fino alla nuova attestazione, APP-14 resta NO-GO; nessuna migrazione, DDL, modifica ACL, merge o deploy è autorizzato da questa evidenza.


### Conferma toggle Data API OFF — 2026-11-05

Seconda schermata Production fornita dall'operatore (ora locale mostrata: 15:37):

- `Automatically expose new tables`: toggle grigio, posizione OFF.
- Exposed tables: 0 of 48.
- Exposed functions: 0 of 171.
- Nessuna tabella o funzione risulta individualmente esposta in questa schermata.

**Esito:** la precedente difformità del toggle risulta corretta e attestata visivamente. Insieme alla schermata precedente, risultano `public` esposto e `supabase_functions` non presente tra gli schemi selezionati. La verifica Dashboard Data API è quindi **PASS sulla base delle schermate fornite**. `graphql_public` resta esposto ed è registrato come configurazione aggiuntiva.

Questo PASS chiude esclusivamente il gate manuale Dashboard; non chiude APP-14 né autorizza operazioni Production. Restano la connessione PostgreSQL diretta fornita localmente dall'operatore, il pin del commit e del piano operativo, il preflight read-only, l'approvazione esplicita del cutover, l'esecuzione guarded e il postflight.


## Addendum audit complessivo APP-14 — 2026-11-05

Il report consolidato e aggiornato è `docs/release/APP14-COMPREHENSIVE-AUDIT-20261105.md`. Questo addendum supersede le note storiche che riportavano la verifica Data API Production come non eseguita.

- **Data API Dashboard Production: PASS** sulla base delle schermate dell'operatore: `public` esposto, `private` non esposto, `graphql_public` esposto come schema aggiuntivo, `supabase_functions` non presente fra gli schemi selezionati; 0/48 tabelle e 0/171 funzioni esposte individualmente; `Automatically expose new tables` OFF.
- **Ledger live Production: PASS** — 248 righe e 248/248 coppie versione/nome identiche allo snapshot `production-ledger-20261105.json`; head invariato `20261104222229`.
- **Preflight read-only Production: PASS** — il file aggiornato `production-cutover-preflight-20261105.sql` è stato eseguito via query read-only senza eccezioni. Oltre agli assert precedenti controlla la logica collaboratore pre-cutover, i 18 grant RPC attesi come mancanti, il helper transfer-closure e l'USAGE dello schema private.
- Stato live letto: 47 tabelle/partizioni + una view; MAINTAIN effettivo zero per authenticated e service_role; Security Advisor zero lint; `workspace_members.data` assente; trigger e funzione co-owner assenti; le due funzioni collaboratore mantengono il difetto booleano atteso prima della migrazione.
- Il postflight è stato corretto: ora dichiara 19 incrementi (non 16) e verifica anche EXECUTE di `service_role` sul helper transfer-closure. La verifica statica del runner è stata ampliata per proteggere i nuovi assert.
- Sequenza congelata invariata: 19 migrazioni forward-only e ledger finale atteso 267. Non è emersa la necessità di aggiungere una ventesima migrazione: le correzioni individuate sono già coperte dai 19 payload approvati.

**Gate ancora aperti:** disponibilità locale di `DATABASE_URL` PostgreSQL diretto/Session Pooler con ruolo postgres; pin definitivo del commit dopo CI verde; piano operativo con responsabile, finestra manutenzione Europe/Rome, comunicazione utenti, criteri STOP, rollback e contatti. Il restore fisico provider-managed resta non testato ma il rischio residuo è già accettato nel freeze.

**Decisione:** APP-14 resta **NO-GO**. La preparazione tecnica e il preflight read-only sono superati; non sono state eseguite scritture Production, migrazioni, merge, deploy o cutover. Il runner guarded potrà essere avviato soltanto dopo la chiusura documentata dei gate residui e l'approvazione operativa del cutover.


---

## Current release status — authoritative update 2026-11-06

This section supersedes the historical 2026-10-27 snapshot and any older migration counts or gate descriptions above. Historical entries remain as provenance and must not be read as the current live state.

**Decision: NO-GO for Production cutover.** No Production or QA database changes, migration execution, merge, deployment, or launch are authorized by this document.

### Verified technical evidence

| Control | Current evidence | Status |
|---|---|---|
| Production migration ledger | Frozen read-only snapshot: 248 exact version/name pairs; head `20261104222229_reconcile_production_acl_least_privilege` | SNAPSHOT RECORDED — refresh required immediately before any cutover |
| Production forward plan | 19 reviewed canonical migrations; 248 historical rows preserved; expected final ledger 267 | REVIEWED — NOT APPLIED |
| PostgreSQL 17 rehearsal | Isolated rehearsal executed all 19 real SQL files through the guarded runner; final 267-row ledger and postflight asserted | PASS — ISOLATED ONLY |
| Clean-install chain | Five baseline files plus the reviewed 28-file chain rehearsed in isolated PostgreSQL 17 | PASS — ISOLATED ONLY |
| Final QA APP-01..APP-15 | Prior accepted QA evidence exists; latest workflow on commit `a6cfc7115dd6d838427237a5fd0edced458b3acb` is still running at time of this update | PENDING CURRENT RUN |
| Build and real QA session checks | Latest workflow: build and PostgreSQL bootstrap; isolated bootstrap has passed; real QA auth/session step is running | PENDING |
| Production/QA exact catalog parity | Known environment-specific differences and provider-managed ACL exceptions are documented in the frozen parity evidence | NOT CERTIFIED AS IDENTICAL |
| Provider physical restore | Not executed; logical restore evidence exists; residual risk acceptance is recorded in the frozen manifest | RESIDUAL RISK — NOT A PHYSICAL RESTORE PASS |

### Production cutover — mandatory operator checklist

All fields below must be completed with actual evidence before the guarded runner can be enabled. Unknown details remain explicitly unassigned; do not infer or fabricate them.

1. **Release identity:** record the exact approved commit SHA, branch, all 19 SQL filenames and their frozen Git blob hashes. Any change invalidates the approval and requires a new review/rehearsal.
2. **Operator and approver:** name the person executing the cutover and the person authorizing it. The same person may not be silently inferred from repository ownership.
3. **Maintenance window:** record the agreed Europe/Rome start/end time, expected interruption, and a freeze on schema-changing work.
4. **Communications:** prepare and send the notice to affected administrators/users, with start, expected impact, completion/rollback notice and contact channel. Retain evidence of dispatch.
5. **Backup disposition:** identify the current provider backup or logical dump, timestamp, project, checksum and secure storage location. Physical restore remains untested; retain the existing named residual-risk acceptance or obtain provider-backed restore evidence. Never test restore in place on Production.
6. **Preflight:** refresh all 248 ledger pairs and capture live catalog, RLS, ownership, relation grants, routine ACLs, global/schema default ACLs and Data API exposed-schema configuration. Stop on any difference from reviewed invariants.
7. **Execution:** use only the guarded runner from the exact approved clean checkout and a direct PostgreSQL connection. Never put `DATABASE_URL` or credentials in chat, issue comments, logs or repository files. Do not use Supabase `apply_migration` for this canonical-version-preserving cutover.
8. **Postflight:** require all 19 migration postconditions, 267 ledger rows, unchanged historical 248 pairs, ACL/RLS/function/trigger checks and Production Data API exposure confirmation.
9. **Application smoke:** verify real administrator, collaborator and resident authentication, authorization, navigation, core condominium/accounting/transfer/portal flows, and email delivery. Do not use or modify real business records to create test evidence.
10. **STOP and recovery:** stop immediately on a ledger/catalog/hash mismatch, failed SQL/postcondition, unexpected lock/timeout, missing privilege, failed smoke test, or evidence of unintended data mutation. Do not improvise reverse SQL. Use the pre-approved provider recovery procedure and named escalation contacts; record incident time and last successful migration.
11. **Closure:** publish the migration ledger delta, pre/postflight outputs, smoke-test results, communication notices and final decision. A successful SQL run alone does not mean the product launch is approved.

### Approval record

- Exact commit SHA: **NOT APPROVED**
- Named execution operator: **NOT ASSIGNED**
- Named release approver: **NOT ASSIGNED**
- Europe/Rome maintenance window: **NOT SCHEDULED**
- User communication: **NOT APPROVED / NOT SENT**
- Production direct PostgreSQL connection: **NOT CONFIGURED IN THE RELEASE RUNNER**
- Production Data API exposed-schema setting: **NOT VERIFIED**
- Written approval for the exact migration hashes and operational plan: **NOT RECEIVED**

**Release rule:** the guarded runner remains disabled unless all required environment gates are explicitly supplied by the authorized operator. CI success, QA success, prior general development authorization, or this document alone does not authorize Production execution.


---

## Authoritative update — 2026-11-06, after QA acceptance and live parity refresh

### QA acceptance — PASS

The current QA acceptance evidence supersedes the pending status recorded in the prior 2026-11-06 addendum:

- Commit: `8bac18745a2b455f9897da6572ff952964310063`.
- Final QA workflow: run `42131808168`, conclusion **SUCCESS**; APP-01 through APP-13 and APP-15 passed. APP-14 remains a Production cutover/postflight gate, not a QA application test.
- Build: run `42131808194`, **SUCCESS**.
- Baseline safety: run `42131808165`, **SUCCESS**.
- APP-15 passed for administrator, collaborator and resident, including role navigation and session persistence. The test was corrected to avoid assuming the shared administrator account always has the Free plan; entitlement denials are accepted only when the application explicitly returns the plan-gate confirmation.
- APP-12 provider probe passed: Resend accepted a synthetic QA test message, the signed webhook was verified, and provider delivery metadata was persisted. This is a synthetic QA test, not a production-volume deliverability certification.
- No Production change, merge or deployment was performed.

The machine-readable evidence is `supabase/rebuild/qa-final-collaudo-20261105.json`.

### Fresh live Production / QA catalog comparison — read-only

Both linked Supabase projects were queried read-only on 2026-11-06. No SQL writes were issued.

| Control | Production | QA | Interpretation |
|---|---:|---:|---|
| Migration ledger rows | 248 | 283 | Environment-specific histories; not required to be identical |
| Ledger head | `20261104222229` | `20261105001928` | QA has subsequent QA-only entries |
| Public tables/relations | 47 tables plus one view | 47 tables plus one view | Same object count |
| Public table RLS | Enabled on all listed tables | Enabled on all listed tables | PASS for this check |
| Public table columns | One known difference | One known difference | QA has `workspace_members.data jsonb NOT NULL DEFAULT '{}'`; Production does not |
| Security Advisor | 0 security lints | 0 security lints | PASS for current Advisor checks |

Additional live catalog findings:

- QA has trigger `public.condominium_members.trg_apply_incoming_transfer_member_metadata` and function `apply_incoming_transfer_member_metadata`; Production does not. This is an intentional pre-cutover difference covered by the reviewed forward migration plan, not evidence that the environments are already identical.
- The private implementations `private.save_condominium` and `private.archive_condominium` have different definition hashes between Production and QA. Their public invoker wrappers have matching hashes. These private implementation differences remain a catalog-parity item to reconcile through the frozen cutover sequence and postflight, not by ad hoc edits.
- The public trigger functions `normalize_zero_ownership_owner` and `preserve_closing_condominium_member_history` and their checked trigger definitions matched between the two projects.
- Migration history comparison found 36 QA-only versions and one Production-only version. Do not replay QA-only versions into Production or force the ledgers to match; each must remain classified by the frozen release inventory.
- Security Advisor returned zero lints on both projects. This does not replace object-by-object ACL/default-ACL comparison.

**Parity disposition: PARTIAL / NOT CERTIFIED.** The table-column and trigger differences are identified; private implementation differences are identified; object-by-object relation/routine ACL and default-ACL parity still needs a successful, separately reviewed read-only comparison. A blocked ACL query was not retried or bypassed. No ACL was changed.

### Current release decision

**Production remains NO-GO.** QA APP-01–APP-13 and APP-15 are accepted. APP-14 remains open until exact object-level ACL/default-ACL verification, the direct PostgreSQL connection and guarded runner environment, exact release SHA/hash pinning, and the approved operator/approver/maintenance/communications/STOP plan are evidenced. The physical provider restore remains an explicitly accepted residual risk, not a passed physical restore test.

No Production DDL/DML, migration, ACL change, merge, deployment or cutover has been performed.



---

## ACL parity reconciliation — 2026-11-06 (read-only verification)

This update supersedes the preceding statement that object-level ACL/default-ACL comparison was still pending. The comparison has now completed successfully using separate read-only catalog queries against Production (`tctcgptrsmvgajqjgnev`) and QA (`jhuyhlzzydcgghrzeexn`). No grants, revokes, schema objects, or data were changed.

| ACL surface | Production | QA | Result |
|---|---:|---:|---|
| Public table/view ACL privilege rows | 508 | 508 | Exact multiset match; no differences |
| Public/private default ACL rows | 64 | 64 | Exact multiset match; no differences |
| Public routine ACL rows | Same as QA | Same as Production | Exact match; the separate public-only row count was not recorded |
| Private routine ACL rows | Included below | Included below | Expected QA-only delta |

The complete (public plus private) routine ACL comparison returned 219 rows for Production and 239 for QA. The only 20 QA-only rows are the expected grants in the frozen forward migration plan:
- 18 `EXECUTE` grants on the reviewed private application RPCs to `authenticated`.
- 2 `EXECUTE` grants on `private.check_condominium_member_transfer_closure(uuid)`: one to `authenticated` and one to `service_role`.
- No Production-only routine ACL rows were found. Public routine ACLs match exactly.

**ACL/default-ACL parity gate: PASS — expected pre-cutover private-routine delta fully classified.** This is a privilege-surface comparison only; it does not certify full schema parity or authorize cutover.

### Updated disposition

- Relation ACLs: PASS.
- Default ACLs: PASS.
- Public routine ACLs: PASS.
- Private routine ACLs: PASS against the frozen expected QA/Production delta.
- Full catalog parity: PARTIAL. QA still has `workspace_members.data jsonb NOT NULL DEFAULT '{}'` and the incoming-transfer member-metadata trigger/function absent from Production; `private.save_condominium` and `private.archive_condominium` implementation hashes also differ. These remain covered by the frozen forward-only migration plan and require Production postflight after an approved cutover.
- Production decision: **NO-GO**. No Production or QA writes, migration execution, merge, deployment, or cutover occurred.

### Current-head CI refresh

On PR #57 head `0c3429cab272f5813dcc94bf1083e2376fa851aa`, final QA run `42132219836` completed **SUCCESS**. APP-01..APP-15, authenticated browser workflows, signed webhook/provider probe, diagnostics upload, and QA preview cleanup all completed successfully. Build and baseline-safety checks on the preceding documentation commit were already SUCCESS; a new documentation commit will trigger fresh checks and must be verified before this evidence is treated as the final candidate.

*Count clarification: 219/239 are total routine-ACL row counts (public plus private), not public-only counts. The public-only comparison was exact; its separate row count was not retained in the evidence summary.*


---

## Addendum operativo — 2026-11-06

Questo addendum aggiorna le evidenze operative correnti; le sezioni storiche precedenti restano conservate come cronologia e non prevalgono sul report `docs/release/RELEASE-STATUS-20261106.md`.

### Stato verificato

- Production `tctcgptrsmvgajqjgnev`, PostgreSQL 17.6.
- Il 2026-11-06 l'operatore ha stabilito una connessione autenticata da Windows PowerShell tramite Session Pooler.
- Query read-only dell'operatore: database `postgres`, ruolo `postgres`, ledger **248** righe, head `20261104222229_reconcile_production_acl_least_privilege`.
- Il manifest congelato conserva 248 coppie versione/nome e definisce 19 migrazioni incrementali forward-only; totale atteso dopo il cutover: **267**.
- Il rischio relativo al mancato test di restore fisico provider-managed resta accettato dal proprietario nel manifest, ma il restore fisico è **NOT EXECUTED**. Il restore logico locale verificato non equivale a un test fisico.
- QA APP-01..APP-13 e APP-15: PASS; APP-14 resta parziale fino al postflight Production.

### Aggiornamento runner

Il runner supporta ora `DATABASE_URL` oppure le variabili libpq `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGSSLMODE`; `BETHAG_PSQL_BIN` consente di indicare il percorso locale di `psql.exe`. È stata aggiunta la modalità `BETHAG_CUTOVER_PREFLIGHT_ONLY=YES`: verifica manifest, hash dei 19 SQL, ledger completo 248 righe e head; termina prima di eseguire SQL o scrivere il ledger. Questa modalità non autorizza il cutover.

Percorso psql verificato sul PC dell'operatore: `C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe`. Il runner non è ancora stato eseguito da un checkout locale pulito; la sua verifica completa resta aperta.

### Gate residui

| Gate | Stato |
|---|---|
| Client PostgreSQL e login Session Pooler | PASS |
| Conteggio/head ledger manuali | PASS |
| Preflight runner: 248 coppie esatte + 19 hash SQL | PENDING |
| Pin commit finale e CI sul commit previsto | PENDING |
| Operatore e approvatore nominati | PENDING |
| Finestra di manutenzione Europe/Rome | PENDING |
| Freeze schema e comunicazione utenti | PENDING |
| Criteri STOP, recovery e contatti | PENDING |
| Approvazione formale del piano esatto | NOT APPROVED |

**Decisione: Production NO-GO.** Nessun merge, deploy o comando in modalità apply finché tutti i gate non sono documentati e il piano esatto non è approvato. Nessuna scrittura Production è stata eseguita in questo aggiornamento.


## Piano operativo candidato — ruoli esplicitati dal proprietario — 2026-11-06

Questo piano registra la decisione espressa dal proprietario nella conversazione del 2026-11-06: «tu lavori io approvo». La formulazione distingue l'assistenza tecnica dalla responsabilità umana e non attribuisce a ChatGPT poteri operativi o responsabilità legali che non possiede.

### Ruoli e separazione delle responsabilità

| Funzione | Assegnazione | Ambito |
|---|---|---|
| Preparazione tecnica | ChatGPT (assistente) | Revisione del piano, verifica degli hash e delle evidenze, predisposizione delle istruzioni, controllo dei risultati e guida passo-passo. Non è una persona fisica né un operatore autorizzato del database. |
| Operatore umano | Federico Bartolucci, proprietario del progetto | Esecuzione locale dei comandi approvati, gestione privata delle credenziali, controllo della finestra e arresto immediato in caso di STOP. |
| Approvatore | Federico Bartolucci, proprietario del progetto | Approvazione esplicita del piano esatto e decisione finale di avviare o non avviare il cutover. |

**Eccezione di controllo a doppia persona:** operatore e approvatore sono la stessa persona, su scelta esplicita del proprietario perché il progetto è gestito da lui con supporto tecnico dell'assistente. Questa scelta è registrata in modo trasparente; non viene rappresentata come approvazione indipendente o revisione a quattro occhi. Se l'organizzazione o il livello di rischio richiedono indipendenza dell'approvatore, il cutover resta NO-GO fino alla nomina di una seconda persona.

### Identità tecnica candidata — non ancora autorizzata all'esecuzione

- Repository: `federico1bartolucci-ctrl/BETHAG`.
- Branch: `fix/qa-view-acl-parity-20261105`.
- Commit applicativo con QA APP-01..APP-15, Build e Baseline Safety PASS e preflight locale read-only PASS: `4b4ea1a1448f188187441e79fcf1cc192b85a993`.
- Commit documentale successivo: `b469d781ed9136c3237ae65773abf36c9ce0fc17`. Questo commit aggiorna lo stato documentale e **non** è automaticamente il commit applicativo approvato per il cutover.
- Progetto Supabase Production: `tctcgptrsmvgajqjgnev`.
- Stato live osservato al preflight: 248 righe ledger, head `20261104222229_reconcile_production_acl_least_privilege`.
- Piano SQL congelato: 19 migrazioni incrementali, hash Git blob fissati nel file `supabase/rebuild/production-migration-cutover-freeze-20261105.json`; atteso 267 righe dopo il cutover. Le 248 righe storiche devono restare immutate; zero baseline rows, zero delete/rewrite.
- Il preflight locale sul commit applicativo `4b4ea1a...` ha restituito `READ_ONLY_PRODUCTION_PREFLIGHT_PASS`: corrispondenza esatta 248/248, verifica dei 19 payload e nessun body SQL eseguito/nessuna riga ledger scritta.

**Vincolo di pin:** prima del cutover occorre scegliere un solo commit completo e immutabile contenente sia il codice applicativo candidato sia la documentazione/runbook approvati. Se la documentazione viene aggiornata dopo il commit candidato, il commit finale deve essere nuovamente sottoposto a CI, revisione diff e preflight read-only; non si può assumere che il precedente preflight autorizzi un diverso SHA. I 19 hash SQL devono corrispondere esattamente al freeze e non possono essere modificati senza nuova revisione e nuova approvazione.

### Finestra, freeze e comunicazioni — preferenza del proprietario registrata

Il proprietario preferisce concentrare la manutenzione nel **sabato sera/notte**, per ridurre l'impatto sugli amministratori di condominio che utilizzeranno BETHAG durante la settimana e nei normali orari di lavoro.

- Giorno preferito: sabato.
- Fascia proposta per la pianificazione: **22:00–02:00 (Europe/Rome)**, a cavallo tra sabato e domenica. È una proposta tecnica da confermare, non una finestra già prenotata.
- Data esatta: **DA CONCORDARE** dopo la chiusura dei gate tecnici.
- Durata effettiva e impatto: da stimare e comunicare prima dell'intervento; non promettere una riapertura entro le 02:00 se i controlli postflight non sono conclusi.
- Freeze: dalla conferma della finestra fino alla chiusura, nessun commit applicativo, migrazione, modifica schema/ACL, modifica secrets o deploy concorrente. Nessun altro workflow o operatore deve scrivere sul database.
- Avviso utenti: predisporre e approvare un avviso con data/ora, impatto, divieto temporaneo di operazioni, canale di assistenza e messaggio di fine intervento. **Non inviato**; destinatari e canale devono essere confermati dal proprietario.
- Contatto/escalation Supabase e contatto tecnico alternativo: **DA INSERIRE**. Non inventare nominativi o recapiti.


### Backup e rischio residuo

Il proprietario ha già accettato il rischio residuo del restore fisico provider-managed non testato (accettazione registrata nel manifest il 2026-10-27). Il restore logico locale è stato verificato, ma non prova il restore fisico. Prima dell'approvazione finale l'operatore deve controllare che esista un backup recente e recuperabile secondo le opzioni disponibili, registrare timestamp/identificativo e destinazione sicura, e confermare che l'accettazione del rischio resta valida per questa specifica release. Non testare mai un restore sopra Production e non creare risorse a pagamento senza autorizzazione separata.

### Sequenza operativa vincolante

1. **Freeze e approvazione:** confermare finestra, avviso, commit finale, hash dei 19 SQL, stato backup/rischio, ruoli e checklist. Registrare l'approvazione esplicita del proprietario riferita a questi identificativi esatti.
2. **Preflight immediatamente prima:** dal checkout pulito e pinned, in modalità read-only, verificare progetto/host/ruolo, 248 coppie version/name, head, hash SQL e invarianti catalogo/ACL/Data API. Un mismatch, anche singolo, annulla l'approvazione e determina STOP.
3. **Abilitazione controllata:** solo l'operatore umano, localmente, imposta i gate di apply richiesti dal runner dopo l'approvazione. Le credenziali restano nel terminale/secret store locale e non vengono trasmesse in chat, PR, log o repository. Non usare `apply_migration`, `db push` o SQL manuale come scorciatoia.
4. **Esecuzione:** usare esclusivamente il runner version-preserving approvato, dal checkout pulito e durante la finestra. Le 19 migrazioni devono essere eseguite nell'ordine congelato; non inserire baseline, non riscrivere/cancellare lo storico e non improvvisare correzioni.
5. **Postflight:** verificare 267 righe totali, tutte le 248 coppie storiche intatte, esattamente le 19 nuove coppie attese, tutti i postcondition ACL/RLS/routine/default ACL/colonne/trigger/RPC/portal registration e la configurazione Data API. Ogni differenza non prevista è STOP.
6. **Smoke Production:** solo dopo postflight PASS, verificare autenticazione e permessi di amministratore, collaboratore e condomino, navigazione, funzioni essenziali condominio/contabilità/subentro/portale e invio/callback email con account e destinatari di test controllati. Non creare, modificare o cancellare dati commerciali reali per produrre evidenze.
7. **Chiusura:** comunicare esito, ripristinare l'accesso ordinario, togliere il freeze solo dopo conferma di stabilità e archiviare output pre/postflight, ledger delta, log smoke e avvisi.

### Criteri STOP immediato

Interrompere senza tentare riparazioni ad hoc se si verifica uno qualsiasi dei seguenti eventi:

- commit, branch, manifest o hash SQL diversi da quelli approvati;
- ledger diverso da 248 coppie esatte o head inattesa prima dell'esecuzione;
- host, project ref, ruolo o database non corrispondenti al Production approvato;
- privilegio mancante, errore di connessione, lock/timeout inatteso o errore SQL;
- migrazione che fallisce o postcondition che non torna;
- scrittura concorrente, attività non congelata o presenza di utenti che stanno eseguendo operazioni;
- differenze inattese su ACL, RLS, ownership, default privileges, funzioni, trigger, schema esposto o dati;
- smoke test non autorizzato, fallito o con effetti collaterali;
- impossibilità di verificare backup, contatti o procedura di recovery.

In caso di STOP: non rilanciare il runner alla cieca, non saltare una migrazione, non modificare manualmente il ledger e non eseguire SQL inverso improvvisato. Conservare output e ora dell'ultimo step riuscito, mantenere l'applicazione in stato protetto, avvisare il proprietario e seguire la procedura di recovery provider/DBA già verificata. Il rollback non è automaticamente garantito da una transazione unica dell'intero cutover: deve essere basato su restore/recovery testato e su decisione esplicita, mai su reverse SQL inventato.

### Stato approvazione

| Campo | Stato |
|---|---|
| Preparazione tecnica | Assistente ChatGPT — supporto, non operatore umano |
| Operatore umano | Federico Bartolucci — dichiarato dal proprietario |
| Approvatore | Federico Bartolucci — dichiarato dal proprietario |
| Operatore e approvatore distinti | NO — eccezione esplicitamente dichiarata, non controllo indipendente |
| Commit applicativo candidato | `4b4ea1a1448f188187441e79fcf1cc192b85a993` — da ripinnare se cambia il commit finale |
| 19 hash SQL | Congelati nel manifest; da riconfermare sul commit finale |
| Finestra Europe/Rome | NON SCHEDULATA |
| Freeze schema/codice | NON ATTIVATO |
| Avviso utenti | DA APPROVARE E INVIARE |
| Backup recente e rischio residuo | Rischio restore fisico già accettato; backup corrente da riconfermare prima della finestra |
| Preflight read-only | PASS sul commit applicativo `4b4ea1a...`; da ripetere sul commit finale immediatamente prima del cutover |
| Approvazione finale riferita a SHA, 19 hash e finestra | NON ANCORA RICEVUTA |
| Autorizzazione all'apply / merge / deploy | **NON CONCESSA** |

**Decisione corrente: NO-GO.** Questo documento è un piano operativo candidato, non un ordine di esecuzione. La precedente autorizzazione generale a procedere e la decisione sui ruoli non sostituiscono l'approvazione finale riferita a commit, hash, finestra e condizioni sopra. Nessun merge, deploy o comando apply è autorizzato da questo addendum.


---

## Addendum di rettifica operativa — 2026-11-06

Questo addendum prevale sui valori di finestra, commit e accettazione rischio riportati nelle sezioni storiche precedenti.

### Identità e CI del candidato
- Commit applicativo testato: `bc3c74a53eee8e7fd7c0d3ec67d6aa0074b46c02`.
- Final QA APP-01..APP-15: run [42222394817](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394817) — PASS.
- Build/PostgreSQL bootstrap: run [42222394795](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394795) — PASS.
- Baseline Safety: run [42222394790](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394790) — PASS.
- I 19 payload SQL restano congelati; nessuna migrazione è stata applicata a Production.

### Finestra
- **Inizio concordato:** sabato 7 novembre 2026, ore 22:00, `Europe/Rome`.
- **Ora di fine:** non specificata; non si presume una riapertura entro le 02:00.
- L'inizio concordato non è prenotazione, freeze attivo, avviso inviato o autorizzazione al cutover.

### Backup e rischio residuo
Il restore fisico provider-managed resta **NON VERIFICATO**. L'accettazione registrata il 27 ottobre è storica e non viene riutilizzata automaticamente per questa release. Prima di un eventuale cutover occorre verificare l'evidenza di backup corrente oppure ottenere una riconferma esplicita, locale e riferita a questa specifica esecuzione. Il restore logico locale non prova il restore fisico.

### Gate attuali
| Campo | Stato al 2026-11-06 |
|---|---|
| Operatore umano | Federico Bartolucci |
| Approvatore | Federico Bartolucci |
| Revisione indipendente a quattro occhi | NON DISPONIBILE / NON REGISTRATA |
| Revisione completa dei 61 file PR | ANCORA DA COMPLETARE E CERTIFICARE |
| Finestra di inizio | CONCORDATA: 7 novembre, ore 22:00 |
| Ora di fine | NON SPECIFICATA |
| Freeze schema/codice | NON ATTIVATO |
| Avviso amministratori | NON APPROVATO / NON INVIATO |
| Backup corrente | DA VERIFICARE |
| Rischio restore fisico | DA RICONFERMARE PER QUESTA ESECUZIONE |
| Contatti recovery/escalation | DA INSERIRE |
| Preflight Production read-only sul commit `bc3c74a...` | DA ESEGUIRE |
| Approvazione finale su SHA, 19 hash, backup/rischio, finestra e STOP | NON RICEVUTA |

Il runner Production richiede `BETHAG_EXPECTED_COMMIT_SHA` corrispondente al checkout pulito approvato; rifiuta modifiche tracked e file untracked inattesi. Il preflight e l'apply devono essere eseguiti esclusivamente dal checkout pinned, dopo chiusura dei gate e approvazione finale.

**Decisione: Production NO-GO.** Nessun merge, deploy, apply, freeze o comunicazione agli amministratori è stato eseguito o autorizzato. Se un gate resta aperto o fallisce, prevale STOP anche se la finestra concordata è iniziata.


## Addendum finale — 2026-11-06

- Commit applicativo/SQL collaudato: `ea32fc492757e5165b41580f082e42916bd54a8c`.
- Final QA APP-01..APP-15: [run 42246244137](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246244137) SUCCESS; APP-01..APP-13 e APP-15 PASS. APP-14 resta il gate Production post-cutover.
- Build/PostgreSQL 17: [run 42246243987](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246243987) SUCCESS, incluse 28 migrazioni clean-install, 19 migrazioni canoniche guarded, preflight/postflight isolati e test Portale.
- Baseline Safety: [run 42246243967](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246243967) SUCCESS.
- PR #57: 65 file, aperta e non unita. Nessuna review indipendente registrata.
- L'autorizzazione finale al cutover è **NOT RECEIVED**. Il manifest usa `FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING`; l'operatore umano locale deve essere confermato.
- La finestra del 7 novembre 2026 alle 22:00 Europe/Rome è un obiettivo, non un'autorizzazione.
- Production resta NO-GO. Nessun merge, deploy, freeze, apply, DDL o scrittura ledger è stato eseguito.
