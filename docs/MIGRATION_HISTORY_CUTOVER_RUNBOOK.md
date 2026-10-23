# BETHAG — migration-history cutover runbook

Status: **prepared, not executed**  
Production project: `tctcgptrsmvgajqjgnev`  
Captured Production ledger: `supabase/rebuild/production-ledger-20261017.json`

## Verified starting point

- The refreshed read-only Production ledger contains 244 migration versions; the latest is `20261022202747` (`harden_close_member_transfer_search_path`). The first 243 entries are the historical chain through `20261007072310`; the 244th is the incremental hardening migration applied on 2026-10-22.
- The clean baseline contains five migrations, versions `20261017000001` through `20261017000005`.
- The baseline is chronologically newer than the captured Production ledger.
- `npm run verify:baseline` checks the baseline object inventory and the integrity/order of the captured ledger.
- `npm test` bootstraps the five files in isolated PGlite. PGlite skips the single `EXCLUDE USING gist` constraint because `btree_gist` is not bundled; this is not a full PostgreSQL/Supabase equivalence test.

## Cutover strategy

The baseline replaces the unrecoverable historical source-file chain for **future clean installations**. It does not mean the 243 historical Production records plus the later incremental migration are equivalent to the five baseline files. The refreshed 244-entry ledger JSON must be retained as the historical audit artifact; do not truncate it to 243 entries.

Before changing migration tracking, independently verify the baseline against the live Production catalog, including:

- all table and column definitions, defaults, nullability, generated expressions, and constraints;
- indexes, views, functions/procedures and their complete bodies;
- function ownership, SECURITY DEFINER/INVOKER, `search_path`, and EXECUTE ACLs;
- RLS enabled state, policies, triggers, grants, and default privileges;
- extension-dependent objects, including `btree_gist`.

## ACL parity limitation (explicit release blocker)

The captured access catalog `supabase/rebuild/production-access-catalog-corrected-20261017.json` records function EXECUTE ACLs, schema ACLs, and default ACLs, but not a complete object-by-object table ACL or ownership snapshot. The baseline grants migration contains no explicit column-level ACL statements. A live read-only comparison is now recorded below: it confirms function EXECUTE grant parity and object-owner counts, but still finds relation ACL and default-ACL differences. CI checks alone are not complete grants/ownership parity. Do not infer missing privileges from the SQL migration alone.

The current count-based checks are necessary but not sufficient for this semantic parity gate.

## Live Production ACL spot-check (read-only, 2026-10-22)

A read-only query against the connected Production project confirmed 48 relation-like objects in `public` (47 tables and one view), explicit relation ACL entries on all 48, 82 expanded default-ACL privilege entries (across owner, object type, grantee, and privilege), and no explicit column-level ACL entries in `public` or `private`. The effective ACL summary shows `authenticated` has broad privileges on most tables (SELECT on 48; DELETE on 43; INSERT/UPDATE on 42; MAINTAIN on 34), while `service_role` and `postgres` have all eight relation privileges on all 48 objects. This is a factual snapshot, not a parity pass: the existing baseline grants file must be compared object-by-object and privilege-by-privilege against these live ACLs before release. In particular, the generated baseline SQL includes `WITH GRANT OPTION` for postgres in many statements, while the read-only ACL expansion does not report grantable flags for the current relation ACL entries; ownership-derived capabilities must be distinguished from explicit grant options rather than normalized away.

The live check was read-only. It did not modify Production, alter migration tracking, or establish that a recoverable backup exists.

### Concrete privilege discrepancy found on 2026-10-22

A second targeted live query enumerated the 34 public relations where `authenticated` has the PostgreSQL 17 `MAINTAIN` privilege. The baseline grants migration's explicit table grants for `authenticated` specify `DELETE, INSERT, SELECT, UPDATE` (and omit `MAINTAIN`); this is a confirmed difference between the current live relation ACLs and the explicit baseline grant statements, not a reason to blindly copy privileges. The 34 affected objects are:

`communication_recipients`, `condominium_accounting_settings`, `condominium_allocation_intakes`, `condominium_allocation_rules`, `condominium_audit_log`, `condominium_budgets`, `condominium_consumption_readings`, `condominium_creation_intakes`, `condominium_expense_allocations`, `condominium_fiscal_carryover_compensations`, `condominium_fiscal_carryovers`, `condominium_fiscal_years`, `condominium_fund_availability`, `condominium_funds`, `condominium_installments`, `condominium_insurance_policies`, `condominium_ledger_entries`, `condominium_legal_cases`, `condominium_member_transfers`, `condominium_millesimal_tables`, `condominium_millesimal_values`, `condominium_payment_movements`, `condominium_register_items`, `condominium_suppliers`, `condominium_tax_obligations`, `condominium_unit_transformation_items`, `condominium_unit_transformations`, `condominium_units`, `condominium_work_documents`, `condominium_work_events`, `condominium_work_progress`, `condominium_works`, `portal_registration_requests`, `user_security_settings`.

