# Register Fiscal-Year Lookup Pagination — 2026-11-23

## Finding
The SAL payment flow fetched condominium fiscal years using a single query, risking omission when the workspace dataset exceeds API limits.

## Correction
Use the shared workspace pagination loader, scoped by condominium, ordered by start date descending, preserving the existing open-year/date selection and fail-closed query error behavior.

## Regression
Added a source guard and wired it into npm test.

## Verification
Static file re-fetch only; runtime/build/CI pending. No QA or Production changes.
