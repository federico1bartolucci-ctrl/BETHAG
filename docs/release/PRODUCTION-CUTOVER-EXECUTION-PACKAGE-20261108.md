# BETHAG — Production cutover execution package

**Updated:** 2026-11-08  
**Status:** OWNER APPLY APPROVAL RECORDED — FRESH LOCAL GATES REQUIRED  
**Production project:** `tctcgptrsmvgajqjgnev`  
**Execution model:** guarded, sequential, forward-only; no automatic rollback.

## 1. Verified starting point

The following evidence is available as of 2026-11-08:

- Production project status: `ACTIVE_HEALTHY`; PostgreSQL 17.
- Guarded local read-only runner passed on execution commit `35f78a773f8517a36b052d5a4ba55905130193b6`.
- The live migration ledger matched the frozen snapshot exactly: **248/248** historical version/name pairs; expected head `20261104222229_reconcile_production_acl_least_privilege`.
- Exactly **19** canonical incremental SQL files and their frozen Git blob hashes were checked; all are pending, not applied.
- Production Data API Dashboard evidence supplied by the owner on 2026-11-08: `public` and `graphql_public` exposed; `private` not exposed; 0/48 tables and 0/171 functions exposed; automatic exposure of new tables disabled; Extra search path `public, extensions`. `supabase_functions` is not among the available/exposed schema choices shown.
- Scheduled physical backups visible daily from 2026-11-01 through 2026-11-08; latest visible point: 2026-11-08 03:05:03 UTC. Storage objects are excluded from database backups.
- Provider-managed physical restore remains **NOT TESTED**. The project owner previously accepted this residual risk; this is not evidence of a successful physical restore.
- QA evidence in the frozen release record reports APP-01..APP-13 and APP-15 PASS. APP-14 remains post-cutover. Provider delivery evidence is limited to the synthetic test recipient and is not a mass-deliverability certification.
- Internal review was accepted by the project owner because an independent reviewer was unavailable. This is not a four-eyes review.

No Production migration, DDL, DML, ledger write, merge or deployment has been performed by these checks.

## 2. Exact migration scope

Apply only the 19 ordered canonical increments enumerated in `supabase/rebuild/production-migration-cutover-freeze-20261105.json`, with their exact frozen Git blob hashes.

Expected ledger transition:

- Before: 248 rows, historical head `20261104222229`.
- After: 267 rows total.
- Preserve every one of the original 248 version/name pairs exactly.
- Add the exact 19 canonical version/name pairs; expected sorted maximum version: `20261105050000`.
- Never apply baseline migrations to this populated Production database.
- Never use Supabase MCP `apply_migration`, SQL Editor, manual SQL, or a historical runner as a substitute for the guarded runner.

## 3. Preconditions — all must be true immediately before apply

1. Clean checkout of the exact execution commit approved in the manifest; `git status --porcelain` empty (except explicitly permitted untracked dependencies, if any).
2. Final QA, Build/PostgreSQL 17 and Baseline Safety all SUCCESS on the exact QA source SHA recorded in the manifest, with the runner's permitted provenance relationship.
3. Exact release fingerprint recalculated from the checkout and equal to the owner's final approved fingerprint.
4. Guarded read-only preflight re-run locally on that exact execution SHA and returning `READ_ONLY_PRODUCTION_PREFLIGHT_PASS`.
5. Production host, project ref, database and DB role verified by the runner; credentials remain local and are never pasted into chat, GitHub, screenshots or logs.
6. Immediately re-check the latest scheduled backup in Dashboard and record its timestamp/status. Do not claim physical restore verification.
7. Immediately re-check Data API settings: only `public` and `graphql_public` exposed; `private` not exposed; `supabase_functions` not exposed; automatic new-table exposure OFF; no overriding PostgREST configuration that exposes provider-managed schemas.
8. Operator is physically present, has working database access, and can keep BETHAG in maintenance/unavailable state during the entire apply and postflight.
9. User communication/maintenance notice is prepared and sent by the owner/operator before writes; do not claim that this has been done until it actually has.
10. Owner has separately approved in writing the exact execution SHA, exact fingerprint, Production project, ordered 19 SQL hashes, operator, maintenance window, forward-only recovery model and residual physical-restore risk.
11. Operator has explicitly set the runner's required local approval variables only after all above gates pass.