Do not add `MAINTAIN` to the baseline just to make counts match. Establish whether the live privilege is intentional, determine the exact ACL source/ownership/default-ACL behavior, and make the baseline reproduce the approved least-privilege target. This discrepancy keeps the ACL parity gate blocked.

### Relation-grant reconciliation update (read-only Production comparison, 2026-10-22)

The baseline grant migration was updated in commit `3426b00cbd2aa8072fde9ef354621f3eef096383` to include `MAINTAIN` on all 48 table-level grants for `service_role` and all 48 table-level grants for `postgres`. The automated guard was extended in commits `df99abac73a53abd82f4207c3359c14f90c619ab` and `8148851a794a0d3926495477d0d9170093e91793` to validate these grants while excluding column-level grants from relation-level parsing.

A fresh read-only comparison against the live Production relation ACL catalog now reports 48 relations and only 34 role/privilege differences in the compared roles: all 34 are the `MAINTAIN` privilege for `authenticated` on the objects listed above. The compared `anon`, `service_role`, and `postgres` relation privilege sets now match the baseline. This comparison is limited to relation privilege sets; it does not yet establish grant-option parity, exact raw ACL provenance, column ACL parity, or default-ACL parity. Keep the release gate blocked until those remaining dimensions are verified and the least-privilege decision for the 34 `authenticated` grants is recorded.

### Remediation staged (2026-10-23; not applied)

A new migration, `supabase/migrations/20261023000001_revoke_authenticated_maintain.sql`, explicitly revokes the 34 direct `MAINTAIN` grants from `authenticated` identified above. This aligns those existing-table grants with the baseline's least-privilege policy; it does not grant privileges and has **not** been applied to Production. Before applying it, validate it against a PostgreSQL 17/Supabase staging database and re-query the live ACLs afterward. This migration does not address the four owner-specific default-ACL differences below: those remain documented separately because default privileges owned by `supabase_admin` cannot safely be assumed mutable by the application migration role.

## Additional default-ACL finding (read-only, 2026-10-22)

Review of baseline migration `20261017000005_bethag_baseline_grants.sql` found that default-privilege statements included `MAINTAIN` for application-facing roles `anon` and `authenticated`. This is separate from the 34 current relation grants: it can automatically confer the privilege on future tables. On 2026-10-22, commit `592ea0eed3c8f77d0a2e7b57a5bfb8493b0f0f79` removed `MAINTAIN` from all four default-privilege statements targeting those roles. Commit `20eefe62986cd969048aee735003cb2e4ba3f0b4` expanded `scripts/verify-authenticated-maintain-guard.mjs` to reject both explicit authenticated `MAINTAIN` grants and default `MAINTAIN` grants to `anon` or `authenticated`. GitHub Actions run [39779104661](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/39779104661) completed successfully for both build and PostgreSQL 17 bootstrap. This validates the corrected baseline in CI; it does not resolve the 34 live relation privilege discrepancies or prove complete ACL/ownership parity. A further read-only catalog query on 2026-10-22 corrected the earlier summary: Production has **82 expanded default-ACL privilege entries** across `public` (grouped by owner, object type, and grantee), not six individual privilege entries. Both live owners, `postgres` and `supabase_admin`, have table default ACLs granting `MAINTAIN` to `anon` and `authenticated`. The baseline intentionally omits `MAINTAIN` from default grants to those application roles for both owners, while retaining it for `postgres` and `service_role`. This is a four-way owner/grantee divergence, not an isolated exception; do not describe the baseline as default-ACL parity. The same read-only query found **0 relation ACL entries with grant option** and **0 explicit column ACL entries** across `public` and `private`. These zero counts narrow two parity checks, but do not establish ownership, effective privilege, schema/function ACL, or semantic security parity. Before cutover, compare every default-ACL group against the baseline, verify that no production workflow depends on inherited `MAINTAIN`, and record an approved target policy. Production remains unchanged.


### Full read-only ACL and ownership comparison (2026-10-23)

A fresh comparison was performed against the connected Production catalog and the current five-file baseline; no SQL writes or migration tracking changes were executed.

