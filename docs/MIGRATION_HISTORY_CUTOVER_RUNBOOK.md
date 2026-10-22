# BETHAG — migration-history cutover runbook

Status: **prepared, not executed**  
Production project: `tctcgptrsmvgajqjgnev`  
Captured Production ledger: `supabase/rebuild/production-ledger-20261017.json`

## Verified starting point

- Production records 243 migration versions; latest is `20261007072310`.
- The clean baseline contains five migrations, versions `20261017000001` through `20261017000005`.
- The baseline is chronologically newer than the captured Production ledger.
- `npm run verify:baseline` checks the baseline object inventory and the integrity/order of the captured ledger.
- `npm test` bootstraps the five files in isolated PGlite. PGlite skips the single `EXCLUDE USING gist` constraint because `btree_gist` is not bundled; this is not a full PostgreSQL/Supabase equivalence test.

## Cutover strategy

The baseline replaces the unrecoverable historical source-file chain for **future clean installations**. It does not mean the old 243 Production records are equivalent to the five baseline files. The captured ledger JSON must be retained as the historical audit artifact.

Before changing migration tracking, independently verify the baseline against the live Production catalog, including:

- all table and column definitions, defaults, nullability, generated expressions, and constraints;
- indexes, views, functions/procedures and their complete bodies;
- function ownership, SECURITY DEFINER/INVOKER, `search_path`, and EXECUTE ACLs;
- RLS enabled state, policies, triggers, grants, and default privileges;
- extension-dependent objects, including `btree_gist`.

## ACL parity limitation (explicit release blocker)

The captured access catalog `supabase/rebuild/production-access-catalog-corrected-20261017.json` currently records function EXECUTE ACLs, schema ACLs, and default ACLs only. It does **not** contain a complete snapshot of table-level or column-level ACLs, object ownership, or grant-option chains. The baseline grants migration includes table and column grants, but the existing automated parity check compares only the captured function EXECUTE grants. Therefore, passing CI must not be interpreted as complete grants/ownership parity. Before migration-history cutover or release, capture those ACL/ownership catalogs from the intended source and add semantic comparisons against the baseline, including grant options and default privileges. Do not infer missing privileges from the SQL migration alone.

The current count-based checks are necessary but not sufficient for this semantic parity gate.

## Live Production ACL spot-check (read-only, 2026-10-22)

A read-only query against the connected Production project confirmed 48 relation-like objects in `public` (47 tables and one view), explicit relation ACL entries on all 48, six default ACL records, and no explicit column-level ACL entries in `public` or `private`. The effective ACL summary shows `authenticated` has broad privileges on most tables (SELECT on 48; DELETE on 43; INSERT/UPDATE on 42; MAINTAIN on 34), while `service_role` and `postgres` have all eight relation privileges on all 48 objects. This is a factual snapshot, not a parity pass: the existing baseline grants file must be compared object-by-object and privilege-by-privilege against these live ACLs before release. In particular, the generated baseline SQL includes `WITH GRANT OPTION` for postgres in many statements, while the read-only ACL expansion does not report grantable flags for the current relation ACL entries; ownership-derived capabilities must be distinguished from explicit grant options rather than normalized away.

The live check was read-only. It did not modify Production, alter migration tracking, or establish that a recoverable backup exists.

### Concrete privilege discrepancy found on 2026-10-22

A second targeted live query enumerated the 34 public relations where `authenticated` has the PostgreSQL 17 `MAINTAIN` privilege. The baseline grants migration's explicit table grants for `authenticated` specify `DELETE, INSERT, SELECT, UPDATE` (and omit `MAINTAIN`); this is a confirmed difference between the current live relation ACLs and the explicit baseline grant statements, not a reason to blindly copy privileges. The 34 affected objects are:

`communication_recipients`, `condominium_accounting_settings`, `condominium_allocation_intakes`, `condominium_allocation_rules`, `condominium_audit_log`, `condominium_budgets`, `condominium_consumption_readings`, `condominium_creation_intakes`, `condominium_expense_allocations`, `condominium_fiscal_carryover_compensations`, `condominium_fiscal_carryovers`, `condominium_fiscal_years`, `condominium_fund_availability`, `condominium_funds`, `condominium_installments`, `condominium_insurance_policies`, `condominium_ledger_entries`, `condominium_legal_cases`, `condominium_member_transfers`, `condominium_millesimal_tables`, `condominium_millesimal_values`, `condominium_payment_movements`, `condominium_register_items`, `condominium_suppliers`, `condominium_tax_obligations`, `condominium_unit_transformation_items`, `condominium_unit_transformations`, `condominium_units`, `condominium_work_documents`, `condominium_work_events`, `condominium_work_progress`, `condominium_works`, `portal_registration_requests`, `user_security_settings`.

Do not add `MAINTAIN` to the baseline just to make counts match. Establish whether the live privilege is intentional, determine the exact ACL source/ownership/default-ACL behavior, and make the baseline reproduce the approved least-privilege target. This discrepancy keeps the ACL parity gate blocked.

