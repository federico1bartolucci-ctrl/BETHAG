# BETHAG — Production forward-only migration execution matrix

**Prepared:** 2026-10-27  
**Status:** PREPARATION ONLY — NOT APPROVED FOR EXECUTION; physical-backup recoverability is an explicitly documented residual risk, not a paid-project prerequisite  
**Production project:** `tctcgptrsmvgajqjgnev`  
**Repository head reviewed:** `051200613585d46660b931ef1abadcded4a282b3`  
**Production ledger head observed:** `20261022202747_harden_close_member_transfer_search_path`

This matrix is an operator checklist, not authorization to execute. Production must remain unchanged until live ACL/ownership/default-privilege parity is verified, the final migration list is reconciled, application smoke tests pass, and the cutover is explicitly approved. The provider-managed physical-backup restore remains untested; this is a documented residual risk that must be explicitly accepted in writing by the named approver if no provider restore proof is obtained. Do not rewrite or delete any of the 244 Production ledger rows. Do not apply the five clean-bootstrap baseline migrations to existing Production.

## Release gates

| Gate | Evidence required | Current disposition |
|---|---|---|
| Provider physical backup restore | Either provider-backed restore proof, or a named release approver's written acceptance of the documented residual risk; retain backup timestamp/evidence and never claim an unperformed restore | **NOT TESTED — RESIDUAL RISK**; no paid project required. Cutover still needs explicit written risk acceptance if no restore proof is obtained |
| Restored-target integrity | Critical data counts, schema objects, function definitions, RLS, owners, explicit grants, global and schema default ACLs | **PARTIAL** — local logical-dump restore was verified; physical restore remains untested and must be explicitly accepted as a residual risk if no provider proof is obtained |
| Migration identity | Fresh Production ledger capture; preserve all 244 existing rows; identify pending migrations without replaying baseline | **PARTIAL** — head and count captured; per-migration source/effect matching remains a release task |
| Security target | Current/default MAINTAIN removed from app roles; RPC security-invoker wrapper validated with application smoke tests | **NOT MET IN PRODUCTION** — observed authenticated MAINTAIN on 33 tables, service_role on 47; default MAINTAIN for anon/authenticated/service_role; RPC remains SECURITY DEFINER |
| App acceptance | Auth, role access, condominium records, accounting, transfer close/rollback, portal workflows on isolated restored target | **PENDING** |
| Approval | Named approver signs exact commit, migration sequence, maintenance window, rollback criteria and communications | **NOT APPROVED** |

## Fresh evidence records

- Live migration ledger capture and identity comparison: `supabase/rebuild/live-migration-ledger-reconciliation-20261027.json`.
- Application smoke-test and named cutover approval record: `docs/release/APP-SMOKE-TEST-AND-CUTOVER-APPROVAL.md`.
- These records are preparation artifacts. QA's environment-specific migration versions must be reconciled by effect/source; Production's 244 historical ledger rows remain untouched. No Production migration is authorized by this matrix.

## Proposed pending-migration matrix

The order below follows the canonical migration identities after the observed Production head. Entries 1–4 touch function EXECUTE/default privileges; entry 10 is an idempotent follow-up for environments where the earlier version of entry 4 was already recorded. Validate the combined end state rather than treating each migration as an isolated final state. This is a proposed order to rehearse on the restored isolated target, not an instruction to apply directly to Production.