**Ownership**
- All 48 application relations in `public` (47 tables and one view) are owned by `postgres`; all 257 indexes in `public` are owned by `postgres`.
- All 171 application functions are owned by `postgres` (41 in `private`, 130 in `public`). The captured function snapshot also records `postgres` as owner for all 171.
- The `private` schema is owned by `postgres`; the `public` schema is owned by `pg_database_owner`. Those are the expected Supabase schema ownership patterns. This verifies observed Production ownership counts against the baseline's create-as-`postgres` model for application objects; the baseline does not emit explicit `ALTER ... OWNER` statements, so a clean bootstrap must run under the intended owner and be checked after creation.
- No relation or function ACL entry in the queried application scopes had grant option enabled.

**Explicit relation privileges**
- Exact object/role/privilege comparison: `postgres` 384/384 pairs match; `service_role` 384/384 pairs match.
- `authenticated` has 34 live relation privilege pairs absent from the baseline: `MAINTAIN` on the 34 relations listed in the earlier finding. There are no baseline-only relation privilege pairs for this role.
- `anon` has no explicit relation privilege pairs in the live catalog or baseline. The additional `REFERENCES`, `TRIGGER`, and `TRUNCATE` grants for `authenticated` on `condominium_fund_availability` are present in both Production and baseline; they are not extra mismatches.
- Therefore the current explicit relation ACL comparison has exactly 34 differences, all `authenticated MAINTAIN`. This remains a release blocker until the intended least-privilege target is formally selected; do not blindly grant these privileges in the baseline.

**Function EXECUTE ACLs**
- Exact live-to-baseline comparison: 218 non-`postgres` function EXECUTE grant entries match 218/218; no live-only or baseline-only entries were found. This covers 153 distinct functions with non-`postgres` ACL entries.
- The live catalog contains 171 application functions total, all owned by `postgres`; `postgres`'s owner-level EXECUTE rights are not included in the 218 explicit non-`postgres` grant comparison.

**Schema ACLs**
- The baseline's explicit schema grants for `public` and `private` are present in Production.
- Production also shows owner-derived privileges: `CREATE/USAGE` for `postgres` on `private`, and `CREATE/USAGE` for `pg_database_owner` on `public`. These are owner capabilities, not missing explicit baseline GRANT statements. The Supabase-managed `auth` and `extensions` schema ACLs are platform-owned and must not be recreated or normalized by the application baseline.

**Default privileges — exact unresolved difference**
- Production has 82 expanded default-ACL privilege entries for `public`; baseline statements do not reproduce all 82.
- Four table default-privilege pairs are intentionally absent from the current baseline: `MAINTAIN` for `anon` and `authenticated` under each of the two default-ACL owners (`postgres` and `supabase_admin`). The baseline retains the other matching default privileges, including all eight table privileges for `postgres` and `service_role` under both owners where configured.
- These omissions are a least-privilege divergence from Production, not parity. The baseline must not be called fully permission-identical until the product/security owner approves the target policy and the verifier encodes that policy explicitly. Do not copy excessive future-table privileges from Production automatically.

**Conclusion:** ownership counts and function EXECUTE grants match; explicit relation ACL parity is blocked by 34 `authenticated MAINTAIN` entries; default-ACL parity is blocked by the four table-default differences above. The current baseline is **not fully ACL/ownership-parity verified for release**. Production remains unchanged.

### ACL remediation CI verification (2026-10-23; Production unchanged)

The branch now stages a second migration, `20261023000002_revoke_default_maintain.sql`, to remove `MAINTAIN` from default table ACLs for `anon` and `authenticated` under both `postgres` and `supabase_admin`. This complements `20261023000001_revoke_authenticated_maintain.sql`, which revokes the 34 direct grants.

The PostgreSQL bootstrap test now asserts that the 34 target tables exist, that `authenticated` has no effective `MAINTAIN` on those tables after the migration chain, and that no `MAINTAIN` entries remain in `postgres`-owned default ACLs for `anon` or `authenticated`. Commit `d3ebc047c91d5f42b841f8a855aeafce57cbaf37` passed:
- [Build and real PostgreSQL 17 bootstrap](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/39865318708)
- [Baseline safety checks](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/39865318709)

A direct read-only check on the existing Supabase QA branch confirmed the connected role is `postgres`, is not a member of `supabase_admin`, and sees zero matching default `MAINTAIN` entries in that branch. An isolated test of `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ... REVOKE MAINTAIN` failed with PostgreSQL error `42501: permission denied to change default privileges`. Therefore the migration was corrected to alter only the mutable `postgres` default ACL. The four observed Production entries owned by `supabase_admin` remain unresolved and platform-managed; they are not claimed as remediated. Before release, validate the revised migration in staging and determine whether Supabase offers an authorized platform-level route for that owner-specific ACL. Neither migration has been applied to Production; no Production schema, data, or migration ledger was changed. The overall release/cutover gate remains blocked until the broader catalog parity and recovery-point requirements in this runbook are satisfied.

