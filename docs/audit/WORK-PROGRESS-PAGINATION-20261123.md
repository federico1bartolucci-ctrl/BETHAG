# Audit — Paginate work-progress reconciliation

Date: 2026-11-23

## Finding
The background workspace synchronization read condominium work progress with a single filtered PostgREST query using `.in("work_id", workIds)`. The query has no explicit paging, so workspaces with more than the configured API row limit of work-progress rows could have the cumulative actual amounts calculated from an incomplete result.

## Correction
- Load work-progress rows through the workspace keyset pagination helper.
- Keep the workspace predicate server-side.
- Filter to the selected work IDs after all workspace pages are loaded.
- Preserve the existing aggregation behavior (sum non-negative amounts per work).

## Regression
The workspace pagination regression now checks that reconciliation is wired to the paginated loader and the previous one-shot query is absent.

## Verification
The code and regression are committed on an isolated branch and are wired into `npm test`. No local repository checkout is available to execute the suite here; exact-SHA CI must pass before this finding is considered closed.

## Safety
No Production or QA data was touched. No merge, deployment, QA reset, or manually dispatched workflow was performed.