| Order | Canonical migration | Intended effect | Required specific verification / risk |
|---:|---|---|---|
| 1 | `20261022210629_restrict_private_function_public_execute.sql` | Revoke implicit PUBLIC EXECUTE on routines in schema `private` | Capture before/after routine ACLs. Migration 4 grants the two closure-check helpers to authenticated/service_role and retains PUBLIC EXECUTE only for two named trigger routines; migration 10 corrects QA environments where the older migration identity was already recorded. |
| 2 | `20261022210630_harden_default_privileges_and_private_execute.sql` | Revoke table defaults for anon/authenticated under `postgres`; revoke private routine PUBLIC defaults and existing private routine PUBLIC EXECUTE | Compare global and `public`-schema defaults separately. This does not revoke current-table grants. Do not change `supabase_admin` defaults. |
| 3 | `20261022213544_restrict_close_member_transfer_execute.sql` | Restrict the close-transfer RPC to authenticated/service_role rather than PUBLIC/anon | Test anonymous denial, authenticated authorized close, unauthorized workspace denial, open-accounting-position rejection, and full rollback on failure. This alone does not remove SECURITY DEFINER. |
| 4 | `20261022233440_align_public_function_execute.sql` | Revoke PUBLIC EXECUTE broadly; grant closure-check helpers to authenticated/service_role; restore only two named trigger routines to PUBLIC; tighten postgres default routine EXECUTE | The helper allowlist was corrected after this migration had already been recorded in QA. Entry 10 reapplies the helper-specific correction without replaying entry 4. Compare every public/private function ACL against the reviewed allowlist. |
| 5 | `20261023000001_revoke_authenticated_maintain.sql` | Revoke TRUNCATE/REFERENCES/TRIGGER and MAINTAIN from anon/authenticated on public tables | Ordinary CRUD must remain intact for authenticated; test RLS reads/writes for each role. RLS does not protect against TRUNCATE, so verify structural grants are absent. |
| 6 | `20261023000002_revoke_default_maintain.sql` | Remove broad anon defaults; remove authenticated structural/MAINTAIN defaults; remove service_role MAINTAIN defaults, global and schema scopes | Validate both global and schema-specific ACLs after application. PostgreSQL defaults are additive. Do not mutate platform-managed `supabase_admin` defaults. |
| 7 | `20261023000003_revoke_service_role_maintain.sql` | Revoke current MAINTAIN from service_role on the 47 explicitly named public tables; revoke its public-schema MAINTAIN default | Preflight the explicit list against the live 47 table/partition relations. Fail closed if names are missing, unexpected relations exist, or the relation set differs. Verify zero MAINTAIN grants afterward. |
| 8 | `20261023000004_application_default_table_privileges.sql` | Set explicit defaults: authenticated CRUD; service_role CRUD plus REFERENCES/TRIGGER/TRUNCATE | This grants ordinary/default privileges, not current-table grants. Check no MAINTAIN is reintroduced and ensure intended default ACLs are additive only to the reviewed roles. |
| 9 | `20261023000733_use_invoker_for_close_transfer_rpc.sql` | Make public close-transfer wrapper SECURITY INVOKER and grant authenticated/service_role access to the private implementation while revoking PUBLIC/anon | Highest application-risk step: verify private schema USAGE and function EXECUTE grants, auth/workspace checks in the private SECURITY DEFINER implementation, all transfer accounting checks, authorized success, unauthorized denial and rollback. Run full application smoke tests. |
| 10 | `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql` | Explicitly revoke PUBLIC/anon EXECUTE from the private and public transfer-closure helper functions; retain EXECUTE for authenticated/service_role; leave two intentional trigger exceptions unchanged | Added after live QA catalog queries found the two helpers still PUBLIC-executable despite the older migration identity being recorded. Recheck that only `normalize_zero_ownership_owner()` and `preserve_closing_condominium_member_history()` remain PUBLIC-executable. Rehearsed on all four non-Production environments; never replay the older broad migration. |

## Required preflight before any Production execution

1. Freeze schema-changing activity and capture the exact release commit and migration-file checksums.
2. Capture a fresh `supabase_migrations.schema_migrations` snapshot from Production and the isolated restored target. Confirm Production remains at the expected head and do not modify its historical rows.
3. On the restored target, record all relation names/types/owners; explicit ACLs; global and schema default ACLs for `postgres`, app roles, and platform-managed roles; function definitions, owners, SECURITY DEFINER/INVOKER flags and EXECUTE grants.
4. Verify the exact relation list used by migration 7 against live Production metadata. If it is not exactly the expected 47 public table/partition relations, stop and revise the migration through review before execution.
5. Inspect the effective grants for every function affected by migrations 1, 3, 4 and 9. Produce an allowlist with a justification for every PUBLIC or authenticated EXECUTE grant; no wildcard assumption.
6. Run the complete ten-migration sequence against the isolated restored target only. Save logs and run the postflight checks below.
7. Run application smoke tests on that explicitly identified isolated target, including transfer-close positive and negative paths and rollback-on-error.
8. Obtain explicit approval for the exact commit, exact migration sequence, backup evidence, outage window, rollback criteria and responsible operator. No approval means no Production DDL.

## Required postflight assertions

- Production migration ledger still contains all original 244 rows plus only the exact approved successful migration entries; no historical row is deleted, renamed, or rewritten.
- `authenticated` and `service_role` have zero effective MAINTAIN privileges on all public table/partition relations.
- `anon`, `authenticated`, and `service_role` have zero inherited/default MAINTAIN in the relevant global and public-schema ACLs; platform-managed `supabase_admin` defaults are documented, not modified.
- `authenticated` has no public-table TRUNCATE, REFERENCES, or TRIGGER unless an explicit reviewed exception is documented; ordinary CRUD and RLS workflows still pass.
- Function EXECUTE ACLs match the approved allowlist; `public.close_condominium_member_transfer(uuid)` is SECURITY INVOKER and anonymous invocation is denied.
- Authorized close succeeds; unauthorized user/workspace, open accounting balances, and injected failure are rejected without partial writes.
- Schema/data counts, constraints, indexes, policies, triggers, owners and defaults match the approved restored-target baseline except for the reviewed security changes.
- Supabase Security Advisor is re-run and every remaining finding is dispositioned.

