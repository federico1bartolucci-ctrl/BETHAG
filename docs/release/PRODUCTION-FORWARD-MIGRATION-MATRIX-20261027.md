# BETHAG — Production forward-only migration execution matrix

**Prepared:** 2026-10-27  
**Status:** PREPARATION ONLY — NOT APPROVED FOR EXECUTION  
**Production project:** `tctcgptrsmvgajqjgnev`  
**Repository head reviewed:** `051200613585d46660b931ef1abadcded4a282b3`  
**Production ledger head observed:** `20261022202747_harden_close_member_transfer_search_path`

This matrix is an operator checklist, not authorization to execute. Production must remain unchanged until the provider-managed physical-backup restore is verified, the restored target passes parity checks, the final migration list is reviewed, and the cutover is explicitly approved. Do not rewrite or delete any of the 244 Production ledger rows. Do not apply the five clean-bootstrap baseline migrations to existing Production.

## Release gates

| Gate | Evidence required | Current disposition |
|---|---|---|
| Provider physical backup restore | Selected Supabase scheduled backup restored to an isolated target; record source ref, backup timestamp/id, target ref, completion result | **BLOCKED** — local dump restore is supplemental only; provider restore not proven |
| Restored-target integrity | Critical data counts, schema objects, function definitions, RLS, owners, explicit grants, global and schema default ACLs | **BLOCKED** — complete provider-restored target evidence absent |
| Migration identity | Fresh Production ledger capture; preserve all 244 existing rows; identify pending migrations without replaying baseline | **PARTIAL** — head and count captured; per-migration source/effect matching remains a release task |
| Security target | Current/default MAINTAIN removed from app roles; RPC security-invoker wrapper validated with application smoke tests | **NOT MET IN PRODUCTION** — observed authenticated MAINTAIN on 33 tables, service_role on 47; default MAINTAIN for anon/authenticated/service_role; RPC remains SECURITY DEFINER |
| App acceptance | Auth, role access, condominium records, accounting, transfer close/rollback, portal workflows on isolated restored target | **PENDING** |
| Approval | Named approver signs exact commit, migration sequence, maintenance window, rollback criteria and communications | **NOT APPROVED** |

## Proposed pending-migration matrix

The order below follows the canonical migration identities after the observed Production head. The first four entries touch function EXECUTE/default privileges; validate their combined end state rather than treating each migration as an isolated final state. This is a proposed order to rehearse on the restored isolated target, not an instruction to apply directly to Production.

| Order | Canonical migration | Intended effect | Required specific verification / risk |
|---:|---|---|---|
| 1 | `20261022210629_restrict_private_function_public_execute.sql` | Revoke implicit PUBLIC EXECUTE on routines in schema `private` | Capture before/after routine ACLs. Later migration 4 deliberately grants PUBLIC EXECUTE to four named helper/trigger routines; confirm those exact exceptions are intentional and remain the only required exceptions. |
| 2 | `20261022210630_harden_default_privileges_and_private_execute.sql` | Revoke table defaults for anon/authenticated under `postgres`; revoke private routine PUBLIC defaults and existing private routine PUBLIC EXECUTE | Compare global and `public`-schema defaults separately. This does not revoke current-table grants. Do not change `supabase_admin` defaults. |
| 3 | `20261022213544_restrict_close_member_transfer_execute.sql` | Restrict the close-transfer RPC to authenticated/service_role rather than PUBLIC/anon | Test anonymous denial, authenticated authorized close, unauthorized workspace denial, open-accounting-position rejection, and full rollback on failure. This alone does not remove SECURITY DEFINER. |
| 4 | `20261022233440_align_public_function_execute.sql` | Revoke PUBLIC EXECUTE broadly, then restore four named helper/trigger routines; tighten postgres default routine EXECUTE | Explicitly reconcile with order 1: the named grants are exceptions. Compare every public/private function ACL against a reviewed allowlist and test application calls. Do not assume “revoke all” is the final state. |
| 5 | `20261023000001_revoke_authenticated_maintain.sql` | Revoke TRUNCATE/REFERENCES/TRIGGER and MAINTAIN from anon/authenticated on public tables | Ordinary CRUD must remain intact for authenticated; test RLS reads/writes for each role. RLS does not protect against TRUNCATE, so verify structural grants are absent. |
| 6 | `20261023000002_revoke_default_maintain.sql` | Remove broad anon defaults; remove authenticated structural/MAINTAIN defaults; remove service_role MAINTAIN defaults, global and schema scopes | Validate both global and schema-specific ACLs after application. PostgreSQL defaults are additive. Do not mutate platform-managed `supabase_admin` defaults. |
| 7 | `20261023000003_revoke_service_role_maintain.sql` | Revoke current MAINTAIN from service_role on the 47 explicitly named public tables; revoke its public-schema MAINTAIN default | Preflight the explicit list against the live 47 table/partition relations. Fail closed if names are missing, unexpected relations exist, or the relation set differs. Verify zero MAINTAIN grants afterward. |
| 8 | `20261023000004_application_default_table_privileges.sql` | Set explicit defaults: authenticated CRUD; service_role CRUD plus REFERENCES/TRIGGER/TRUNCATE | This grants ordinary/default privileges, not current-table grants. Check no MAINTAIN is reintroduced and ensure intended default ACLs are additive only to the reviewed roles. |
| 9 | `20261023000733_use_invoker_for_close_transfer_rpc.sql` | Make public close-transfer wrapper SECURITY INVOKER and grant authenticated access to private implementation while revoking PUBLIC/anon | Highest application-risk step: verify private schema USAGE and function EXECUTE grants, auth/workspace checks in the private SECURITY DEFINER implementation, all transfer accounting checks, authorized success, unauthorized denial and rollback. Run full application smoke tests. |

## Required preflight before any Production execution

1. Freeze schema-changing activity and capture the exact release commit and migration-file checksums.
2. Capture a fresh `supabase_migrations.schema_migrations` snapshot from Production and the isolated restored target. Confirm Production remains at the expected head and do not modify its historical rows.
3. On the restored target, record all relation names/types/owners; explicit ACLs; global and schema default ACLs for `postgres`, app roles, and platform-managed roles; function definitions, owners, SECURITY DEFINER/INVOKER flags and EXECUTE grants.
4. Verify the exact relation list used by migration 7 against live Production metadata. If it is not exactly the expected 47 public table/partition relations, stop and revise the migration through review before execution.
5. Inspect the effective grants for every function affected by migrations 1, 3, 4 and 9. Produce an allowlist with a justification for every PUBLIC or authenticated EXECUTE grant; no wildcard assumption.
6. Run the complete nine-migration sequence against the isolated restored target only. Save logs and run the postflight checks below.
7. Run application smoke tests on that isolated target, including transfer-close positive and negative paths and rollback-on-error.
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
