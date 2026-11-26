# Workspace backup pagination and incomplete-source restore guard

Date: 2026-11-26

## Scope
Reconstructs workspace-backup pagination and incomplete-source restore protections on the current main baseline without carrying forward unrelated historical branch changes.

## Changes
- Export workspace backup tables using deterministic 1,000-row pagination, ordered by stable key. `workspace_members` uses `user_id`, not a nonexistent `id`.
- Propagate page-read errors so a failed later page is recorded in `backendReadErrors`, never silently treated as a complete export.
- On restore, surface source export errors in the first confirmation and prevent a complete-success message when the source backup omitted tables.
- Legacy backups without `backendReadErrors` remain compatible.

## Validation
Exact-head CI required: npm test, build/browser smoke, PostgreSQL 17 bootstrap and baseline safety. Authenticated QA is not certified by this PR.

## Safety
No QA/Production database changes, deploy, restore, reset, or manual workflow dispatch.