## Stop / recovery rules

- Stop before applying any migration if restore evidence is missing, the live relation set differs from the reviewed list, ACL/function fingerprints have unexplained differences, a migration appears already applied under a different identity, or the app smoke tests fail.
- Do not roll back by deleting migration-ledger rows or replaying baseline migrations. For a failed transactional migration, capture the error and verify transaction rollback. For a successfully committed but incorrect security change, use a reviewed forward-fix migration and re-test on the isolated target first.
- Do not run an in-place Production restore as a test, mutate `supabase_admin` defaults, or create a paid restore project to clear this gate.
- This matrix does not authorize Production changes; all release gates above remain controlling.


## Decision and live-baseline addendum — 2026-10-27

The confirmed scheduled Supabase physical backup is accepted as evidence that a provider-managed backup exists. Do not create or pay for a separate restore project solely to clear this gate. No restore test is claimed; recoverability remains a documented residual risk rather than an automatic paid prerequisite. The original backup gate above is superseded on this point only. All security, migration-history, application-test and explicit-approval gates remain in force.

### Fresh read-only Production observations

- Public table/partition relations: 47.
- Effective MAINTAIN grants: anon 0, authenticated 33, service_role 47.
- public.close_condominium_member_transfer(uuid): SECURITY DEFINER; explicit EXECUTE ACL includes postgres, authenticated and service_role.
- Public-schema default ACL catalog contains MAINTAIN entries associated with postgres and supabase_admin. Do not change supabase_admin defaults. Before applying the default-privilege migration, inspect each ACL entry's grantee and scope and ensure only the intended app-role defaults are changed.
- Production migration ledger remains at head 20261022202747_harden_close_member_transfer_search_path; no migration was applied during these checks.

### Execution boundary

This matrix remains preparation-only. The ten incremental migrations must be rehearsed and checked against the current live catalog. In particular, confirm the exact 47-relation list for service_role revocation and prove that the default-ACL migration removes app-role MAINTAIN without touching platform-managed defaults. Do not infer that migration files being present means they have been applied. Production remains unchanged.


## Function-ACL review corrections — 2026-10-27

A direct comparison of the current Production function definitions/ACLs with canonical migration effects identified two least-privilege corrections in the branch (not applied to Production):

1. `20261022233440_align_public_function_execute.sql`: the closure-check helpers `private.check_condominium_member_transfer_closure(uuid)` and `public.check_condominium_member_transfer_closure(uuid)` previously restored `EXECUTE TO PUBLIC`. Their implementation requires `auth.uid()` and validates workspace authorization, so anonymous execution is not a supported application path. The migration now grants these helper functions to `authenticated, service_role` instead. The two trigger functions remain as the explicitly named exceptions and are not changed in this correction.
2. `20261023000733_use_invoker_for_close_transfer_rpc.sql`: the public close-transfer wrapper already retains `EXECUTE` for `service_role`, but the migration previously granted the private schema and implementation function only to `authenticated`. The migration now grants private-schema `USAGE` and implementation `EXECUTE` to both `authenticated` and `service_role`, preserving ACL consistency when the public wrapper becomes `SECURITY INVOKER`. This is a privilege-path correction, not proof that a service-role call with no user JWT should pass the function's `auth.uid()` authorization guard; test both authenticated-user and backend invocation semantics before release.

The exact live relation inventory matches the 47-table list in `20261023000003_revoke_service_role_maintain.sql`: read-only comparison returned no missing expected relations and no extra live table/partition relations. Six Production tables currently lack one or more ordinary CRUD privileges for `authenticated` (audit/carryover/payment tables and `profiles`); this is an existing intentional-looking ACL asymmetry that must not be blindly overwritten by migration 4, which changes defaults for future objects only. Confirm those table-level grants against RLS policies and app call paths before changing any current-table grants.

These corrections were committed on the working branch only. Production was not modified. Re-run migration inventory, SQL syntax/bootstrap checks and the application/function smoke tests against isolated QA after these commits; do not consider the branch release-ready based only on static review.


### QA migration-ledger reconciliation — 2026-10-27

