# Audit — Paginate Accounting budget hydration

Date: 2026-11-23

## Finding
AccountingPage loaded `condominium_budgets` in a single workspace-scoped query ordered by category. PostgREST's row cap could silently omit budget records in large workspaces, leaving the UI with incomplete budget data.

## Correction
- Load budgets in pages of 1,000.
- Scope every page to the workspace.
- Use deterministic ordering by category and ID.
- Propagate page read errors through the existing Accounting hydration error guard.
- Add a static regression assertion and wire it into `npm test`.

## Verification
Source, regression script, package wiring were refetched and inspected. Runtime tests, build, and CI have not been run at this point.

## Safety
Draft stacked on PR #361. No merge, deployment, QA, reset, or Production data changes.
