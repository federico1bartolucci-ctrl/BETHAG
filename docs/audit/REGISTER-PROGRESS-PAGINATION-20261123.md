# Register Work Progress Pagination — 2026-11-23

## Finding
The Register page fetched `condominium_work_progress` in one workspace-scoped query. Large work histories could be truncated at the API row limit, leaving incomplete SAL/progress data in Register.

## Correction
- Reuse the keyset workspace pagination helper from PR #328.
- Keep workspace scope for every page.
- Order by `progress_date` with deterministic ID tie-break.
- Propagate pagination errors and avoid accepting partial history.

## Regression
Static integration guard checks the loader, workspace pagination helper, error propagation, and state wiring. The shared pagination runtime test covers paging behavior and edge cases.

## Verification
Source, regression, package wiring and documentation re-fetched and statically inspected. Runtime/CI confirmation pending.

## Dependency
Draft stacked on PR #328.

## Safety
No merge, deployment, QA/Production changes or resets.
