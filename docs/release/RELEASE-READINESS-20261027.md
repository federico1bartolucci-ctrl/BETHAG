# BETHAG release readiness — live verification snapshot

**Captured:** 2026-10-27  
**Status:** NOT APPROVED FOR PRODUCTION CUTOVER  
**Scope:** Read-only Production checks, QA ledger review, repository CI evidence, and release-gate reconciliation.  
**Production writes:** None. No migration was applied to Production.

## Current live migration ledger reconciliation — 2026-10-27

A fresh read-only capture is stored in `supabase/rebuild/live-migration-ledger-reconciliation-20261027.json`. Production still has 244 historical ledger entries and head `20261022202747_harden_close_member_transfer_search_path`; the twelve canonical incremental migrations (including `20261028100000_fix_collaborator_module_permission_boolean.sql`) remain absent from its ledger. No Production migration row was edited and no migration was applied.

The four non-Production ledgers currently have 16 entries in develop, 18 in continuity QA, 16 in member-transfer QA, and 18 in migration-reconciliation QA. Their helper-ACL correction is recorded under environment-specific versions (`20261027093101`, `20261027093117`, `20261027093126`, `20261027093119`) rather than the canonical repository version `20261027100000`. Continuity/member-transfer/reconciliation QA also have several earlier security migrations under environment-specific version IDs. This is recorded as a **source/effect reconciliation task**, not permission to rewrite ledger history or to mark Production migrations applied without verifying their effects.

## 1. Current live privilege and function-security state

Read-only queries against Production `tctcgptrsmvgajqjgnev` returned:

| Check | Production result | Release meaning |
|---|---:|---|
| Public table/partition relations | 47 | Relation inventory used for the current grant checks |
| RLS enabled | 47/47 | Necessary, but not a substitute for least-privilege grants |
| Relations where `authenticated` has effective `MAINTAIN` | 33/47 | **Must be remediated and rechecked before release** |
| Relations where `service_role` has effective `MAINTAIN` | 47/47 | **Must be remediated and rechecked before release** |
| Relations where `anon` has effective `MAINTAIN` | 0/47 | No current-table MAINTAIN observed for anon |
| Owner of the 47 relations | `postgres` | Owner inventory matches the previously recorded Production snapshot |
| `public.close_condominium_member_transfer(uuid)` | `SECURITY DEFINER` | Production has not yet adopted the reviewed `SECURITY INVOKER` wrapper |

The default-ACL query also confirmed that Production's `postgres`-owned `public` table defaults include `MAINTAIN` for `anon`, `authenticated`, and `service_role`. Those application-role defaults must be removed by a reviewed forward migration.

The query separately found `supabase_admin`-owned defaults in several Supabase-managed schemas, including `public`. **Do not attempt to change `supabase_admin` defaults with the application migration role.** QA's effective application-owned `public` defaults are hardened, but provider-managed defaults still appear in catalog queries under their actual owner. Any owner/default-ACL parity report must compare owner and schema scope, not simply count all `MAINTAIN` ACL entries together.

The effective current-table CRUD counts were also compared. Production and the three full-schema QA environments (continuity, member-transfer, migration-reconciliation) match for `authenticated`: SELECT 47/47, INSERT 41/47, UPDATE 41/47, DELETE 42/47. Those three QA environments have zero `MAINTAIN` for `authenticated` and `service_role`. Recovered develop is different: `authenticated` has INSERT/UPDATE/DELETE on all 47 relations. Treat develop's broader current-table CRUD as a known divergence; do not use it alone as evidence of Production ACL parity and do not blindly overwrite Production's existing CRUD grants.

## 2. Live migration ledgers

Fresh `list_migrations` reads returned these counts and heads:

