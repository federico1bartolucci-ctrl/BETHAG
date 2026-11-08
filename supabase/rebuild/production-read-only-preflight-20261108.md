# Production read-only preflight evidence — 2026-11-08

## Scope and authorization

This record documents only the read-only Production preflight explicitly authorized for the maintenance window 2026-11-08 18:30–20:30 Europe/Rome.

- Approval scope: `READ_ONLY_PREFLIGHT_ONLY`
- Production apply authorized: `false`
- Execution approval status: `APPROVED_READ_ONLY_PREFLIGHT_ONLY`
- Expected execution commit: `92fa9423ef00223371516345c0fbe6b7e229d9ce`
- QA-tested/source commit: `5d96342209be77e189012dec754bc764999e64e2`
- Approved release fingerprint: `e1c1609462901a8afe4cf69edaade94d398a04ba54fd0c1250c45c331232dc0a`
- Production project ref: `tctcgptrsmvgajqjgnev`

## Execution result

On 2026-11-08, the local runner `node scripts/apply-reviewed-production-migrations.mjs` was executed with `BETHAG_CUTOVER_PREFLIGHT_ONLY=YES` from the expected commit. The captured output reported:

```text
QA provenance fallback: squash merge accepted only after exact allowlisted tree-delta and frozen-manifest checks.
READ-ONLY PREFLIGHT MODE: Production ledger and frozen SQL hashes only; no DDL/DML is permitted.
Checking live Production migration ledger against the complete frozen 248-row snapshot...
PASS: exact 248-row preflight. No history rows will be rewritten or deleted.
{
  "status": "READ_ONLY_PRODUCTION_PREFLIGHT_PASS",
  "target": "production",
  "production_project_ref": "tctcgptrsmvgajqjgnev",
  "preserved_historical_rows": 248,
  "canonical_incremental_rows_reviewed": 19,
  "final_ledger_count_before_cutover": 248,
  "current_head": {
    "version": "20261104222229",
    "name": "reconcile_production_acl_least_privilege"
  },
  "note": "Read-only verification complete. No SQL migration body was executed and no ledger row was written."
}
```

## Interpretation

- Result: `READ_ONLY_PRODUCTION_PREFLIGHT_PASS`.
- The exact frozen historical ledger snapshot of 248 rows matched.
- The 19 canonical incremental migration hashes were reviewed.
- Production ledger head remained `20261104222229_reconcile_production_acl_least_privilege`.
- No migration SQL body was executed.
- No ledger row was written.
- No Production DDL/DML or other Production mutation was authorized or performed by this run.

This evidence does **not** authorize or perform the Production cutover. Any future Production apply requires a separate, explicit `PRODUCTION_APPLY` approval and all applicable fresh release gates. This document-only change does not amend the approval scope or authorize Production changes.

## Related CI evidence

- GitHub Actions `BETHAG build #3544` on `main`, commit `92fa9423ef00223371516345c0fbe6b7e229d9ce`: `build` and `postgres-bootstrap` succeeded.
- GitHub Actions `BETHAG baseline safety checks #763`: `baseline-safety` succeeded on the PR #67 workflow run. This is PR-triggered evidence, not a separate direct-main run.
- The Node.js 20 deprecation and Ubuntu runner notices were non-blocking warnings/notices.

## Evidence limitations

This record reflects the console output supplied for the local runner execution and the visible GitHub Actions run summaries. It is not a claim that the Production cutover has occurred, that APP-14 post-cutover checks have passed, or that BETHAG is ready for public launch.