**Current disposition:** items 1–4 were evidenced on commit `35f78a773f8517a36b052d5a4ba55905130193b6`; creating this document produces a new documentation commit, so the final execution SHA and its read-only preflight must be refreshed. The owner recorded explicit Production APPLY approval on 2026-11-08 for the exact frozen nineteen-migration scope, Production project `tctcgptrsmvgajqjgnev`, QA source `5d96342209be77e189012dec754bc764999e64e2`, release fingerprint `e1c1609462901a8afe4cf69edaade94d398a04ba54fd0c1250c45c331232dc0a`, and execution checkout `c396c09a73d6e2f7463045b428629f5b32828281`. Approval metadata is recorded in the freeze manifest. This is not permission to bypass any runner gate. The current backup and Data API checks must be repeated immediately before apply.

## 4. Execution procedure

1. Freeze application/schema changes and stop all other workflows or operators that could write to Production.
2. Confirm maintenance notice and keep users out of BETHAG for the operation.
3. On the exact approved clean checkout, verify the required environment variables locally. Do not display environment variables containing secrets.
4. First run the guarded runner in read-only mode and capture its full sanitized output. If it does not return `READ_ONLY_PRODUCTION_PREFLIGHT_PASS`, STOP.
5. Only after the separate final owner approval is recorded and all runner gates are satisfied, the operator may switch from preflight to apply mode and run `node scripts/apply-reviewed-production-migrations.mjs` once.
6. The runner applies migrations sequentially, each migration and its canonical ledger insertion in a single transaction. After each migration it checks ledger count, historical preservation and exact canonical prefix.
7. If the runner exits for any reason, STOP. Do not restart from the beginning or retry an uncertain migration until the live ledger and catalog have been inspected read-only and a new forward-only decision is approved.

## 5. Immediate STOP criteria

Stop on any mismatch or uncertainty, including:

- wrong commit, dirty checkout, wrong Supabase project/host/database/user, unexpected ledger count/head or any version/name mismatch;
- missing or changed SQL hash, sequence not exactly 19, release fingerprint mismatch, CI not green, or missing written final approval;
- backup unavailable/current state unclear, Data API exposure drift, missing operator, maintenance/communications not ready;
- SQL error, timeout, deadlock, lock contention, privilege error, connection loss, unexpected data/catalog change, or any runner postcondition failure;
- any migration is already present unexpectedly, or a commit outcome is uncertain.

On STOP: do not continue to the next migration, do not rerun the runner blindly, do not manually insert/delete ledger rows, and do not issue ad hoc corrective SQL. Keep the service unavailable/under maintenance. Record the last migration with a certain committed outcome and the first uncertain migration. Reconnect read-only, inspect ledger/catalog, preserve logs and escalate for a separately reviewed forward-only recovery plan.

## 6. Postflight — read-only SQL

After the guarded runner reports `CANONICAL_MIGRATION_LEDGER_PASS`, execute the reviewed read-only SQL file:

`supabase/rebuild/production-cutover-postflight-20261105.sql`

It must finish without exception. It verifies the 267-row ledger, 19 exact canonical identities, privilege and default-ACL targets, no unexpected PUBLIC EXECUTE, SECURITY INVOKER transfer wrapper, private helper grants, collaborator boolean permission checks, workspace member data column, archive lifecycle preservation, portal-registration RLS/helper behavior, trigger function permissions and the documented provider-managed `supabase_admin` exception.

Also independently verify that the original 248 historical version/name pairs remain identical to the frozen snapshot. The guarded runner performs this check; preserve its output.

## 7. Authenticated Production smoke tests and reopening

Only after SQL postflight passes, perform non-destructive authenticated smoke tests with existing approved test identities:

- Administrator: sign-in, workspace/condominium listing, read-only navigation and expected admin access.
- Collaborator: sign-in and role/module boundary checks, including a denied action where permission is false or absent.
- Resident: sign-in and portal access limited to the resident's own condominium/unit and permitted documents/communications.
- Confirm no cross-workspace or foreign-resident access.
- Do not create, edit, delete or transfer real condominium/business records as part of smoke tests. If a write-path test is essential, use a pre-approved synthetic fixture with a documented cleanup and explicit authorization.

Reopen BETHAG only when all smoke tests pass, ledger is exactly 267 rows, historical rows are unchanged, all 19 canonical rows are present, and postflight has passed. APP-14 can then be closed with evidence. If any smoke test fails, keep the service unavailable and diagnose without altering real user data.

## 8. Recovery model and known limitations

