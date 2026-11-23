# Audit — Paginate Accounting allocation-intake hydration

Date: 2026-11-23

## Finding
AccountingPage loaded `condominium_allocation_intakes` in one workspace-scoped query, ordered only by `created_at`. PostgREST's default cap could omit older/newer intake records from state; equal timestamps also had no deterministic tie-breaker. In addition, `allocationIntakesResult` was missing from the list of query results checked for errors, so a failed read could silently be applied as an empty list.

## Correction
- Load the intake collection in 1,000-row pages.
- Preserve descending `created_at` ordering and add `id` ascending as deterministic tie-breaker.
- Propagate page read errors.
- Include `allocationIntakesResult` in the hydration error guard.
- Add a regression assertion and wire it into `npm test`.

## Verification
Changed source, test and package wiring were fetched back from the branch and inspected. Runtime test/build/CI have not been executed here.

## Safety
Draft PR stacked on PR #320. No merge, deploy, QA or Production data changes.
