# BETHAG release readiness — live verification snapshot

**Captured:** 2026-10-27  
**Status:** NOT APPROVED FOR PRODUCTION CUTOVER  
**Scope:** Read-only Production checks, QA ledger review, repository CI evidence, and release-gate reconciliation.  
**Production writes:** None. No migration was applied to Production.

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

These ten migrations are not recorded in Production after its current head. They are a proposed sequence to rehearse and validate, **not authorization to apply them**:

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

Before any Production execution, rehearse the exact ordered set against an isolated target and prove: exact relation-list preconditions; no unintended current-table CRUD grants removed; no `MAINTAIN` reintroduced by defaults; only reviewed function EXECUTE exceptions remain; the close-transfer implementation preserves user/workspace authorization; and the migration ledger is changed only by the approved forward sequence.

## 4. Application validation and CI evidence

- GitHub Actions run [40474026685](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/40474026685) for commit `051200613585d46660b931ef1abadcded4a282b3` completed successfully.
- The recorded checks include application build and PostgreSQL 17 clean-bootstrap / migration validation.
- These checks are repository/clean-bootstrap evidence. They do **not** prove end-to-end sign-in, role-specific authorization, resident portal behavior, accounting workflows, subentro closure, open-accounting rejection, rollback atomicity, or browser-level application acceptance against an isolated restored Production copy.
- Repository search did not find a dedicated Playwright/Vitest end-to-end suite covering those acceptance paths. Do not report these smoke tests as passed until test logs and outputs are attached.

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
