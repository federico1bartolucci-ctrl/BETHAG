# Audit — Paginate supplier reconciliation during workspace sync

Date: 2026-11-23

## Finding
The background synchronization loaded the complete workspace condominium-supplier set using a single PostgREST query. Without explicit paging, large workspaces can receive a truncated result and fail to match existing condominium-specific suppliers, potentially creating duplicate suppliers during reconciliation.

## Correction
Use the shared workspace keyset paginator for the lookup, retaining the workspace predicate and selected columns. Errors from any page propagate and stop synchronization.

## Regression
The workspace pagination test checks the paginator wiring and asserts that the old one-shot query is absent.

## Verification
Regression remains wired into `npm test`. CI must pass on the exact commit before this point is certified. Local test/build execution is unavailable in this environment.

## Safety
No Production or QA data was touched. No merge, deployment, or QA reset.