### Relation-grant reconciliation update (read-only Production comparison, 2026-10-22)

The baseline grant migration was updated in commit `3426b00cbd2aa8072fde9ef354621f3eef096383` to include `MAINTAIN` on all 48 table-level grants for `service_role` and all 48 table-level grants for `postgres`. The automated guard was extended in commits `df99abac73a53abd82f4207c3359c14f90c619ab` and `8148851a794a0d3926495477d0d9170093e91793` to validate these grants while excluding column-level grants from relation-level parsing.

A fresh read-only comparison against the live Production relation ACL catalog now reports 48 relations and only 34 role/privilege differences in the compared roles: all 34 are the `MAINTAIN` privilege for `authenticated` on the objects listed above. The compared `anon`, `service_role`, and `postgres` relation privilege sets now match the baseline. This comparison is limited to relation privilege sets; it does not yet establish grant-option parity, exact raw ACL provenance, column ACL parity, or default-ACL parity. Keep the release gate blocked until those remaining dimensions are verified and the least-privilege decision for the 34 `authenticated` grants is recorded.

## Additional default-ACL finding (read-only, 2026-10-22)

Review of baseline migration `20261017000005_bethag_baseline_grants.sql` found that default-privilege statements included `MAINTAIN` for application-facing roles `anon` and `authenticated`. This is separate from the 34 current relation grants: it can automatically confer the privilege on future tables. On 2026-10-22, commit `592ea0eed3c8f77d0a2e7b57a5bfb8493b0f0f79` removed `MAINTAIN` from all four default-privilege statements targeting those roles. Commit `20eefe62986cd969048aee735003cb2e4ba3f0b4` expanded `scripts/verify-authenticated-maintain-guard.mjs` to reject both explicit authenticated `MAINTAIN` grants and default `MAINTAIN` grants to `anon` or `authenticated`. GitHub Actions run [39779104661](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/39779104661) completed successfully for both build and PostgreSQL 17 bootstrap. This validates the corrected baseline in CI; it does not resolve the 34 live relation privilege discrepancies or prove complete ACL/ownership parity. A further read-only catalog query on 2026-10-22 corrected the earlier summary: Production has **82 expanded default-ACL privilege entries** across `public` (grouped by owner, object type, and grantee), not six individual privilege entries. The live `postgres` table defaults grant `MAINTAIN` to `anon` and `authenticated`; importantly, `supabase_admin` table defaults also include `MAINTAIN` for both roles. The baseline intentionally omits `MAINTAIN` from default grants to `anon` and `authenticated`, so this is a broader default-ACL divergence than previously recorded and must not be described as limited to the `postgres` owner. The same read-only query found **0 relation ACL entries with grant option** and **0 explicit column ACL entries** across `public` and `private`. These zero counts narrow two parity checks, but do not establish ownership, effective privilege, schema/function ACL, or semantic security parity. Before cutover, compare every default-ACL group against the baseline, verify that no production workflow depends on inherited `MAINTAIN`, and record an approved target policy. Production remains unchanged.

## Branch-to-main migration-history delta (2026-10-22)

The current branch comparison reports 100 commits ahead of `main`. The branch removes the 243 historical migration files and introduces five baseline migrations with versions later than the recorded Production head (`20261007072310`). This is an intentional history consolidation, not a normal additive migration rollout. Merging the branch alone would replace the repository's historical migration files; it would not reconcile the 243 remote ledger rows. Conversely, applying the five baseline SQL files to the populated Production database would be unsafe.

The only acceptable path is the controlled tracking cutover below, after full schema/security/ACL parity and a confirmed recovery point. The cutover planner's checks are structural guards for the proposed sequence; they do not themselves prove semantic parity or create a backup. As of this review, relation ACL parity still has 34 unresolved `authenticated MAINTAIN` differences, and the live `postgres` default ACLs intentionally differ from the least-privilege baseline for `anon`/`authenticated`. Therefore the branch is **not approved for merge or Production cutover**.

## Controlled tracking cutover

Only after the semantic parity gate and a recoverable Production backup are confirmed:

1. Keep `supabase/rebuild/production-ledger-20261017.json` unchanged as the record of the former 243-version history.
2. Run `npm run verify:baseline`, `npm test`, and `npm run build`.
3. Review the generated plan with `node scripts/plan-migration-cutover.mjs --print-commands`.
4. Using the authorized Supabase CLI session linked explicitly to the Production project, mark the old ledger versions reverted and register the five baseline versions as applied. These commands alter migration tracking only; they must **not** execute the baseline SQL against the already populated Production schema.
5. Run `supabase migration list` and verify that local and remote versions match exactly.
6. On a separate empty PostgreSQL/Supabase environment, apply all five baseline migrations from scratch and compare its full catalog to Production. Do not merge or deploy runtime changes until this succeeds.

## Safety boundary

The planner only prints a proposed command sequence. It does not connect to Supabase and does not mutate the schema, data, or migration ledger. Do not use `db push`, reset, or baseline replay on Production as a substitute for the tracking cutover.
