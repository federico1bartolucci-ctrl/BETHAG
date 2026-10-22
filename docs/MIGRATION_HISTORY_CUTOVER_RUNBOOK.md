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
