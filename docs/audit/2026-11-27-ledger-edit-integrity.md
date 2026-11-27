# Ledger edit integrity audit — 27 November 2026

## Finding

The Accounting ledger edit handler writes `condominium_id: dbCondominiumId` but scopes its UPDATE only by ledger ID and workspace. The form state is not cleared by the condominium-change effect. If a ledger edit for condominium A remains open while the selected condominium changes to B, the stale row can match by ID/workspace and be reassigned to B.

This is distinct from PR #309's zero-row response guard and PR #303's allocation-total guard. The clean replacement branch consolidates all three protections so the ledger edit path has one coherent implementation.

## Correction

- Reject an edit whose source ledger row does not belong to the currently selected condominium.
- Add `condominium_id = dbCondominiumId` to the UPDATE predicate as defense in depth.
- Require a returned updated row and fail closed on zero-row responses.
- Preserve the existing allocation guard: an allocated expense cannot be changed to income or reduced below the sum of its allocations.
- Keep INSERT behavior separate.

## Runtime regressions

- `test-ledger-edit-allocation-guard.mjs`
- `test-ledger-update-zero-row-guard.mjs`
- `test-ledger-edit-condominium-scope.mjs`

All three are wired into `npm test`.

## Supersession

This clean-main proposal consolidates the independent changes from open Draft PRs #303 and #309 and adds the missing condominium-scope guard. Those older stacked proposals should be closed as superseded only after exact-head CI on this branch passes.

## Safety

No SQL migration. No QA or Production access/writes. No merge, deploy, reset, or manual workflow dispatch.