## Branch-to-main migration-history delta (2026-10-22)

The current branch comparison reports 100 commits ahead of `main`. The branch removes the 243 historical migration files and introduces five baseline migrations with versions later than the historical chain through `20261007072310`; the separately tracked incremental migration `20261022202747` is already present in the refreshed 244-entry Production ledger. This is an intentional history consolidation, not a normal additive migration rollout. Merging the branch alone would replace the repository's historical migration files; it would not reconcile the 244 remote ledger rows. Conversely, applying the five baseline SQL files to the populated Production database would be unsafe.

The only acceptable path is the controlled tracking cutover below, after full schema/security/ACL parity and a confirmed recovery point. The cutover planner's checks are structural guards for the proposed sequence; they do not themselves prove semantic parity or create a backup. As of this review, relation ACL parity still has 34 unresolved `authenticated MAINTAIN` differences, and the live `postgres` default ACLs intentionally differ from the least-privilege baseline for `anon`/`authenticated`. Therefore the branch is **not approved for merge or Production cutover**.

## Controlled tracking cutover

Only after the semantic parity gate and a recoverable Production backup are confirmed:

1. Keep `supabase/rebuild/production-ledger-20261017.json` unchanged as the refreshed 244-entry audit record (243 historical versions plus the 2026-10-22 incremental hardening migration).
2. Run `npm run verify:baseline`, `npm test`, and `npm run build`.
3. Review the generated plan with `node scripts/plan-migration-cutover.mjs --print-commands`.
4. Using the authorized Supabase CLI session linked explicitly to the Production project, mark the old ledger versions reverted and register the five baseline versions as applied. These commands alter migration tracking only; they must **not** execute the baseline SQL against the already populated Production schema.
5. Run `supabase migration list` and verify that local and remote versions match exactly.
6. On a separate empty PostgreSQL/Supabase environment, apply all five baseline migrations from scratch and compare its full catalog to Production. Do not merge or deploy runtime changes until this succeeds.

## Safety boundary

The planner only prints a proposed command sequence. It does not connect to Supabase and does not mutate the schema, data, or migration ledger. Do not use `db push`, reset, or baseline replay on Production as a substitute for the tracking cutover.

### Supabase-managed default ACL boundary correction (2026-10-23)

The clean baseline grant migration previously included `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` statements. Hosted validation established that the migration connection is `postgres`, is not a member of `supabase_admin`, and receives SQLSTATE `42501` when attempting to change that role's default privileges. Those 12 statements have now been removed from `20261017000005_bethag_baseline_grants.sql`; the baseline no longer attempts to mutate a Supabase-managed role's ACL. The guard script now fails if such statements are reintroduced.

This fixes the **unauthorized migration operation**; it does not magically erase the four Production catalog entries previously observed under `supabase_admin`. They are platform-owned defaults outside the connected role's authority. They remain an explicit catalog divergence until an authorized Supabase-supported operation or a documented platform policy establishes their disposition. Do not claim complete raw default-ACL parity, and do not try to gain membership in `supabase_admin` or alter its role privileges as a workaround. Production remains unchanged.

### Resolution path from official Supabase docs and community (2026-10-23)

The official Supabase role documentation identifies `supabase_admin` as an internal platform role; the hosted `postgres` role is not a superuser and cannot assume or alter that role's default privileges. Community reports #48259, #47183, and #50308 reproduce the same restriction. There is no documented, supported customer-side SQL command to change `supabase_admin`-owned default ACLs. Do not try to grant role membership, `SET ROLE supabase_admin`, edit system catalogs, or install an event-trigger workaround to override platform-owned ACLs.

