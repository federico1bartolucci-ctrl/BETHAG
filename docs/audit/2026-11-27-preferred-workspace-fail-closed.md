# Preferred workspace resolution must fail closed — 2026-11-27

## Finding

When an explicit workspace was supplied, `getActiveWorkspaceId` queried its active membership. If no row matched, the old implementation fell through to a query for the first active workspace. A stale or inaccessible selection could therefore redirect a condominium save into another workspace.

## Correction

- Treat any explicitly supplied preferred workspace as authoritative.
- Trim and validate the identifier.
- Return null when its exact active membership is absent or mismatched; do not run the fallback query.
- Preserve first-active-workspace behavior only when no preference is supplied.

## Regression

The runtime test reproduces the old fallback and verifies exact-match success, missing/mismatched/blank/unsupported preference failure, and unchanged no-preference behavior. It also checks the save path uses the resolved workspace.

## Safety

Application helper, regression test, package test wiring and this audit note only. No database writes, migrations, QA/Production access, Supabase deployment, reset, workflow dispatch or paid service activation.