| Environment | Project ref | Ledger entries | Latest identity |
|---|---|---:|---|
| Production | `tctcgptrsmvgajqjgnev` | 244 | `20261022202747_harden_close_member_transfer_search_path` |
| Develop (recovered) | `wvokvcfglduxmjxlnfeh` | 16 | `20261027093101_revoke_public_execute_from_transfer_closure_helpers` |
| Continuity QA | `srkucrdcoswlozifvztr` | 18 | `20261027093117_revoke_public_execute_from_transfer_closure_helpers` |
| Member-transfer QA | `gcorwfvnslnehcxmtixn` | 16 | `20261027093126_revoke_public_execute_from_transfer_closure_helpers` |
| Migration-reconciliation QA | `mxhciszzpqzvsaqcnwhg` | 18 | `20261027093119_revoke_public_execute_from_transfer_closure_helpers` |

The recovered develop environment has the five canonical baseline migrations, the existing Production head, nine original incremental migrations, and the new transfer-helper EXECUTE correction. It has 47 public table/partition relations, RLS enabled on all 47, no effective table `MAINTAIN` for `authenticated` or `service_role`, and the close-transfer wrapper is `SECURITY INVOKER`.

The QA ledgers are not identical. They contain alternate timestamps/names, QA-specific privilege cleanup, and two QA-only test rows. Preserve every recorded row as truthful execution history. Do not delete, rename, normalize, or mark ledger rows applied merely to make the ledgers look alike. A matching name is not proof that two SQL files have the same effects.

Production's 244-row ledger remains historical evidence. The repository's earlier source inventory found 19 exact version/name matches, 88 same-name/different-version cases, and 137 Production rows with no matching version or name in the `main` migration inventory. Those classifications are inventory hints, not a semantic equivalence sign-off. The remaining Production work is a row-by-row source/effect classification and an approved forward-only plan. Never replay the five clean-bootstrap baseline migrations on existing Production.

## 3. Canonical incremental migration sequence for isolated rehearsal

These twelve migrations are not recorded in Production after its current head. They are a proposed sequence to rehearse and validate, **not authorization to apply them**:

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

Before any Production execution, rehearse the exact ordered set against an isolated target and prove: exact relation-list preconditions; no unintended current-table CRUD grants removed; no `MAINTAIN` reintroduced by defaults; only reviewed function EXECUTE exceptions remain; the close-transfer implementation preserves user/workspace authorization; and the migration ledger is changed only by the approved forward sequence.

## 4. Application validation and CI evidence

- Latest GitHub Actions run [40632527406](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40632527406) for commit `72beb595421fc9e8c7f02f194f67ae6f295717b5` completed successfully: both `build` and `postgres-bootstrap` passed. It verifies repository and isolated PostgreSQL checks, not the full APP-01–APP-15 browser acceptance.
- The CI build ran migration-history reconciliation, security parity checks, clean-bootstrap tests, and the application build. The PostgreSQL 17 job applied the baseline plus the complete twelve-migration incremental sequence in an isolated database and verified that `authenticated`/`service_role` have no `MAINTAIN`, authenticated has no structural table privileges, the intended current-table CRUD grants remain unchanged, the close RPC is `SECURITY INVOKER`, and only the two intended trigger functions remain PUBLIC-executable.
- Database-level transfer closure tests also passed: anonymous and unauthorized workspace callers are rejected without mutation; an authorized workspace admin closes the transfer; the outgoing owner is archived; the incoming owner remains active; an unpaid installment blocks closure; test fixtures roll back.
- These are database/CI tests, not browser-level end-to-end acceptance against an isolated restored Production copy. No dedicated Playwright/Vitest end-to-end suite covering the full UI paths was found. Sign-in UI, role navigation, resident portal visibility, and accounting UI workflows still need isolated application smoke tests.