- This is a **forward-only** cutover. There is no generic automatic rollback for the 19 DDL migrations.
- Each migration is transactional with its ledger insertion, but a lost connection can make the client-side outcome uncertain; always inspect read-only before deciding whether to resume.
- A completed migration followed by failed postcondition requires a separately reviewed forward correction, not an improvised rollback.
- Provider-managed physical restore has not been tested. The owner's acceptance of that residual risk does not remove it.
- Supabase database backups do not include Storage object bytes. Storage files and other external dependencies require separate recovery arrangements.
- The review was internal, not independent. This limitation remains disclosed.

## 9. Approval record — owner approval recorded; operational attestations remain

The following must be completed only after the final execution commit and fingerprint are fixed:

- Owner approval of exact execution SHA:
- Owner approval of exact release fingerprint:
- Production project reference:
- Ordered 19 SQL hash list: frozen manifest (must match exactly).
- Operator:
- Approved maintenance window:
- Maintenance notice sent by:
- Residual physical-restore risk explicitly reconfirmed:
- Approval timestamp (UTC):
- Approval evidence reference:

**Owner approval: RECORDED for PRODUCTION_APPLY** in the freeze manifest on 2026-11-08. The approved scope is exactly the ordered nineteen SQL hashes, with sequential transactional ledger writes and forward-only recovery. The owner reconfirmed the residual physical-restore risk. This does not attest that the local runner gates, current backup/Data API checks, maintenance notice, or direct database connection are satisfied.

## 10. Traceability reconciliation — 2026-11-08

This section supersedes any ambiguous execution-SHA wording in the earlier preparation notes. It does not expand authorization.

### Commit chain established from Git history

- `ef06aa675e8e56961e11351010d6fa740978e85d` is the execution commit named by the read-only approval metadata recorded in the manifest version present on `92fa9423ef00223371516345c0fbe6b7e229d9ce`.
- `92fa9423ef00223371516345c0fbe6b7e229d9ce` is one commit after `ef06aa6`; the only changed path is `supabase/rebuild/production-migration-cutover-freeze-20261105.json`. That manifest update records the new read-only approval metadata and fingerprint `e1c1609462901a8afe4cf69edaade94d398a04ba54fd0c1250c45c331232dc0a`.
- `25a3362be02dcf5ffddf8e2ff02a7a6719ddd7aa` is one commit after `92fa942`; the only changed path is this read-only preflight evidence document.

### What the recorded runner output proves

The operator-supplied console output records a successful read-only runner invocation with expected checkout SHA `92fa9423ef00223371516345c0fbe6b7e229d9ce`, QA source SHA `5d96342209be77e189012dec754bc764999e64e2`, and fingerprint `e1c1609462901a8afe4cf69edaade94d398a04ba54fd0c1250c45c331232dc0a`. It reports an exact 248-row ledger match and review of 19 frozen SQL hashes, with no migration SQL executed and no ledger row written.

### Explicit limitation — approval SHA versus executed SHA

The manifest's `approved_execution_commit_sha` is `ef06aa675e8e56961e11351010d6fa740978e85d`, while the recorded runner invocation used `92fa9423ef00223371516345c0fbe6b7e229d9ce` as its expected checkout SHA. Git history confirms that the latter contains only the manifest approval-metadata update relative to the former; the SQL migration payload and executable runner were not changed in that one-commit step.

Nevertheless, the recorded approval names `ef06aa6` as the approved execution SHA, not `92fa942`. Therefore this evidence supports the read-only ledger/hash result, but it does not establish a perfect literal match between the approved execution SHA field and the runner's expected checkout SHA. Do not describe the run as an exact-SHA approval match.

The earlier statement in section 3 that the preflight was evidenced on `35f78a773f8517a36b052d5a4ba55905130193b6` is historical/stale for the 2026-11-08 run and must not be used as its execution SHA.

### Disposition

- Read-only preflight result: `PASS` as recorded in the operator-supplied output.
- Exact approval-to-runner execution-SHA correspondence: `NOT FULLY ESTABLISHED`.
- Production apply authorization: `RECORDED` in manifest at commit `54498bf100f10ae5f3eb015c6739b6dc52e2db29`, covering execution checkout `c396c09a73d6e2f7463045b428629f5b32828281` and the frozen fingerprint/hash list.
- Production DDL/DML or ledger writes: `NOT PERFORMED` by the recorded preflight.
- Remaining before apply: synchronize the approval-record commit locally; run the guarded read-only preflight on the exact current checkout; repeat the live backup and Data API checks; confirm the maintenance notice and direct PostgreSQL connection; satisfy all local runner gates. Do not apply if any gate fails.

