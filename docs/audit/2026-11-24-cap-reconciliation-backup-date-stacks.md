# CAP reconciliation audit — backup/restore and local-date stacks

**Date:** 2026-11-24  
**Review base:** `cap-consolidation-20261123` at `2261de7bcd5d81cbf79d506e77747bda318f89f1`  
**Working branch:** `audit/cap-reconciliation-plan-20261124` (branched from the review base)

## Verified state

- CAP is 13 commits ahead of `main` at the inspected base; this review does not authorize a merge.
- Backup/restore PRs #148, #181, #293, #400, #402, #403 and #405 form a stacked dependency chain. #148/#181/#293 each have a successful Build run on their exact recorded head SHA. #400/#402/#403/#405 are also stacked in order; their prior exact-head CI evidence is recorded separately and must be rechecked after any rebase/replay.
- Local-date PRs #353 -> #404 -> #406 form a separate stack. Exact-head Build CI was previously recorded as successful for those heads.
- Comparing CAP with #405 and #406 returns `diverged`, not a fast-forward relationship. Do not merge either branch directly into CAP.

## Concrete overlap and integration risks

### Backup/restore stack

The stack evolves the same implementation surfaces already changed by CAP and by earlier backup PRs:

- `src/main.tsx`: backup export/restore implementation. #148 adds paginated export; #181 surfaces export-time read errors; #293 restricts restored localStorage keys; #400 fixes `condominium_members` scoping via `condominium_id`; #402 blocks replay of authorization/portal grant records; #403 replaces ID-only upserts with workspace-ownership checks and conditional update/insert; #405 adds accounting continuity tables and their ordering.
- `src/lib/paginatedWorkspaceRows.ts`: #400 extends the pagination helper with parent-relation filtering and member-workspace filtering.
- `src/lib/backupSecurityRestore.mjs`: #402 introduces restore security helpers; #403 adds `prepareWorkspaceRowsForBackupRestore` and changes the member restore preparation to enforce row ownership.
- `package.json`: every stack layer appends its regression script to `npm test`; the final integrated script list must retain all tests without duplication or omission.
- #405's `workspaceBackupTables.mjs` adds five tables: `condominium_accounting_settings`, `condominium_fiscal_carryovers`, `condominium_fiscal_carryover_compensations`, `condominium_member_transfers`, and `condominium_millesimal_values`. Its own documentation explicitly limits the scope and does not claim other omitted workflow/audit tables are covered.

**Security-critical integration gate:** #403's conditional update/insert behavior must be retained for all workspace-owned records and condominium members. Reintroducing ID-only `upsert(... onConflict: "id")` would re-open cross-workspace overwrite risk for an administrator belonging to multiple workspaces. Authorization tables must remain excluded from replay. Member rows must remain scoped through successfully restored condominiums and must not be assigned a nonexistent `workspace_id`.

### Local-date stack

- #406 changes `src/RegisterPage.tsx` and `src/AccountingPage.tsx` and adds `src/lib/local-date.ts`.
- CAP already changes `src/RegisterPage.tsx`; therefore this is a real overlapping-file integration, not a clean independent cherry-pick.
- The helper derives YYYY-MM-DD from local calendar fields and advances days with `Date.setDate`, rather than slicing UTC ISO timestamps. Preserve the tested local-calendar behavior in Register and Accounting date defaults/deadlines.
- #406's `package.json` test wiring must be combined with the backup and CAP regression commands.

## Safe integration order

1. Reconcile the backup stack in dependency order: #148 -> #181 -> #293 -> #400 -> #402 -> #403 -> #405. Review each parent diff and preserve all CAP changes in `src/main.tsx`; do not retarget or merge stacked PRs directly onto CAP without rebuilding the resulting tree.
2. Run the full test suite and build on the resulting isolated integration head. Re-run the backup security and ownership regression scripts, not only static wiring checks.
3. Reconcile local-date stack #353 -> #404 -> #406 against the integrated RegisterPage result; include AccountingPage and the helper. Re-run date tests under `TZ=Europe/Rome` and the full suite/build.
4. Run the required isolated CI and browser/QA checks on the exact final integration SHA. Any change after QA invalidates that exact-head evidence.
5. Only after those checks, update the CAP/release evidence and recalculate the release fingerprint. Do not change frozen SQL hashes or reuse a prior release approval.

## Explicit non-actions

No PR was merged or retargeted. No Production or QA database was accessed or modified. No migration, deploy, reset, manual QA dispatch, or release approval was performed. Production remains NO-GO; APP-14 remains a post-cutover Production gate.
