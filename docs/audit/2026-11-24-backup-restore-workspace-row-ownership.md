# Audit — backup restore must not overwrite records from another workspace

**Date:** 2026-11-24

## Reproducible defect

The restore accepted editable JSON and normalized backend rows with the current `workspace_id`, then used `upsert(..., { onConflict: "id" })`.

The baseline RLS policies for workspace-owned records use `can_manage_workspace_module(workspace_id, ...)` in both `USING` and `WITH CHECK`. An active administrator in two workspaces satisfies both checks. A crafted backup for workspace A containing the ID of a record in workspace B could therefore update the B row and move it into A.

The affected paths were the special `condominiums` branch, generic workspace-owned tables, and the `condominium_members` branch.

## Correction

- Preflight existing IDs through the paginated ID-filter loader.
- Update existing workspace rows only with explicit `id` and `workspace_id` filters; treat zero affected rows as a conflict.
- Insert new rows with `INSERT`, never `UPSERT`. If RLS hides a foreign row, a primary-key conflict fails without changing it.
- Apply the same rule to `condominiums`.
- For `condominium_members`, update only with both `id` and the preflighted `condominium_id`; insert new rows only.
- Deduplicate repeated IDs and report skipped records.

## Regression

`scripts/test-backup-restore-workspace-row-ownership.mjs` reproduces the old cross-workspace move under PostgreSQL RLS, verifies visible foreign IDs are skipped, verifies hidden foreign IDs can only cause a duplicate-key error through INSERT, and verifies a row moved after preflight is not updated. The test checks the actual restore wiring and is included in `npm test`, which the build workflow executes.

The existing condominium-member and backup-security restore regressions now require conditional updates and insert-only creation.

## Verification and safety

This is a Draft PR stacked on backup-restore security hardening (#402). Exact-head CI is required before closure. PostgreSQL regression fixtures run only in isolated CI. No QA or Production data is modified; no merge, deploy, reset, or manual workflow dispatch is performed.