A fresh read of the three existing QA ledgers shows that the migration identities are not interchangeable and must not be treated as proof that the nine canonical files have run uniformly:

- `gcorwfvnslnehcxmtixn` (member-transfer QA) records generated versions `20261027012112` through `20261027012123` for the recent ACL sequence; its close-transfer restriction is recorded as `20261022213542`, while the canonical repository file is `20261022213544_restrict_close_member_transfer_execute.sql`.
- `srkucrdcoswlozifvztr` (continuity QA) records a mix of older versions, a duplicate canonicalization entry (`20261027012022_restrict_close_member_transfer_execute_canonical`), and an extra `20261027012138_revoke_remaining_service_role_maintain_legal_cases` entry.
- `mxhciszzpqzvsaqcnwhg` (migration-reconciliation QA) records older versions for authenticated/default MAINTAIN and an older execution order, plus QA-only test migration entries.

These differences are evidence of ledger divergence, not permission to rewrite history or mark files applied by guess. Before Production cutover, generate an explicit mapping of each QA ledger row to the exact canonical file and verified catalog effect; classify duplicate/QA-only entries separately; then rehearse the canonical forward-only sequence on an isolated target. Production remains unchanged, and no QA ledger rows should be deleted or rewritten as part of this documentation update.


### CI and QA catalog checkpoint — 2026-10-27

- GitHub Actions run **40479743704** on commit **6df025a4e4414e136faecbaad86c9122e1137c46** completed successfully. Both jobs passed: `postgres-bootstrap` (real PostgreSQL 17 baseline/bootstrap) and `build`, including migration-history reconciliation, Production function-security/ACL checks, PostgreSQL bootstrap test and application build.
- The successful CI result validates the repository's fresh-bootstrap target, not the already-existing QA databases nor Production.
- Read-only catalog snapshots from all three QA projects agree on 47 public table/partition relations, zero current MAINTAIN grants for `authenticated`, and zero for `service_role`.
- However, all three QA projects still report four routines with effective `PUBLIC EXECUTE`: the two closure-check helpers plus the two named trigger functions. The updated canonical migration expects only the two trigger functions to remain PUBLIC-executable. Therefore the helper-function ACL correction is **not yet demonstrated on existing QA catalogs**; it must be rehearsed on an isolated target using the exact canonical migration and followed by a function ACL/application smoke-test. Do not treat passing CI as evidence that this live-QA difference is resolved.
- Production's nine canonical incremental migration identities remain pending after the captured Production head. The QA ledgers are historically divergent; no ledger rows have been rewritten, no migrations were marked applied by guess, and Production has not been changed.



## Superseding live effect reconciliation — 2026-10-27

The detailed effect-by-effect review is now maintained in [PRODUCTION-MIGRATION-EFFECT-RECONCILIATION-20261027.md](PRODUCTION-MIGRATION-EFFECT-RECONCILIATION-20261027.md), with machine-readable observations at `supabase/rebuild/production-migration-effect-observations-20261027.json`. That record supersedes the original ten-step matrix where it differs.

The live comparison discovered a further defect: although `20261023000733_use_invoker_for_close_transfer_rpc.sql` grants `service_role` access in its current source, the live catalog shows that role lacks private-schema `USAGE` and private implementation `EXECUTE` in Production; the private function EXECUTE is also absent in all queried QA environments. The migration is already recorded in some QA ledgers, so it must not be edited/replayed to fix history. A new idempotent forward migration was added: `20261027110000_repair_service_role_transfer_invoker_path.sql`.

The release candidate now has **eleven incremental migrations** after Production head `20261022202747`. Candidate order is ascending version: the original ten entries in the table above, followed by `20261027110000_repair_service_role_transfer_invoker_path.sql`. Expected Production ledger count after all eleven are approved and applied is 255 (244 historical rows preserved + 11 new rows). Do not insert baseline rows, delete or rename historical ledger rows, or apply anything to Production yet.

New fail-closed SQL controls:
- Preflight: `supabase/rebuild/production-cutover-preflight-20261027.sql` — asserts the captured relation set, ledger head/count, current privilege baseline and function allowlist; read-only.
- Postflight: `supabase/rebuild/production-cutover-postflight-20261027.sql` — asserts least-privilege table/default ACLs, function invocation path, exact new ledger entries and expected ledger count; read-only.

These controls have been authored but have **not** been run against Production as a rehearsal. First run them against the isolated restore/QA rehearsal target with target-specific expected ledger values adjusted under review; then run the Production preflight only immediately before a separately approved window. Production remains unchanged. The physical-backup restore risk remains documented and requires named written acceptance if provider proof is not obtained.
