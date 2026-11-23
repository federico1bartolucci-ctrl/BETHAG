# Phase 6 — Register consolidation decision (2026-11-23)

## Scope and evidence
Compared the source patches for PRs #363, #365, #372, #379, and #380, plus commit relationships for their heads.

## Decision
Use the cumulative #380 line (head `301181711c3a6d5f2074ccf943f6ed5c591ad8d7`) as the Register consolidation baseline, which already includes #379 and shared workspace pagination.

- #379 replaces the Register load calls for items, suppliers, works, documents, and funds with the shared `loadWorkspacePaginatedRows` helper; the load for work progress is still non-paginated on that commit.
- #380 changes work-progress loading to use `loadWorkspacePaginatedRows`, with workspace scope and date ordering.
- #363/#365 add separate item/supplier pagination helper modules and import those helpers in `RegisterPage.tsx`. Their implementation overlaps with #379's shared pagination path and should not be applied independently. The standalone helpers are therefore treated as superseded, not as additional fixes to cherry-pick.
- #372 paginates work-progress loading through the shared helper, but its alternative branch is not the selected cumulative line; the equivalent change is already represented in #380.

## Verification limits
Patch comparison confirms the overlap and selected integration path. This is not a local build/test result. No runtime or CI was executed during this consolidation step.

## Safety
This branch is based on #380. No merge to main, deployment, or changes to QA/Production were performed.