Required isolated smoke-test matrix:
- Sign-in and workspace membership for administrator, collaborator, resident, and council roles where supported.
- Cross-workspace and unauthorized-role denial.
- Condominium/unit/member CRUD under RLS.
- Resident portal registration/access and portal-post visibility.
- Accounting: create/update/read permissions, closed-period protections, installment/payment allocation integrity.
- Subentro: authorized close succeeds; unauthorized close fails; open accounting positions reject closure; successful closure archives the outgoing member and retains incoming co-owners; failure rolls back every partial change.
- Post-migration Security Advisor and function EXECUTE allowlist. Live ACL queries after the new migration confirm that the two transfer-closure helpers are not PUBLIC-executable in all four QA/development environments; only the two intended trigger functions remain PUBLIC-executable.
- Regression check for storage/document access, noting database backups do not themselves back up Storage object contents.

## 5. Physical-backup risk disposition

The Supabase Dashboard evidence confirms that scheduled backups exist. The physical backup has **not** been restored in isolation. The local logical-dump restore is supplemental evidence only. The paid `Restore to a New Project` route was declined; do not create a paid project solely to satisfy this item, and never test restore in place on Production.

Treat this as a documented residual risk. Before cutover, either:
- attach provider-supported isolated physical-restore evidence; or
- record the named release approver's explicit written acceptance of the untested physical-restore risk, with UTC timestamp and evidence reference.

A fresh pre-cutover backup/dump, integrity checks, recovery-point expectations, and a reviewed rollback procedure remain required independently of that risk decision.

## 6. Approval record — intentionally incomplete

No approval is recorded by this document. The release approver must complete and sign off:

- Approver name/role:
- Exact repository commit:
- Exact ten-migration sequence (or approved revised sequence):
- Evidence reference for ACL/owner/default-privilege parity:
- Evidence reference for isolated application smoke tests:
- Physical-restore disposition: provider proof / residual risk accepted:
- Maintenance window and expected user impact:
- Stop/rollback thresholds and recovery-point expectation:
- Responsible operator and communication plan:
- Approval timestamp (UTC):

**Decision until completed:** NO-GO. Production remains unchanged.


### QA helper ACL remediation — 2026-10-27

The earlier function ACL migration identity had already been recorded in QA before the source SQL was corrected. A new idempotent migration, `20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql`, was added and applied to all four non-Production environments. Live read-only checks confirmed the public and private closure-check helpers now have `PUBLIC EXECUTE = false` and `authenticated/service_role EXECUTE = true`. The two intentional trigger exceptions remain PUBLIC-executable. Current QA ledger counts and heads are shown above; the original historical ledger rows were preserved. Production has not received this migration.


## Live migration effect comparison — 2026-10-27

The source-hash-backed effect comparison is documented in `docs/release/PRODUCTION-MIGRATION-EFFECT-RECONCILIATION-20261027.md` and `supabase/rebuild/production-migration-effect-observations-20261027.json`. A material mismatch was found: the public close-transfer wrapper has EXECUTE for `service_role`, but the private schema/function path does not. QA also lacks EXECUTE for `service_role` on the private implementation, even where migration `20261023000733` is present in the ledger. A new forward-only correction `20261027110000_repair_service_role_transfer_invoker_path.sql` has been added rather than editing or replaying an already-recorded migration.

The candidate release sequence now contains twelve incremental migrations after Production head `20261022202747`. Read-only fail-closed preflight/postflight SQL is available at `supabase/rebuild/production-cutover-preflight-20261027.sql` and `supabase/rebuild/production-cutover-postflight-20261027.sql`. Neither has been run as a Production release action; Production remains unchanged. All application smoke tests, ledger-diff verification, and named cutover approval remain outstanding.


The new service-role invocation-path migration was applied and post-checked on all four non-Production environments. Supabase recorded environment-specific versions: develop `20261027101109`, continuity QA `20261027101123`, member-transfer QA `20261027101130`, and migration-reconciliation QA `20261027100507`. Permission assertions passed in all four (service_role schema USAGE/function EXECUTE; authenticated retained; anon denied; wrapper SECURITY INVOKER). This is not an application transfer test and does not change Production. The complete role-based smoke-test suite remains pending.