**Actionable mitigation and verification**
1. Keep all customer-owned `postgres` defaults least-privileged and keep the existing-table `authenticated MAINTAIN` revocation migration staged for controlled deployment.
2. Treat `supabase_admin` default ACL entries as a separate platform-managed ACL layer, not as SQL that the BETHAG baseline can replay. This is a known platform divergence, not a successful raw ACL parity check.
3. Supabase's official Data API rollout announcement says automatic exposure of new tables is scheduled to apply to existing projects on **2026-10-30**. That change concerns Data API exposure and is not an explicit promise to remove PostgreSQL 17 `MAINTAIN`; do not assume it resolves this exact privilege without checking.
4. Re-query `pg_default_acl` after the rollout, and inspect any newly created public objects' owner and effective ACL. If the `supabase_admin`-owned `MAINTAIN` defaults persist and policy requires their removal, the supported resolution is a Supabase Support/platform-side change. The existing community thread #48259 cites support ticket `SU-429268`; BETHAG should open its own ticket with project ref, the read-only catalog query, and the error `42501`, asking whether platform automation can create customer-visible objects under this role and whether these defaults can be narrowed.
5. Do not revoke `USAGE` on `public` from `authenticated` as a workaround: that would interfere with BETHAG's normal Data API access. A schema-level revoke for `anon` is only valid if the product deliberately disallows all anonymous access; it does not solve `authenticated`'s `MAINTAIN` default and is not a fix for this finding.

PostgreSQL 17 documents `MAINTAIN` as permission to run maintenance commands including `VACUUM`, `ANALYZE`, `CLUSTER`, `REFRESH MATERIALIZED VIEW`, `REINDEX`, and `LOCK TABLE`. It is not a read/write data privilege, but it is still a real maintenance capability and should not be silently normalized as harmless. Current BETHAG application tables are owned by `postgres`; the confirmed direct `authenticated MAINTAIN` grants and `postgres`-owned defaults are separately remediable. The residual `supabase_admin`-owned defaults require the platform-side path above.

### Live ownership/default-ACL verification (read-only, 2026-10-23)

A fresh read-only catalog query against Production confirmed:
- All 48 public relations (47 tables and the fund-availability view) are owned by `postgres`.
- All 171 functions in `public` and `private` are owned by `postgres`.
- The `public` schema owner is `pg_database_owner`; the `private` schema owner is `postgres`.
- Default ACLs remain present for both `postgres` and `supabase_admin`. Both owners' table defaults grant `MAINTAIN` to `anon` and `authenticated`; this read-only check does not claim those grants are remediated. The existing incremental migration removes the `postgres`-owned default grants only. The connected role cannot alter `supabase_admin` defaults, so that platform-managed divergence remains a release blocker requiring a documented platform-level resolution or an explicitly approved exception.
- The live relation ACL query still finds 34 explicit `MAINTAIN` grants to `authenticated`. The staged revocation is not applied to Production.

The isolated PostgreSQL 17 bootstrap now also asserts relation/function ownership and schema owners in addition to object inventory and ACL checks. Passing CI establishes reproducibility on a clean database; it does not replace the live ACL/default-ACL release gate.


### Production backup/restore drill (next release-readiness step)

The detailed execution checklist and evidence template are now maintained in [`docs/PRODUCTION_BACKUP_RESTORE_DRILL.md`](PRODUCTION_BACKUP_RESTORE_DRILL.md). This is a procedure only: **no backup restore has been claimed or performed by this documentation change**. The next operational action is to obtain a real recovery point and restore it into a separately identified non-Production target, then record validation evidence. Keep `BETHAG_PRODUCTION_BACKUP_VERIFIED` unset until that drill passes. Production remains untouched.


### Supabase Support response received (2026-10-23; evidence supplied by project owner)

Supabase Support confirmed in writing that the `supabase_admin` default privileges in the `public` schema are part of the standard managed-project configuration and are not changed for individual projects; such changes could be restored during maintenance or upgrades. Support states that the customer controls the `postgres` defaults and points to the official API security guide for revoking automatic grants to `anon`, `authenticated`, and `service_role`.

Support further states that the Data API switches from `authenticator` to `anon`/`authenticated`, and does not expose direct requests for `TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN` unless a customer-exposed function provides such a path. Table grants and RLS govern the operations exposed by the API; `service_role` bypasses RLS by design and its key must remain server-side.

**Decision for BETHAG:** do not attempt a customer-side revocation of `supabase_admin` default ACLs again. Record this as a confirmed platform-managed configuration, not as a customer-remediable SQL defect. Keep `postgres` defaults least-privileged and continue checking exposed functions, table grants, and RLS. The support reply narrows the threat model for the Data API but is not a full security certification and does not prove migration/schema parity or backup recoverability.

**Release-gate disposition:** the raw catalog difference for `supabase_admin` remains observable but is not actionable through supported customer SQL according to Support. The release owner must explicitly document acceptance of this platform-managed behavior (or obtain a separate approved exception) before the migration-history cutover. Independent blockers remain: 34 direct `authenticated MAINTAIN` grants still require controlled remediation/verification; QA migration history must be reconciled against source files without blindly repairing the ledger; the 244-entry Production history cutover requires semantic catalog parity; and the backup restore drill is still NOT RUN. No Production change is authorized by this support response.
